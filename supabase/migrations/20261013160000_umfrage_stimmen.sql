-- Verwaltung: wer hat in einer Umfrage wofür gestimmt (Spielername als Pseudonym, sonst Kurzkennung)
create or replace function public.kw_admin_poll_votes(key text, p_id bigint) returns table (choice smallint, player_id uuid, name text, best_ever int, lvl int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  return query select v.choice, v.player_id, p.name, p.best_ever, p.lvl, v.created_at
  from public.poll_votes v join public.players p on p.id = v.player_id
  where v.poll_id = p_id order by v.choice, v.created_at;
end $$;
grant execute on function public.kw_admin_poll_votes(text, bigint) to anon, authenticated;
