-- Kernwacht: Bestenliste (Bestwelle) und Tages-Bestenliste (Tageslauf)
-- Wird über die GitHub-Integration von Supabase automatisch eingespielt.
-- Lesen und Schreiben mit dem Publishable Key (Rolle anon), geschützt über Row Level Security.

create table if not exists public.scores (
  player_id  uuid primary key,
  name       text not null check (char_length(name) between 1 and 16),
  best_wave  integer not null default 0 check (best_wave between 0 and 100000),
  runs       integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_scores (
  day        date not null,
  player_id  uuid not null,
  name       text not null check (char_length(name) between 1 and 16),
  wave       integer not null default 0 check (wave between 0 and 100000),
  kills      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, player_id)
);
create index if not exists daily_scores_rank on public.daily_scores (day, wave desc, kills desc);

alter table public.scores enable row level security;
alter table public.daily_scores enable row level security;

-- Jeder darf lesen, anlegen und aktualisieren (für einen Freundeskreis ausreichend).
drop policy if exists "scores lesen" on public.scores;
drop policy if exists "scores anlegen" on public.scores;
drop policy if exists "scores aktualisieren" on public.scores;
create policy "scores lesen" on public.scores for select to anon using (true);
create policy "scores anlegen" on public.scores for insert to anon with check (true);
create policy "scores aktualisieren" on public.scores for update to anon using (true) with check (true);

drop policy if exists "daily lesen" on public.daily_scores;
drop policy if exists "daily anlegen" on public.daily_scores;
drop policy if exists "daily aktualisieren" on public.daily_scores;
create policy "daily lesen" on public.daily_scores for select to anon using (true);
create policy "daily anlegen" on public.daily_scores for insert to anon with check (true);
create policy "daily aktualisieren" on public.daily_scores for update to anon using (true) with check (true);

grant select, insert, update on public.scores, public.daily_scores to anon;
