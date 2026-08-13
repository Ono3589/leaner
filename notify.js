/* ============================================================
   Leaner — Erinnerungen, Seite des Browsers

   Auf iOS gelten drei Bedingungen, und alle drei müssen erfüllt
   sein, sonst passiert stillschweigend nichts:

   1. Die App muss über Safari zum Home-Bildschirm hinzugefügt
      worden sein. Im Safari-Tab gibt es kein pushManager.
   2. Das Manifest muss display: standalone enthalten.
   3. Die Erlaubnis darf nur als Reaktion auf ein echtes Tippen
      erfragt werden, nicht beim Laden der Seite.

   Deshalb prüft supportsPush() diese Lage und sagt der Oberfläche,
   was gerade fehlt — statt einen Knopf anzubieten, der nichts tut.
   ============================================================ */

const Notify = {

  /* Was ist auf diesem Gerät gerade möglich? */
  status() {
    if (!('serviceWorker' in navigator)) return 'nicht-unterstuetzt';
    if (!('PushManager' in window)) {
      // Auf iOS fehlt PushManager, solange die App im Browser läuft
      return isIos() && !isStandalone() ? 'home-bildschirm-noetig' : 'nicht-unterstuetzt';
    }
    if (!('Notification' in window)) return 'nicht-unterstuetzt';
    if (Notification.permission === 'denied') return 'abgelehnt';
    if (Notification.permission === 'granted') return 'erlaubt';
    return 'offen';
  },

  /* Muss aus einem Klick-Handler heraus aufgerufen werden. */
  async enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Erlaubnis nicht erteilt');

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      if (!CONFIG.VAPID_PUBLIC_KEY || CONFIG.VAPID_PUBLIC_KEY.startsWith('HIER_')) {
        throw new Error('In config.js fehlt der öffentliche VAPID-Schlüssel');
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
      });
    }

    await Cloud.saveSubscription(sub, deviceLabel());
    return sub;
  },

  async disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await Cloud.removeSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
  },

  async isSubscribed() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      return !!(await reg.pushManager.getSubscription());
    } catch (e) {
      return false;
    }
  }
};

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.navigator.standalone === true ||
         matchMedia('(display-mode: standalone)').matches;
}

function deviceLabel() {
  if (isIos()) return isStandalone() ? 'iPhone' : 'iPhone (Safari)';
  if (/Macintosh/.test(navigator.userAgent)) return 'MacBook';
  if (/Android/.test(navigator.userAgent)) return 'Android';
  return 'Gerät';
}

/* Der VAPID-Schlüssel kommt als base64url und muss als Bytefolge
   übergeben werden. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
