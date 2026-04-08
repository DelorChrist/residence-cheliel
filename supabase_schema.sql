-- ============================================================
-- TABLE: reservations
-- ============================================================
create table if not exists reservations (
  id             text primary key,
  client_name    text not null,
  phone          text not null,
  email          text,
  room_id        text not null,
  stay_type      text not null default 'nuitée'
                   check (stay_type in ('nuitée', 'journée')),
  check_in       date not null,
  check_out      date not null,
  remarks        text,
  payment_method text not null
                   check (payment_method in ('Orange Money', 'Wave')),
  status         text not null default 'En attente'
                   check (status in ('En attente', 'Confirmé', 'Annulé')),
  created_at     timestamptz not null default now(),
  constraint check_dates check (check_out > check_in)
);

-- Index
create index if not exists idx_reservations_phone      on reservations (phone);
create index if not exists idx_reservations_status     on reservations (status);
create index if not exists idx_reservations_created_at on reservations (created_at desc);
create unique index if not exists idx_reservations_room_checkin_active
  on reservations (room_id, check_in)
  where status <> 'Annulé';

-- RLS
alter table reservations enable row level security;

-- Policies (drop avant recréation pour éviter les conflits)
drop policy if exists "Lecture publique"      on reservations;
drop policy if exists "Insertion publique"    on reservations;
drop policy if exists "Mise à jour publique"  on reservations;
drop policy if exists "Suppression publique"  on reservations;
drop policy if exists "Mise à jour admin"     on reservations;
drop policy if exists "Suppression admin"     on reservations;
drop policy if exists "Lecture admin"         on reservations;

create policy "Lecture admin"      on reservations for select using (auth.role() = 'authenticated');
create policy "Insertion publique" on reservations for insert with check (true);
create policy "Mise à jour admin"  on reservations for update using (auth.role() = 'authenticated');
create policy "Suppression admin"  on reservations for delete using (auth.role() = 'authenticated');

-- Vérification disponibilité chambre (publique via RPC)
create or replace function public.is_room_available_for_checkin(p_room_id text, p_check_in date)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from reservations r
    where r.room_id = p_room_id
      and r.check_in = p_check_in
      and r.status <> 'Annulé'
  );
$$;

grant execute on function public.is_room_available_for_checkin(text, date) to anon, authenticated;

-- Liste des chambres disponibles pour une date d'entrée donnée
create or replace function public.list_available_rooms_for_checkin(p_check_in date)
returns table (room_id text)
language sql
security definer
set search_path = public
as $$
  select rm.id as room_id
  from rooms rm
  where not exists (
    select 1
    from reservations r
    where r.room_id = rm.id
      and r.check_in = p_check_in
      and r.status <> 'Annulé'
  )
  order by rm.name;
$$;

grant execute on function public.list_available_rooms_for_checkin(date) to anon, authenticated;

-- Recherche publique limitée: permet aux clients de retrouver uniquement
-- leurs réservations en filtrant par numéro de téléphone ou code de réservation.
drop function if exists public.search_reservations_by_phone(text);

