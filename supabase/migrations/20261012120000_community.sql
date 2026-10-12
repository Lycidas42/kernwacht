-- Kernwacht: Spielerprofile, Highscores, Cloud-Spielstand, Feedback, Umfragen
--
-- Sicherheitsmodell
-- * Jeder Spieler hat einen geheimen Spielercode (nur im Browser bzw. bei ihm). Die Datenbank speichert nur dessen SHA-256-Hash.
-- * Schreiben geht ausschließlich über die Funktionen kw_* (security definer), die den Spielercode prüfen.
-- * Lesen: öffentliche Profilspalten und Highscores über Spaltenrechte, alles andere nur über Funktionen.
-- * Verwaltung (Feedback lesen, Umfragen anlegen): Funktionen kw_admin_*, geschützt durch einen Verwaltungsschlüssel,
--   von dem nur der Hash hier steht.

-- Die ersten Test-Tabellen werden durch die neuen ersetzt
drop table if exists public.scores;
drop table if exists public.daily_scores;

-- ---------- Spieler ----------
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  secret_hash text not null unique,
  name        text check (name is null or char_length(name) between 1 and 16),
  avatar      smallint not null default 0 check (avatar between 0 and 63),
  color       smallint not null default 0 check (color between 0 and 15),
  best        integer not null default 0,
  best_ever   integer not null default 0,
  runs        integer not null default 0,
  kills       bigint  not null default 0,
  fusions     integer not null default 0,
  chal        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index players_best_ever on public.players (best_ever desc);

create table public.daily_scores (
  day        date not null,
  player_id  uuid not null references public.players (id) on delete cascade,
  wave       integer not null default 0,
  kills      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day, player_id)
);
create index daily_scores_rank on public.daily_scores (day, wave desc, kills desc);

create table public.saves (
  player_id  uuid primary key references public.players (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.feedback (
  id         bigint generated always as identity primary key,
  player_id  uuid references public.players (id) on delete set null,
  kind       text not null check (kind in ('bug', 'idee', 'sonstiges')),
  body       text not null check (char_length(body) between 3 and 2000),
  ctx        jsonb not null default '{}'::jsonb,
  status     text not null default 'neu' check (status in ('neu', 'gesehen', 'erledigt', 'verworfen')),
  note       text,
  created_at timestamptz not null default now()
);

create table public.polls (
  id         bigint generated always as identity primary key,
  question   text not null check (char_length(question) between 3 and 300),
  options    jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  closed_at  timestamptz
);

create table public.poll_votes (
  poll_id    bigint not null references public.polls (id) on delete cascade,
  player_id  uuid not null references public.players (id) on delete cascade,
  choice     smallint not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, player_id)
);

create table public.admin_keys (
  hash text primary key
);
-- Hash des Verwaltungsschlüssels: sha256('kernwacht-admin:' || Schlüssel). Den Schlüssel selbst hat nur der Betreiber.
insert into public.admin_keys (hash) values ('ea4638bd795a40c64eca89368243499603de90cf04fafe585a7ee6d1846e3a24') on conflict do nothing;

-- ---------- Rechte ----------
alter table public.players      enable row level security;
alter table public.daily_scores enable row level security;
alter table public.saves        enable row level security;
alter table public.feedback     enable row level security;
alter table public.polls        enable row level security;
alter table public.poll_votes   enable row level security;
alter table public.admin_keys   enable row level security;

revoke all on public.players, public.daily_scores, public.saves, public.feedback, public.polls, public.poll_votes, public.admin_keys from anon, authenticated;

-- Öffentlich lesbar: Profil- und Highscore-Spalten (ohne secret_hash), Tageswerte, aktive Umfragen
grant select (id, name, avatar, color, best, best_ever, runs, kills, fusions, chal, updated_at) on public.players to anon, authenticated;
create policy "players lesen" on public.players for select to anon, authenticated using (true);
grant select on public.daily_scores to anon, authenticated;
create policy "daily lesen" on public.daily_scores for select to anon, authenticated using (true);
grant select (id, question, options, active, created_at) on public.polls to anon, authenticated;
create policy "aktive umfragen lesen" on public.polls for select to anon, authenticated using (active);

-- ---------- Hilfsfunktionen ----------
create or replace function public.kw_hash(code text) returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to('kernwacht:' || upper(trim(code)), 'UTF8')), 'hex')
$$;

