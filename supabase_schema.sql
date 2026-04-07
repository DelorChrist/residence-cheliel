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

-- RLS
alter table reservations enable row level security;

-- Policies (drop avant recréation pour éviter les conflits)
drop policy if exists "Lecture publique"      on reservations;
drop policy if exists "Insertion publique"    on reservations;
drop policy if exists "Mise à jour publique"  on reservations;
drop policy if exists "Suppression publique"  on reservations;
drop policy if exists "Mise à jour admin"     on reservations;
drop policy if exists "Suppression admin"     on reservations;

create policy "Lecture publique"   on reservations for select using (true);
create policy "Insertion publique" on reservations for insert with check (true);
create policy "Mise à jour admin"  on reservations for update using (auth.role() = 'authenticated');
create policy "Suppression admin"  on reservations for delete using (auth.role() = 'authenticated');

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
-- (à créer manuellement dans Supabase Dashboard > Storage
--  ou via l'API, public bucket)
-- ============================================================