create or replace function public.search_reservations_by_phone(p_query text)
returns table (
  id text,
  client_name text,
  phone text,
  email text,
  room_id text,
  stay_type text,
  check_in date,
  check_out date,
  remarks text,
  payment_method text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.client_name,
    r.phone,
    r.email,
    r.room_id,
    r.stay_type,
    r.check_in,
    r.check_out,
    r.remarks,
    r.payment_method,
    r.status,
    r.created_at
  from reservations r
  where regexp_replace(r.phone, '\\s+', '', 'g') = regexp_replace(coalesce(p_query, ''), '\\s+', '', 'g')
     or upper(r.id) = upper(coalesce(p_query, ''))
     or upper(r.id) like upper(coalesce(p_query, '')) || '%'
  order by r.created_at desc;
$$;

grant execute on function public.search_reservations_by_phone(text) to anon, authenticated;

-- ============================================================
-- EMAIL NOTIFICATION: confirmation de réservation
-- Déclenche un envoi d'email automatique lorsqu'une réservation
-- passe au statut 'Confirmé'. L'appel HTTP est asynchrone et
-- n'empêche pas l'enregistrement ou la mise à jour de la ligne.
-- ============================================================
create extension if not exists pg_net;

create or replace function public.enqueue_reservation_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  room_record rooms%rowtype;
  nights integer;
  amount_paid integer;
  payload jsonb;
begin
  if new.status = 'Confirmé' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select *
    into room_record
    from rooms
    where id = new.room_id;

    if not found then
      return new;
    end if;

    nights := greatest(1, (new.check_out - new.check_in));

    amount_paid := case
      when new.stay_type = 'journée' then room_record.price_day * nights
      else room_record.price_night * nights
    end;

    if nights >= 3 then
      amount_paid := amount_paid - round(amount_paid * 0.2)::int;
    end if;

    payload := jsonb_build_object(
      'reservationId', new.id,
      'clientName', new.client_name,
      'clientEmail', new.email,
      'roomName', room_record.name,
      'checkIn', new.check_in,
      'checkOut', new.check_out,
      'stayType', new.stay_type,
      'amountPaid', amount_paid,
      'paymentMethod', new.payment_method,
      'siteName', 'Résidence Cheliel'
    );

    perform net.http_post(
      url := 'https://mrmghalpwtnxqakmmxpp.supabase.co/functions/v1/send-reservation-email',
      body := payload,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_reservation_confirmation_email on reservations;

create trigger trigger_reservation_confirmation_email
after insert or update of status on reservations
for each row
execute function public.enqueue_reservation_confirmation_email();

-- ============================================================
-- RESET TEST DATA (à exécuter une seule fois pour repartir à zéro)
-- ============================================================
truncate table reservations;

-- ============================================================
-- TABLE: rooms
-- ============================================================
create table if not exists rooms (
  id               text primary key,
  name             text not null,
  price_night      integer not null check (price_night >= 0),
  price_day        integer not null check (price_day >= 0),
  capacity         text not null,
  description      text not null default '',
  long_description text not null default '',
  amenities        text[] not null default '{}',
  images           text[] not null default '{}',
  created_at       timestamptz not null default now()
);

-- Index
create index if not exists idx_rooms_name on rooms (name);

-- RLS
alter table rooms enable row level security;

-- Policies
drop policy if exists "Lecture publique rooms" on rooms;
drop policy if exists "Insert admin rooms"     on rooms;
drop policy if exists "Update admin rooms"     on rooms;
drop policy if exists "Delete admin rooms"     on rooms;

create policy "Lecture publique rooms" on rooms for select using (true);
create policy "Insert admin rooms"     on rooms for insert with check (auth.role() = 'authenticated');
create policy "Update admin rooms"     on rooms for update using (auth.role() = 'authenticated');
create policy "Delete admin rooms"     on rooms for delete using (auth.role() = 'authenticated');

-- ============================================================
-- MIGRATION (si la table reservations existait déjà avec
-- check_in/check_out en TEXT, exécuter ce bloc séparément)
-- ============================================================
-- alter table reservations
--   alter column check_in  type date using check_in::date,
--   alter column check_out type date using check_out::date;

-- ============================================================
-- TABLE: gallery (images uploadées via l'admin)
-- ============================================================
create table if not exists gallery (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table gallery enable row level security;

drop policy if exists "Lecture publique gallery" on gallery;
drop policy if exists "Insert admin gallery"     on gallery;
drop policy if exists "Delete admin gallery"     on gallery;

create policy "Lecture publique gallery" on gallery for select using (true);
create policy "Insert admin gallery"     on gallery for insert with check (auth.role() = 'authenticated');
create policy "Delete admin gallery"     on gallery for delete using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET: room-images
-- (créé ici pour garantir que l'upload fonctionne en prod)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('room-images', 'room-images', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "Lecture publique room-images" on storage.objects;
drop policy if exists "Insertion admin room-images" on storage.objects;
drop policy if exists "Mise à jour admin room-images" on storage.objects;
drop policy if exists "Suppression admin room-images" on storage.objects;

create policy "Lecture publique room-images"
on storage.objects for select
using (bucket_id = 'room-images');

create policy "Insertion admin room-images"
on storage.objects for insert
with check (bucket_id = 'room-images' and auth.role() = 'authenticated');

create policy "Mise à jour admin room-images"
on storage.objects for update
using (bucket_id = 'room-images' and auth.role() = 'authenticated');

create policy "Suppression admin room-images"
on storage.objects for delete
using (bucket_id = 'room-images' and auth.role() = 'authenticated');