create or replace function public.kw_player(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if code is null or char_length(code) < 20 then raise exception 'ungültiger Spielercode'; end if;
  select id into pid from public.players where secret_hash = public.kw_hash(code);
  return pid;
end $$;

create or replace function public.kw_is_admin(key text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_keys where hash = encode(sha256(convert_to('kernwacht-admin:' || coalesce(key, ''), 'UTF8')), 'hex'))
$$;

create or replace function public.kw_admin_guard(key text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.kw_is_admin(key) then raise exception 'kein Zugriff'; end if;
end $$;

-- ---------- Spielerfunktionen ----------
-- Anmelden bzw. anlegen: gibt die öffentliche Spieler-ID zurück
create or replace function public.kw_register(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := public.kw_player(code);
  if pid is null then
    insert into public.players (secret_hash) values (public.kw_hash(code)) returning id into pid;
  end if;
  return pid;
end $$;

create or replace function public.kw_profile(code text, p_name text, p_avatar int, p_color int) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code);
begin
  update public.players set
    name = nullif(left(trim(coalesce(p_name, '')), 16), ''),
    avatar = greatest(0, least(63, coalesce(p_avatar, 0))),
    color = greatest(0, least(15, coalesce(p_color, 0))),
    updated_at = now()
  where id = pid;
end $$;

create or replace function public.kw_stats(code text, p_best int, p_best_ever int, p_runs int, p_kills bigint, p_fusions int, p_chal int) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code);
begin
  update public.players set
    best = greatest(0, least(100000, coalesce(p_best, 0))),
    best_ever = greatest(best_ever, least(100000, coalesce(p_best_ever, 0))),
    runs = greatest(runs, coalesce(p_runs, 0)),
    kills = greatest(kills, coalesce(p_kills, 0)),
    fusions = greatest(fusions, coalesce(p_fusions, 0)),
    chal = greatest(0, least(100, coalesce(p_chal, 0))),
    updated_at = now()
  where id = pid;
end $$;

create or replace function public.kw_daily(code text, p_day date, p_wave int, p_kills int) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code);
begin
  if p_day < current_date - 1 or p_day > current_date + 1 then raise exception 'falscher Tag'; end if;
  insert into public.daily_scores (day, player_id, wave, kills) values (p_day, pid, least(100000, greatest(0, p_wave)), greatest(0, p_kills))
  on conflict (day, player_id) do update set wave = excluded.wave, kills = excluded.kills, updated_at = now()
    where excluded.wave > daily_scores.wave or (excluded.wave = daily_scores.wave and excluded.kills > daily_scores.kills);
end $$;

create or replace function public.kw_save(code text, p_data jsonb) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code); t timestamptz := now();
begin
  if pg_column_size(p_data) > 200000 then raise exception 'Spielstand zu groß'; end if;
  insert into public.saves (player_id, data, updated_at) values (pid, p_data, t)
  on conflict (player_id) do update set data = excluded.data, updated_at = t;
  return t;
end $$;

