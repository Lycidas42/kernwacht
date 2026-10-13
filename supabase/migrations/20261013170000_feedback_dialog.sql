-- Feedback als Gespräch: Nachrichten hin und her zwischen Spieler und Verwaltung,
-- dazu optional öffentlich („Umgesetzt dank euch“), nur wenn die Verwaltung es pro Meldung freigibt.

create table if not exists public.feedback_msgs (
  id          bigint generated always as identity primary key,
  feedback_id bigint not null references public.feedback (id) on delete cascade,
  from_admin  boolean not null,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists feedback_msgs_fb on public.feedback_msgs (feedback_id, created_at);
alter table public.feedback_msgs enable row level security;
revoke all on public.feedback_msgs from anon, authenticated;

alter table public.feedback add column if not exists player_seen timestamptz;   -- Spieler hat Antworten bis hier gelesen
alter table public.feedback add column if not exists admin_seen  timestamptz;   -- Verwaltung hat Spielernachrichten bis hier gelesen
alter table public.feedback add column if not exists public      boolean not null default false;
alter table public.feedback add column if not exists pub_note    text;          -- öffentlicher Text (sonst die Meldung selbst)

-- ---------- Spieler ----------
-- Eigene Meldungen mit Verlauf; unread = Antworten der Verwaltung nach dem letzten Lesen
create or replace function public.kw_my_feedback(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_player(code);
begin
  if pid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x order by x->>'last' desc) from (
    select jsonb_build_object(
      'id', f.id, 'kind', f.kind, 'body', f.body, 'status', f.status, 'created_at', f.created_at, 'public', f.public,
      'msgs', coalesce((select jsonb_agg(jsonb_build_object('admin', m.from_admin, 'body', m.body, 'at', m.created_at) order by m.created_at) from public.feedback_msgs m where m.feedback_id = f.id), '[]'::jsonb),
      'unread', (select count(*) from public.feedback_msgs m where m.feedback_id = f.id and m.from_admin and m.created_at > coalesce(f.player_seen, 'epoch'::timestamptz)),
      'last', greatest(f.created_at, coalesce((select max(m.created_at) from public.feedback_msgs m where m.feedback_id = f.id), f.created_at))
    ) x from public.feedback f where f.player_id = pid order by f.created_at desc limit 50) t), '[]'::jsonb);
end $$;

-- Spieler schreibt zurück (nur in eigene Meldungen, höchstens 30 Nachrichten pro Meldung)
create or replace function public.kw_feedback_reply(code text, p_id bigint, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_player(code);
begin
  if pid is null or not exists (select 1 from public.feedback where id = p_id and player_id = pid) then raise exception 'Meldung nicht gefunden'; end if;
  if char_length(trim(coalesce(p_body, ''))) < 1 then raise exception 'leere Nachricht'; end if;
  if (select count(*) from public.feedback_msgs where feedback_id = p_id) >= 30 then raise exception 'Dieses Gespräch ist voll, bitte neues Feedback schreiben'; end if;
  insert into public.feedback_msgs (feedback_id, from_admin, body) values (p_id, false, left(trim(p_body), 2000));
end $$;

create or replace function public.kw_feedback_seen(code text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_player(code);
begin
  update public.feedback set player_seen = now() where id = p_id and player_id = pid;
end $$;

-- Öffentliche Liste: nur freigegebene Meldungen, mit Spielername (Pseudonym) und letzter Antwort der Verwaltung
create or replace function public.kw_public_feedback() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]'::jsonb) from (
    select jsonb_build_object('id', f.id, 'kind', f.kind, 'text', coalesce(nullif(f.pub_note, ''), f.body), 'status', f.status, 'created_at', f.created_at,
      'name', p.name, 'pid', f.player_id,
      'reply', (select m.body from public.feedback_msgs m where m.feedback_id = f.id and m.from_admin order by m.created_at desc limit 1)) x
    from public.feedback f left join public.players p on p.id = f.player_id
    where f.public order by f.created_at desc limit 60) t
$$;

-- ---------- Verwaltung ----------
drop function if exists public.kw_admin_feedback(text);
create or replace function public.kw_admin_feedback(key text) returns table (id bigint, kind text, body text, ctx jsonb, status text, note text, created_at timestamptz, player_name text,
  is_public boolean, pub_note text, msgs jsonb, player_unread bigint, player_seen timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  return query select f.id, f.kind, f.body, f.ctx, f.status, f.note, f.created_at, p.name, f.public, f.pub_note,
    coalesce((select jsonb_agg(jsonb_build_object('admin', m.from_admin, 'body', m.body, 'at', m.created_at) order by m.created_at) from public.feedback_msgs m where m.feedback_id = f.id), '[]'::jsonb),
    (select count(*) from public.feedback_msgs m where m.feedback_id = f.id and not m.from_admin and m.created_at > coalesce(f.admin_seen, 'epoch'::timestamptz)),
    f.player_seen
  from public.feedback f left join public.players p on p.id = f.player_id order by f.created_at desc limit 500;
end $$;

create or replace function public.kw_admin_feedback_reply(key text, p_id bigint, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  if char_length(trim(coalesce(p_body, ''))) < 1 then raise exception 'leere Nachricht'; end if;
  insert into public.feedback_msgs (feedback_id, from_admin, body) values (p_id, true, left(trim(p_body), 2000));
  update public.feedback set admin_seen = now(), status = case when status = 'neu' then 'gesehen' else status end where id = p_id;
end $$;

create or replace function public.kw_admin_feedback_public(key text, p_id bigint, p_public boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  update public.feedback set public = coalesce(p_public, public), pub_note = case when p_note is null then pub_note else nullif(trim(p_note), '') end where id = p_id;
end $$;

create or replace function public.kw_admin_feedback_seen(key text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.kw_admin_guard(key);
  update public.feedback set admin_seen = now() where id = p_id;
end $$;

grant execute on function public.kw_my_feedback(text), public.kw_feedback_reply(text, bigint, text), public.kw_feedback_seen(text, bigint), public.kw_public_feedback(),
  public.kw_admin_feedback(text), public.kw_admin_feedback_reply(text, bigint, text), public.kw_admin_feedback_public(text, bigint, boolean, text), public.kw_admin_feedback_seen(text, bigint)
  to anon, authenticated;
