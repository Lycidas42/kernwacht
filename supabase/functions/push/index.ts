// Kernwacht – Push-Benachrichtigungen verschicken.
// Aufgerufen jede Minute von der Datenbank (pg_cron + pg_net, siehe Migration *_push.sql) mit den fälligen
// Nachrichten. Antwortet mit den Abos, die es nicht mehr gibt; die Datenbank löscht sie beim nächsten Lauf.
//
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_SECRET
// JWT-Prüfung ist aus (supabase/config.toml), geschützt wird über PUSH_SECRET im Header x-push-secret.
import { send, type Sub } from './webpush.ts';

type Item = Sub & { title: string; body: string; tag: string };

const env = (k: string) => Deno.env.get(k) || '';
const vapid = { publicKey: env('VAPID_PUBLIC_KEY'), privateKey: env('VAPID_PRIVATE_KEY'), subject: env('VAPID_SUBJECT') || 'mailto:admin@example.com' };

Deno.serve(async req => {
  const secret = env('PUSH_SECRET');
  if (!secret || req.headers.get('x-push-secret') !== secret) return new Response('forbidden', { status: 403 });
  if (!vapid.publicKey || !vapid.privateKey) return new Response('VAPID-Schlüssel fehlen', { status: 500 });
  let items: Item[] = [];
  try { items = ((await req.json()).items || []).slice(0, 500); } catch { return new Response('bad request', { status: 400 }); }

  const gone: string[] = [];
  let sent = 0;
  await Promise.all(items.map(async it => {
    try {
      const st = await send(it, { title: it.title, body: it.body, tag: it.tag }, vapid);
      if (st === 404 || st === 410) gone.push(it.endpoint);
      else if (st < 300) sent++;
      else console.log('push', st, new URL(it.endpoint).host);
    } catch (e) { console.log('push fehlgeschlagen', String(e)); }
  }));
  return Response.json({ sent, gone });
});
