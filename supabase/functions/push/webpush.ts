// Web Push ohne Fremdbibliothek: VAPID-Anmeldung (RFC 8292) und Verschlüsselung aes128gcm (RFC 8188/8291),
// nur mit WebCrypto. Läuft in Deno (Supabase Edge Functions) und in Node ab Version 20.

export type Sub = { endpoint: string; p256dh: string; auth: string };
export type Vapid = { publicKey: string; privateKey: string; subject: string };

const enc = new TextEncoder();
export const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// Privaten VAPID-Schlüssel (32 Byte, base64url) mit den Koordinaten aus dem öffentlichen (65 Byte) als JWK einlesen
let signKey: CryptoKey | null = null, signFor = '';
async function vapidKey(v: Vapid) {
  if (signKey && signFor === v.privateKey) return signKey;
  const pub = unb64u(v.publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY ungültig');
  signKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33)), d: v.privateKey, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  signFor = v.privateKey;
  return signKey;
}

// Kurzlebiges JWT (ES256) für den Push-Dienst des Endpunkts
async function vapidAuth(endpoint: string, v: Vapid) {
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: v.subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidKey(v), enc.encode(head + '.' + body)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.publicKey}`;
}

// Nachricht für ein Abo verschlüsseln (ein einziger Datensatz, ohne Auffüllung)
export async function encrypt(sub: Sub, payload: Uint8Array) {
  const ua = unb64u(sub.p256dh), auth = unb64u(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const as = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hmac(await hmac(auth, ecdh), cat(enc.encode('WebPush: info\0'), ua, as, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // Datensatzgröße 4096
  return cat(salt, rs, new Uint8Array([as.length]), as, ct);
}

// Senden; Ergebnis ist der HTTP-Status des Push-Dienstes (404/410 = Abo gibt es nicht mehr)
export async function send(sub: Sub, data: unknown, v: Vapid, ttl = 6 * 3600) {
  const body = await encrypt(sub, enc.encode(JSON.stringify(data)));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidAuth(sub.endpoint, v), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'normal' },
    body,
  });
  await res.body?.cancel();
  return res.status;
}
