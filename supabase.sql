-- Kernwacht: Tabelle für die Bestenliste
-- Im Supabase-Dashboard unter SQL Editor einfügen und ausführen.

create table if not exists public.scores (
  player_id  uuid primary key,
  name       text not null check (char_length(name) between 1 and 16),
  best_wave  integer not null default 0 check (best_wave between 0 and 100000),
  runs       integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- Jeder darf die Bestenliste lesen.
create policy "scores lesen" on public.scores for select to anon using (true);
-- Jeder darf einen Eintrag anlegen und aktualisieren (für einen Freundeskreis ausreichend).
create policy "scores anlegen" on public.scores for insert to anon with check (true);
create policy "scores aktualisieren" on public.scores for update to anon using (true) with check (true);

-- Tageslauf: bester Versuch je Spieler und Tag
create table if not exists public.daily_scores (
  day        date not null,
  player_id  uuid not null,
  name       text not null check (char_length(name) between 1 and 16),
  wave       integer not null default 0 check (wave between 0 and 100000),
  kills      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, player_id)
);

alter table public.daily_scores enable row level security;

create policy "daily lesen" on public.daily_scores for select to anon using (true);
create policy "daily anlegen" on public.daily_scores for insert to anon with check (true);
create policy "daily aktualisieren" on public.daily_scores for update to anon using (true) with check (true);
