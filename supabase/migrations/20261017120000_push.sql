-- Kernwacht: Push-Benachrichtigungen („Lager voll“, „Bohrkraft aufgeladen“)
--
-- Ablauf: Das Spiel meldet beim Verlassen der App, wann das nächste Silo voll und wann die Bohrkraft
-- überall aufgeladen ist (kw_push_plan); beim Zurückkehren löscht es den Plan wieder.
-- Jede Minute sucht pg_cron die fälligen Einträge und schickt sie per pg_net an die Edge Function „push“,
-- die sie verschlüsselt an die Push-Dienste (Google, Apple, Mozilla …) weitergibt.
--
-- Einmalig im SQL Editor (gleicher Wert wie das Secret PUSH_SECRET der Edge Function):
--   select vault.create_secret('LANGES-ZUFALLSPASSWORT', 'push_secret');
-- Ohne diesen Eintrag bleibt der Versand aus. Andere Adresse der Function (Standard: dieses Projekt):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/push', 'push_url');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Abos je Gerät (ein Spieler kann mehrere Geräte haben)
create table public.push_subs (
  endpoint   text primary key,
  player_id  uuid not null references public.players (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subs_player on public.push_subs (player_id);
alter table public.push_subs enable row level security;
revoke all on public.push_subs from anon, authenticated;

-- Geplante Nachrichten je Spieler und Art; items: [{n: Planetenname, at: Zeitpunkt in ms}]
create table public.push_plan (
  player_id uuid not null references public.players (id) on delete cascade,
  kind      text not null check (kind in ('full', 'tap')),
  at        timestamptz not null,
  items     jsonb not null default '[]',
  lang      text not null default 'de',
  primary key (player_id, kind)
);
create index push_plan_at on public.push_plan (at);
alter table public.push_plan enable row level security;
revoke all on public.push_plan from anon, authenticated;

-- Offene Aufrufe der Edge Function (Antwort nennt verschwundene Abos)
create table public.push_reqs (
  id         bigint primary key,
  created_at timestamptz not null default now()
);
alter table public.push_reqs enable row level security;
revoke all on public.push_reqs from anon, authenticated;

-- Nur bekannte Push-Dienste zulassen (die Function ruft die Adresse auf)
create or replace function public.kw_push_host_ok(p_endpoint text) returns boolean
language sql immutable as $$
  select p_endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com)/'
$$;

-- Gerät anmelden bzw. Schlüssel erneuern
create or replace function public.kw_push_sub(code text, p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code);
begin
  if p_endpoint is null or char_length(p_endpoint) > 1000 or not public.kw_push_host_ok(p_endpoint) then raise exception 'unbekannter Push-Dienst'; end if;
  if coalesce(p_p256dh, '') !~ '^[A-Za-z0-9_-]{80,100}$' or coalesce(p_auth, '') !~ '^[A-Za-z0-9_-]{16,32}$' then raise exception 'ungültige Push-Schlüssel'; end if;
  insert into public.push_subs (endpoint, player_id, p256dh, auth) values (p_endpoint, pid, p_p256dh, p_auth)
    on conflict (endpoint) do update set player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  -- höchstens 10 Geräte je Spieler, die ältesten fallen heraus
  delete from public.push_subs where endpoint in (select endpoint from public.push_subs where player_id = pid order by created_at desc offset 10);
end $$;

create or replace function public.kw_push_unsub(code text, p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subs where endpoint = p_endpoint and player_id = public.kw_player(code);
end $$;

-- Plan ersetzen. p_events: [{k: 'full', at: ms, n: 'Planet'}, {k: 'tap', at: ms}]; leer = alles löschen
create or replace function public.kw_push_plan(code text, p_events jsonb, p_lang text default 'de') returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_player(code); fl jsonb;
begin
  if pid is null then return; end if;
  delete from public.push_plan where player_id = pid;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then return; end if;
  if jsonb_array_length(p_events) > 20 then raise exception 'zu viele Einträge'; end if;
  -- nur Zeitpunkte zwischen jetzt und 7 Tagen
  select coalesce(jsonb_agg(jsonb_build_object('n', left(e->>'n', 40), 'at', (e->>'at')::double precision) order by (e->>'at')::double precision), '[]') into fl
    from jsonb_array_elements(p_events) e
    where e->>'k' = 'full' and jsonb_typeof(e->'at') = 'number'
      and (e->>'at')::double precision between extract(epoch from now()) * 1000 and extract(epoch from now() + interval '7 days') * 1000;
  if jsonb_array_length(fl) > 0 then
    insert into public.push_plan (player_id, kind, at, items, lang)
      values (pid, 'full', to_timestamp((fl->0->>'at')::double precision / 1000), fl, case when p_lang = 'en' then 'en' else 'de' end);
  end if;
  insert into public.push_plan (player_id, kind, at, lang)
    select pid, 'tap', to_timestamp(max((e->>'at')::double precision) / 1000), case when p_lang = 'en' then 'en' else 'de' end
    from jsonb_array_elements(p_events) e
    where e->>'k' = 'tap' and jsonb_typeof(e->'at') = 'number'
      and (e->>'at')::double precision between extract(epoch from now()) * 1000 and extract(epoch from now() + interval '7 days') * 1000
    having count(*) > 0;
end $$;

grant execute on function public.kw_push_sub(text, text, text, text) to anon, authenticated;
grant execute on function public.kw_push_unsub(text, text) to anon, authenticated;
grant execute on function public.kw_push_plan(text, jsonb, text) to anon, authenticated;

-- Text einer Nachricht (Deutsch oder Englisch)
create or replace function public.kw_push_text(p_kind text, p_items jsonb, p_lang text) returns jsonb
language plpgsql stable set search_path = public as $$
declare names text[]; n int; en boolean := p_lang = 'en';
begin
  if p_kind = 'tap' then
    return case when en then jsonb_build_object('title', 'Drill power recharged', 'body', 'The laser chisel is fully charged on all planets.')
      else jsonb_build_object('title', 'Bohrkraft aufgeladen', 'body', 'Der Lasermeißel ist auf allen Planeten wieder voll aufgeladen.') end;
  end if;
  -- alle Silos, die bis jetzt voll sind
  select array_agg(i->>'n' order by (i->>'at')::double precision) into names
    from jsonb_array_elements(p_items) i where (i->>'at')::double precision <= extract(epoch from now() + interval '1 minute') * 1000;
  n := greatest(1, coalesce(array_length(names, 1), 0));
  if en then
    return jsonb_build_object('title', case when n = 1 then 'Storage full' else n || ' storages full' end,
      'body', coalesce(array_to_string(names, ', ') || '. ', '') || 'Collect the ore so mining continues.');
  end if;
  return jsonb_build_object('title', case when n = 1 then 'Lager voll' else n || ' Lager voll' end,
    'body', coalesce(array_to_string(names, ', ') || '. ', '') || 'Erz abholen, damit weiter gefördert wird.');
end $$;

-- Jede Minute: fällige Nachrichten an die Edge Function geben
create or replace function public.kw_push_run() returns void
language plpgsql security definer set search_path = public as $$
declare sec text; url text; items jsonb; rid bigint; r record;
begin
  -- Antworten früherer Aufrufe: Abos, die der Push-Dienst nicht mehr kennt, löschen
  for r in select q.id, h.status_code, h.content from public.push_reqs q join net._http_response h on h.id = q.id loop
    begin
      if r.status_code = 200 then
        delete from public.push_subs where endpoint in (select jsonb_array_elements_text(r.content::jsonb -> 'gone'));
      end if;
    exception when others then null;
    end;
    delete from public.push_reqs where id = r.id;
  end loop;
  delete from public.push_reqs where created_at < now() - interval '1 hour';

  select decrypted_secret into sec from vault.decrypted_secrets where name = 'push_secret';
  if sec is null then return; end if;
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url';
  url := coalesce(url, 'https://abgowprdmthysomwewmk.supabase.co/functions/v1/push');

  -- Überholtes (z. B. nach einer Pause des Versands) verwerfen statt nachzuschicken
  delete from public.push_plan where at < now() - interval '30 minutes';
  with due as (delete from public.push_plan where at <= now() returning *)
  select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'tag', 'kw-' || d.kind) || public.kw_push_text(d.kind, d.items, d.lang))
    into items
    from due d join public.push_subs s on s.player_id = d.player_id;
  if items is null then return; end if;

  select net.http_post(url := url, body := jsonb_build_object('items', items),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', sec), timeout_milliseconds := 15000) into rid;
  insert into public.push_reqs (id) values (rid);
end $$;
revoke execute on function public.kw_push_run() from public, anon, authenticated;
revoke execute on function public.kw_push_text(text, jsonb, text) from public, anon, authenticated;

select cron.schedule('kw-push', '* * * * *', 'select public.kw_push_run()');
