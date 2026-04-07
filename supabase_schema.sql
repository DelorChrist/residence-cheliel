-- Table reservations
create table if not exists reservations (
  id text primary key,
  client_name text not null,
  phone text not null,
  email text,
  room_id text not null,
  stay_type text not null default 'nuitée',
  check_in text not null,
  check_out text not null,
  remarks text,
  payment_method text not null,
  status text not null default 'En attente',
  created_at timestamptz default now()
);

-- Activer RLS
alter table reservations enable row level security;

-- Politique : lecture publique (pour les clients qui cherchent leurs réservations)
create policy "Lecture publique" on reservations
  for select using (true);

-- Politique : insertion publique (pour les clients qui réservent)
create policy "Insertion publique" on reservations
  for insert with check (true);

-- Politique : mise à jour publique (pour l'admin)
create policy "Mise à jour publique" on reservations
  for update using (true);

-- Politique : suppression publique (pour l'admin)
create policy "Suppression publique" on reservations
  for delete using (true);
