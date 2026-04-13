-- ============================================================
-- RÉSIDENCE CHELIEL — Schéma Supabase complet
-- Idempotent : peut être exécuté plusieurs fois sans erreur
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists pg_net;

-- ============================================================
-- TABLE: admin_users
-- Contient les UIDs Supabase Auth autorisés à administrer.
-- ============================================================
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Fonction helper : vérifie si l'utilisateur courant est admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

-- ============================================================
-- TABLE: reservations
-- ============================================================
create table if not exists reservations (
  id             text primary key default ('RES-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
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

drop policy if exists "Lecture publique"      on reservations;
drop policy if exists "Insertion publique"    on reservations;
drop policy if exists "Mise à jour publique"  on reservations;
drop policy if exists "Suppression publique"  on reservations;
drop policy if exists "Mise à jour admin"     on reservations;
drop policy if exists "Suppression admin"     on reservations;
drop policy if exists "Lecture admin"         on reservations;

create policy "Lecture admin"      on reservations for select using (public.is_admin());
create policy "Insertion publique" on reservations for insert with check (true);
create policy "Mise à jour admin"  on reservations for update using (public.is_admin());
create policy "Suppression admin"  on reservations for delete using (public.is_admin());

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
  image_principale text not null default '',
  images           text[] not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_rooms_name on rooms (name);

alter table rooms enable row level security;

drop policy if exists "Lecture publique rooms" on rooms;
drop policy if exists "Insert admin rooms"     on rooms;
drop policy if exists "Update admin rooms"     on rooms;
drop policy if exists "Delete admin rooms"     on rooms;

create policy "Lecture publique rooms" on rooms for select using (true);
create policy "Insert admin rooms"     on rooms for insert with check (public.is_admin());
create policy "Update admin rooms"     on rooms for update using (public.is_admin());
create policy "Delete admin rooms"     on rooms for delete using (public.is_admin());

-- ============================================================
-- TABLE: gallery
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
create policy "Insert admin gallery"     on gallery for insert with check (public.is_admin());
create policy "Delete admin gallery"     on gallery for delete using (public.is_admin());

-- ============================================================
-- TABLE: audit_log
-- ============================================================
create table if not exists audit_log (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,
  table_name text not null,
  record_id  text not null,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;

drop policy if exists "Lecture audit admin" on audit_log;
create policy "Lecture audit admin" on audit_log for select using (public.is_admin());

-- ============================================================
-- STORAGE BUCKET: room-images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('room-images', 'room-images', true)
on conflict (id) do update set name = excluded.name, public = excluded.public;

drop policy if exists "Lecture publique room-images"   on storage.objects;
drop policy if exists "Insertion admin room-images"    on storage.objects;
drop policy if exists "Mise à jour admin room-images"  on storage.objects;
drop policy if exists "Suppression admin room-images"  on storage.objects;

create policy "Lecture publique room-images"
  on storage.objects for select using (bucket_id = 'room-images');

create policy "Insertion admin room-images"
  on storage.objects for insert
  with check (bucket_id = 'room-images' and public.is_admin());

create policy "Mise à jour admin room-images"
  on storage.objects for update
  using (bucket_id = 'room-images' and public.is_admin());

create policy "Suppression admin room-images"
  on storage.objects for delete
  using (bucket_id = 'room-images' and public.is_admin());

-- ============================================================
-- FONCTIONS RPC PUBLIQUES
-- ============================================================

-- Insère une réservation et retourne son ID (contourne la RLS SELECT pour anon)
create or replace function public.insert_reservation(
  client_name    text,
  phone          text,
  email          text,
  room_id        text,
  stay_type      text,
  check_in       date,
  check_out      date,
  remarks        text,
  payment_method text,
  status         text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text;
begin
  insert into reservations (
    client_name, phone, email, room_id, stay_type,
    check_in, check_out, remarks, payment_method, status
  ) values (
    client_name, phone, email, room_id, stay_type,
    check_in, check_out, remarks, payment_method, status
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.insert_reservation(text,text,text,text,text,date,date,text,text,text) to anon, authenticated;


create or replace function public.is_room_available_for_checkin(p_room_id text, p_check_in date)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from reservations r
    where r.room_id = p_room_id
      and r.check_in = p_check_in
      and r.status <> 'Annulé'
  );
$$;

grant execute on function public.is_room_available_for_checkin(text, date) to anon, authenticated;

-- Liste les chambres disponibles pour une date d'arrivée
create or replace function public.list_available_rooms_for_checkin(p_check_in date)
returns table (room_id text)
language sql
security definer
set search_path = public
as $$
  select rm.id as room_id
  from rooms rm
  where not exists (
    select 1 from reservations r
    where r.room_id = rm.id
      and r.check_in = p_check_in
      and r.status <> 'Annulé'
  )
  order by rm.name;
$$;

grant execute on function public.list_available_rooms_for_checkin(date) to anon, authenticated;

-- Recherche des réservations par téléphone ou code
drop function if exists public.search_reservations_by_phone(text);

create or replace function public.search_reservations_by_phone(p_query text)
returns table (
  id text, client_name text, phone text, email text,
  room_id text, stay_type text, check_in date, check_out date,
  remarks text, payment_method text, status text, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.client_name, r.phone, r.email, r.room_id,
         r.stay_type, r.check_in, r.check_out, r.remarks,
         r.payment_method, r.status, r.created_at
  from reservations r
  where regexp_replace(r.phone, '\s+', '', 'g') = regexp_replace(coalesce(p_query, ''), '\s+', '', 'g')
     or upper(r.id) = upper(coalesce(p_query, ''))
     or upper(r.id) like upper(coalesce(p_query, '')) || '%'
  order by r.created_at desc;
$$;

grant execute on function public.search_reservations_by_phone(text) to anon, authenticated;

-- ============================================================
-- TRIGGER: validation + rate limiting avant insertion
-- ============================================================
create or replace function public.check_reservation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  if length(trim(new.client_name)) < 2 then
    raise exception 'Nom invalide.' using errcode = 'P0001';
  end if;

  if new.check_out <= new.check_in then
    raise exception 'La date de départ doit être après la date d''arrivée.' using errcode = 'P0001';
  end if;

  if (new.check_out - new.check_in) > 90 then
    raise exception 'La durée maximale de réservation est de 90 jours.' using errcode = 'P0001';
  end if;

  if new.check_in < current_date then
    raise exception 'La date d''arrivée ne peut pas être dans le passé.' using errcode = 'P0001';
  end if;

  select count(*) into recent_count
  from reservations
  where phone = new.phone
    and created_at > now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Trop de réservations. Veuillez réessayer dans une heure.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_reservation_rate_limit on reservations;
create trigger trigger_reservation_rate_limit
  before insert on reservations
  for each row execute function public.check_reservation_rate_limit();

-- ============================================================
-- TRIGGER: audit log des actions sur reservations
-- ============================================================
create or replace function public.log_reservation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (user_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op = 'DELETE' then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_audit_reservations on reservations;
create trigger trigger_audit_reservations
  after insert or update or delete on reservations
  for each row execute function public.log_reservation_change();

-- ============================================================
-- TRIGGER: email de confirmation à la confirmation d'une réservation
-- ============================================================
create or replace function public.enqueue_reservation_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  room_record  rooms%rowtype;
  nights       integer;
  amount_paid  integer;
  payload      jsonb;
  -- URL fixe du projet Supabase
  supabase_url text := 'https://mrmghalpwtnxqakmmxpp.supabase.co';
begin
  if new.status = 'Confirmé' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select * into room_record from rooms where id = new.room_id;
    if not found then return new; end if;

    nights := greatest(1, (new.check_out - new.check_in));
    amount_paid := case
      when new.stay_type = 'journée' then room_record.price_day * nights
      else room_record.price_night * nights
    end;
    if nights >= 3 then
      amount_paid := amount_paid - round(amount_paid * 0.2)::int;
    end if;

    payload := jsonb_build_object(
      'reservationId',  new.id,
      'clientName',     new.client_name,
      'clientEmail',    new.email,
      'roomName',       room_record.name,
      'checkIn',        new.check_in,
      'checkOut',       new.check_out,
      'stayType',       new.stay_type,
      'amountPaid',     amount_paid,
      'paymentMethod',  new.payment_method,
      'siteName',       'Résidence Cheliel'
    );

    -- URL Supabase hardcodée (current_setting non disponible sur Supabase cloud)
    if supabase_url is not null and supabase_url <> '' then
      perform net.http_post(
        url     := supabase_url || '/functions/v1/send-reservation-email',
        body    := payload,
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_reservation_confirmation_email on reservations;
create trigger trigger_reservation_confirmation_email
  after insert or update of status on reservations
  for each row execute function public.enqueue_reservation_confirmation_email();

-- ============================================================
-- MIGRATIONS (si tables existantes — exécuter séparément)
-- ============================================================
-- Ajouter image_principale si rooms existe déjà :
-- alter table rooms add column if not exists image_principale text not null default '';

-- Passer check_in/check_out de text à date si nécessaire :
-- alter table reservations
--   alter column check_in  type date using check_in::date,
--   alter column check_out type date using check_out::date;

-- ============================================================
-- ENREGISTRER L'ADMIN
-- ============================================================
insert into admin_users (user_id)
values ('46483cac-f1c5-463e-a929-f5bfcad03194')
on conflict do nothing;
