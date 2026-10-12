-- Erfolge: Erfolgspunkte (erreichte Erfolgsstufen) im Profil und in der Bestenliste
alter table public.players add column if not exists ach int not null default 0;
grant select (ach) on public.players to anon, authenticated;

drop function if exists public.kw_stats(text, int, int, int, bigint, int, int);
create or replace function public.kw_stats(code text, p_best int, p_best_ever int, p_runs int, p_kills bigint, p_fusions int, p_chal int, p_ach int default null) returns void
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
    ach = case when p_ach is null then ach else greatest(0, least(500, p_ach)) end, -- alte Clients senden keinen Wert
    updated_at = now()
  where id = pid;
end $$;
