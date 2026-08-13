/* ============================================================
   Web Push, direkt mit Web Crypto

   Die verbreitete Bibliothek "web-push" ist für Node geschrieben
   und braucht crypto.createECDH — das fehlt in Denos Nachbau der
   Node-Schnittstellen. Statt darauf zu hoffen, ist die Sache hier
   selbst umgesetzt. Es sind zwei Standards:

     RFC 8291  Verschlüsselung des Inhalts (aes128gcm)
     RFC 8292  Absenderausweis gegenüber dem Push-Dienst (VAPID)

   Beides läuft vollständig über crypto.subtle und hat damit keine
   Abhängigkeit außerhalb der Laufzeitumgebung.
   ============================================================ */

const enc = new TextEncoder();

/* ---------- base64url ---------- */

function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/* ---------- VAPID ----------
   Der private Schlüssel aus "web-push generate-vapid-keys" ist der
   nackte 32-Byte-Skalar. Für crypto.subtle muss daraus ein JWK
   werden, dessen x und y aus dem öffentlichen Schlüssel stammen
   (65 Bytes: 0x04 gefolgt von x und y zu je 32). */

async function importVapidKey(publicB64: string, privateB64: string) {
  const pub = b64urlToBytes(publicB64);
  const d = b64urlToBytes(privateB64);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY hat nicht die erwartete Form');
  if (d.length !== 32) throw new Error('VAPID_PRIVATE_KEY hat nicht die erwartete Länge');

  return await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256',
      x: bytesToB64url(pub.slice(1, 33)),
      y: bytesToB64url(pub.slice(33, 65)),
      d: bytesToB64url(d),
      ext: true
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

async function vapidHeader(endpoint: string, subject: string, publicB64: string, privateB64: string) {
  const aud = new URL(endpoint).origin;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject
  };

  const signingInput =
    bytesToB64url(enc.encode(JSON.stringify(header))) + '.' +
    bytesToB64url(enc.encode(JSON.stringify(payload)));

  const key = await importVapidKey(publicB64, privateB64);
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(signingInput)
  ));

  // subtle liefert die Signatur bereits als r||s — genau was JOSE will
  const jwt = signingInput + '.' + bytesToB64url(sig);
  return `vapid t=${jwt}, k=${publicB64}`;
}

/* ---------- Inhalt verschlüsseln (RFC 8291) ---------- */

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bits: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, key, bits
  ));
}

async function encryptPayload(payload: string, p256dhB64: string, authB64: string) {
  const uaPublic = b64urlToBytes(p256dhB64);
  const authSecret = b64urlToBytes(authB64);

  // Flüchtiges Schlüsselpaar, nur für diese eine Nachricht
  const eph = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  ) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));

  const uaKey = await crypto.subtle.importKey(
    'raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const shared = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaKey }, eph.privateKey, 256
  ));

  // Schritt 1: gemeinsames Geheimnis mit dem auth-Wert verknüpfen
  const keyInfo = concat(enc.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic);
  const ikm = await hkdf(shared, authSecret, keyInfo, 256);

  // Schritt 2: daraus Schlüssel und Nonce ableiten
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, concat(enc.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 128);
  const nonce = await hkdf(ikm, salt, concat(enc.encode('Content-Encoding: nonce'), new Uint8Array([0])), 96);

  // 0x02 schließt den Klartext ab, danach dürfte Füllmaterial folgen
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext
  ));

  // Kopf: salt(16) | Datensatzgröße(4) | Länge des Schlüssels(1) | Schlüssel(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

/* ---------- Verschicken ---------- */

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidDetails {
  subject: string;
  publicKey: string;
  privateKey: string;
}

export async function sendPush(
  sub: PushSubscription,
  payload: string,
  vapid: VapidDetails,
  ttl = 3600
): Promise<Response> {
  const body = await encryptPayload(payload, sub.keys.p256dh, sub.keys.auth);
  const auth = await vapidHeader(sub.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey);

  return await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': String(ttl),
      'Urgency': 'normal'
    },
    body,
    signal: AbortSignal.timeout(10000)
  });
}
