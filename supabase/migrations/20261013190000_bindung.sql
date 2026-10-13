-- Bindung messen: je Spieler und Tag ein Eintrag (Tag nach deutscher Zeit), Kohorten nach Anmeldetag
create table if not exists public.player_days (
  player_id uuid not null references public.players (id) on delete cascade,
  day       date not null,
  opens     int not null default 1,
  runs      int not null default 0,
  best      int not null default 0,
  primary key (player_id, day)
);
create index if not exists player_days_day on public.player_days (day);
alter table public.player_days enable row level security;
revoke all on public.player_days from anon, authenticated;

-- Spieler meldet sich: App geöffnet (p_runs = beendete Läufe heute dazu, p_best = Bestwelle)
create or replace function public.kw_seen(code text, p_runs int default 0, p_best int default 0) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code); d date := (now() at time zone 'Europe/Berlin')::date;
begin
  insert into public.player_days (player_id, day, opens, runs, best) values (pid, d, 1, greatest(0, least(1000, coalesce(p_runs, 0))), greatest(0, least(100000, coalesce(p_best, 0))))
  on conflict (player_id, day) do update set opens = player_days.opens + 1, runs = player_days.runs + greatest(0, least(1000, coalesce(p_runs, 0))), best = greatest(player_days.best, least(100000, coalesce(p_best, 0)));
end $$;

-- Verwaltung: Kohorten je Anmeldewoche mit Rückkehr an Tag 1, 3, 7, 14, 30 (klassisch: genau an diesem Tag aktiv)
create or replace function public.kw_admin_retention(key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  perform public.kw_admin_guard(key);
  with p as (select id, (created_at at time zone 'Europe/Berlin')::date as d0 from public.players),
  c as (
    select date_trunc('week', p.d0)::date as week, count(*) as n,
      count(*) filter (where exists (select 1 from public.player_days x where x.player_id = p.id and x.day = p.d0 + 1)) as d1,
      count(*) filter (where exists (select 1 from public.player_days x where x.player_id = p.id and x.day = p.d0 + 3)) as d3,
      count(*) filter (where exists (select 1 from public.player_days x where x.player_id = p.id and x.day = p.d0 + 7)) as d7,
      count(*) filter (where exists (select 1 from public.player_days x where x.player_id = p.id and x.day = p.d0 + 14)) as d14,
      count(*) filter (where exists (select 1 from public.player_days x where x.player_id = p.id and x.day = p.d0 + 30)) as d30,
      max(p.d0) as last0
    from p group by 1)
  select jsonb_build_object(
    'today', (now() at time zone 'Europe/Berlin')::date,
    'cohorts', coalesce((select jsonb_agg(jsonb_build_object('week', week, 'n', n, 'd1', d1, 'd3', d3, 'd7', d7, 'd14', d14, 'd30', d30, 'last0', last0) order by week desc) from c), '[]'::jsonb),
    'dau', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'n', n, 'runs', runs) order by day) from (
      select day, count(*) as n, sum(runs) as runs from public.player_days where day > (now() at time zone 'Europe/Berlin')::date - 30 group by day) t), '[]'::jsonb),
    'installs', coalesce((select jsonb_agg(jsonb_build_object('day', d0, 'n', n) order by d0) from (
      select d0, count(*) as n from p where d0 > (now() at time zone 'Europe/Berlin')::date - 30 group by d0) t), '[]'::jsonb)
  ) into res;
  return res;
end $$;

grant execute on function public.kw_seen(text, int, int), public.kw_admin_retention(text) to anon, authenticated;