-- Laden: gibt Spielstand und Profil zurück, oder nichts, wenn der Code unbekannt ist
create or replace function public.kw_load(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_player(code); r jsonb;
begin
  if pid is null then return null; end if;
  select jsonb_build_object('id', p.id, 'name', p.name, 'avatar', p.avatar, 'color', p.color,
    'data', s.data, 'updated_at', s.updated_at)
  into r from public.players p left join public.saves s on s.player_id = p.id where p.id = pid;
  return r;
end $$;

create or replace function public.kw_feedback(code text, p_kind text, p_body text, p_ctx jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code); fid bigint;
begin
  if (select count(*) from public.feedback where player_id = pid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'zu viele Meldungen, bitte später nochmal';
  end if;
  insert into public.feedback (player_id, kind, body, ctx) values (pid, p_kind, left(p_body, 2000), coalesce(p_ctx, '{}'::jsonb))
  returning id into fid;
  return fid;
end $$;

create or replace function public.kw_vote(code text, p_poll bigint, p_choice int) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code); n int;
begin
  select jsonb_array_length(options) into n from public.polls where id = p_poll and active;
  if n is null then raise exception 'Umfrage ist geschlossen'; end if;
  if p_choice < 0 or p_choice >= n then raise exception 'ungültige Antwort'; end if;
  insert into public.poll_votes (poll_id, player_id, choice) values (p_poll, pid, p_choice)
  on conflict (poll_id, player_id) do update set choice = excluded.choice, created_at = now();
end $$;

-- Ergebnisse einer Umfrage (öffentlich) und die eigene Stimme
create or replace function public.kw_poll_results(code text, p_poll bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid uuid := public.kw_player(code);
begin
  return jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(choice, c) from (select choice, count(*) c from public.poll_votes where poll_id = p_poll group by choice) x), '{}'::jsonb),
    'mine', (select choice from public.poll_votes where poll_id = p_poll and player_id = pid));
end $$;

-- ---------- Verwaltung ----------
create or replace function public.kw_admin_check(key text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.kw_is_admin(key)
$$;

create or replace function public.kw_admin_overview(key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  return jsonb_build_object(
    'players', (select count(*) from public.players),
    'named', (select count(*) from public.players where name is not null),
    'active7', (select count(*) from public.players where updated_at > now() - interval '7 days'),
    'active1', (select count(*) from public.players where updated_at > now() - interval '1 day'),
    'saves', (select count(*) from public.saves),
    'feedback_new', (select count(*) from public.feedback where status = 'neu'),
    'daily_today', (select count(*) from public.daily_scores where day = current_date));
end $$;

create or replace function public.kw_admin_players(key text) returns table (id uuid, name text, avatar smallint, color smallint, best int, best_ever int, runs int, kills bigint, fusions int, chal int, created_at timestamptz, updated_at timestamptz, has_save boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  return query select p.id, p.name, p.avatar, p.color, p.best, p.best_ever, p.runs, p.kills, p.fusions, p.chal, p.created_at, p.updated_at,
    exists (select 1 from public.saves s where s.player_id = p.id)
  from public.players p order by p.updated_at desc limit 500;
end $$;

create or replace function public.kw_admin_feedback(key text) returns table (id bigint, kind text, body text, ctx jsonb, status text, note text, created_at timestamptz, player_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  return query select f.id, f.kind, f.body, f.ctx, f.status, f.note, f.created_at, p.name
  from public.feedback f left join public.players p on p.id = f.player_id order by f.created_at desc limit 500;
end $$;

create or replace function public.kw_admin_feedback_set(key text, p_id bigint, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  update public.feedback set status = coalesce(p_status, status), note = coalesce(p_note, note) where id = p_id;
end $$;

create or replace function public.kw_admin_polls(key text) returns table (id bigint, question text, options jsonb, active boolean, created_at timestamptz, closed_at timestamptz, counts jsonb, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  return query select q.id, q.question, q.options, q.active, q.created_at, q.closed_at,
    coalesce((select jsonb_object_agg(v.choice, v.c) from (select pv.choice, count(*) c from public.poll_votes pv where pv.poll_id = q.id group by pv.choice) v), '{}'::jsonb),
    (select count(*) from public.poll_votes pv where pv.poll_id = q.id)
  from public.polls q order by q.created_at desc;
end $$;

create or replace function public.kw_admin_poll_create(key text, p_question text, p_options jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare nid bigint;
begin
  perform public.kw_admin_guard(key);
  insert into public.polls (question, options) values (p_question, p_options) returning id into nid;
  return nid;
end $$;

create or replace function public.kw_admin_poll_set(key text, p_id bigint, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  update public.polls set active = p_active, closed_at = case when p_active then null else now() end where id = p_id;
end $$;

create or replace function public.kw_admin_poll_delete(key text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  delete from public.polls where id = p_id;
end $$;

-- Interne Hilfsfunktionen nicht von außen aufrufbar
revoke execute on function public.kw_player(text), public.kw_is_admin(text), public.kw_admin_guard(text), public.kw_hash(text) from public, anon, authenticated;
