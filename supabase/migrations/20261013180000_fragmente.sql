-- Gesamtzahl der gesammelten Kernfragmente (über alle Fusionen) für Bestenliste und Profil
alter table public.players add column if not exists frag bigint not null default 0;
grant select (frag) on public.players to anon, authenticated;
create index if not exists players_frag on public.players (frag desc);

drop function if exists public.kw_stats(text, int, int, int, bigint, int, int, int, int, jsonb);
create or replace function public.kw_stats(code text, p_best int, p_best_ever int, p_runs int, p_kills bigint, p_fusions int, p_chal int, p_ach int default null, p_lvl int default null, p_card jsonb default null, p_frag bigint default null) returns void
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
    ach = case when p_ach is null then ach else greatest(0, least(500, p_ach)) end,
    lvl = case when p_lvl is null then lvl else greatest(0, least(10000, p_lvl)) end,
    card = case when p_card is null or jsonb_typeof(p_card) <> 'object' or octet_length(p_card::text) > 6000 then card else p_card end,
    frag = case when p_frag is null then frag else greatest(frag, least(1000000000000000, p_frag)) end,
    updated_at = now()
  where id = pid;
end $$;
grant execute on function public.kw_stats(text, int, int, int, bigint, int, int, int, int, jsonb, bigint) to anon, authenticated;
