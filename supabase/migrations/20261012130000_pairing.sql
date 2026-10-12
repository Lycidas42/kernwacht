-- Kernwacht: Geräte koppeln mit Kurzcode (10 Minuten gültig)
--
-- Ein Spieler kann jetzt mehrere Geräteschlüssel haben (player_keys). Gerät A erzeugt einen Kurzcode,
-- Gerät B löst ihn mit einem eigenen, neuen Geräteschlüssel ein. Kein Geheimnis verlässt Gerät A.

create table public.player_keys (
  hash       text primary key,
  player_id  uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.player_keys enable row level security;
revoke all on public.player_keys from anon, authenticated;

create table public.pair_codes (
  code       text primary key,
  player_id  uuid not null references public.players (id) on delete cascade,
  expires_at timestamptz not null
);
alter table public.pair_codes enable row level security;
revoke all on public.pair_codes from anon, authenticated;

-- Fehlversuche (gegen Durchprobieren)
create table public.pair_fails (ts timestamptz not null default now());
alter table public.pair_fails enable row level security;
revoke all on public.pair_fails from anon, authenticated;

-- Spieler zum Geräteschlüssel: erst im Hauptschlüssel, dann in den weiteren Geräteschlüsseln
create or replace function public.kw_player(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid; h text;
begin
  if code is null or char_length(code) < 20 then raise exception 'ungültiger Spielercode'; end if;
  h := public.kw_hash(code);
  select id into pid from public.players where secret_hash = h;
  if pid is null then select player_id into pid from public.player_keys where hash = h; end if;
  return pid;
end $$;
revoke execute on function public.kw_player(text) from public, anon, authenticated;

-- Gerät A: Kurzcode erzeugen (ersetzt einen offenen Code dieses Spielers)
create or replace function public.kw_pair_create(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid := public.kw_register(code); c text; alph text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int; t timestamptz := now() + interval '10 minutes';
begin
  delete from public.pair_codes where player_id = pid or expires_at < now();
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alph, 1 + floor(random() * 32)::int, 1); end loop;
    begin
      insert into public.pair_codes (code, player_id, expires_at) values (c, pid, t);
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return jsonb_build_object('code', c, 'expires_at', t);
end $$;

-- Gerät B: Kurzcode einlösen. new_code = neuer Geräteschlüssel von B, old_code = bisheriger Schlüssel von B (wird aufgeräumt)
create or replace function public.kw_pair_redeem(new_code text, old_code text, p_pair text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid; oldpid uuid; c text := upper(regexp_replace(coalesce(p_pair, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if new_code is null or char_length(new_code) < 20 then raise exception 'ungültiger Geräteschlüssel'; end if;
  if (select count(*) from public.pair_fails where ts > now() - interval '10 minutes') >= 200 then
    return jsonb_build_object('error', 'Zu viele Fehlversuche, bitte in ein paar Minuten nochmal.');
  end if;
  select player_id into pid from public.pair_codes where code = c and expires_at > now();
  if pid is null then
    insert into public.pair_fails default values;
    delete from public.pair_fails where ts < now() - interval '1 hour';
    -- kein raise: sonst würde der Fehlversuch mit zurückgerollt
    return jsonb_build_object('error', 'Code ungültig oder abgelaufen.');
  end if;
  delete from public.pair_codes where code = c;
  insert into public.player_keys (hash, player_id) values (public.kw_hash(new_code), pid) on conflict (hash) do update set player_id = excluded.player_id;
  -- Den leeren bzw. ersetzten Spieler des neuen Geräts entfernen
  if old_code is not null and char_length(old_code) >= 20 then
    oldpid := public.kw_player(old_code);
    if oldpid is not null and oldpid <> pid then delete from public.players where id = oldpid; end if;
  end if;
  return public.kw_load(new_code);
end $$;

-- Liste der Geräte eines Spielers ist nicht nötig; zum Abmelden eines Geräts genügt das Löschen seines Schlüssels
create or replace function public.kw_unlink(code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.player_keys where hash = public.kw_hash(code);
end $$;
