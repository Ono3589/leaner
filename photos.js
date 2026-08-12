/* ============================================================
   Leaner — Fotos

   Bilder werden im Browser verkleinert, bevor sie hochgeladen
   werden. Ein iPhone-Foto hat gut vier Megabyte; nach dem
   Herunterrechnen sind es rund zweihundert Kilobyte. Das ist kein
   Detail: Bei mobilem Netz entscheidet es darüber, ob das
   Eintragen zwei Sekunden dauert oder zwanzig.

   Zwei Fallstricke, die hier behandelt werden:
   - iPhone-Fotos tragen ihre Ausrichtung in den Metadaten. Wer sie
     ignoriert, bekommt jedes Hochformatbild um 90 Grad gedreht.
   - WebP spart gegenüber JPEG etwa ein Drittel, wird aber nicht
     überall zum Schreiben unterstützt. Deshalb mit Rückfall.
   ============================================================ */

const PHOTO_MAX_PX = 1200;
const PHOTO_QUALITY = 0.82;

/* Bild laden — mit korrekter Ausrichtung, egal woher es kommt. */
async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      // Ältere Safari-Versionen kennen die Option nicht
      try { return await createImageBitmap(file); } catch (e2) { /* weiter unten */ }
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild nicht lesbar')); };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/* Gibt { blob, ext, width, height } zurück. */
async function shrinkImage(file, maxPx = PHOTO_MAX_PX) {
  const src = await loadBitmap(file);
  const w0 = src.width || src.naturalWidth;
  const h0 = src.height || src.naturalHeight;
  if (!w0 || !h0) throw new Error('Bild ohne Abmessungen');

  const scale = Math.min(1, maxPx / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  if (src.close) src.close();

  let blob = await canvasToBlob(canvas, 'image/webp', PHOTO_QUALITY);
  let ext = 'webp';
  // Browser, die WebP nicht schreiben können, liefern still ein PNG
  if (!blob || blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', PHOTO_QUALITY);
    ext = 'jpg';
  }
  if (!blob) throw new Error('Bild konnte nicht umgewandelt werden');

  return { blob, ext, width: w, height: h };
}

/* ------------------------------------------------------------
   Auswahl-Dialog

   accept und capture zusammen: Auf dem iPhone erscheint dadurch die
   Auswahl zwischen Kamera und Mediathek, statt direkt die Kamera zu
   öffnen. Wer unterwegs nachträgt, hat das Foto meist schon.
------------------------------------------------------------ */

function pickImage() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.remove();
      resolve(file || null);
    });
    input.addEventListener('cancel', () => { input.remove(); resolve(null); });
    input.click();
  });
}

/* Auswählen, verkleinern, hochladen — in einem Rutsch.
   kind wird zum Ordner: 'recipes', 'diary', 'progress'. */
async function captureAndUpload(kind, onStatus) {
  const file = await pickImage();
  if (!file) return null;

  if (onStatus) onStatus('Bild wird verkleinert…');
  const { blob, ext, width, height } = await shrinkImage(file);

  if (onStatus) onStatus('Wird hochgeladen…');
  const path = await Cloud.uploadPhoto(blob, kind, ext);

  return { path, width, height, bytes: blob.size, localUrl: URL.createObjectURL(blob) };
}

/* ------------------------------------------------------------
   Anzeige

   Der Bucket ist privat, Bilder brauchen also einen signierten
   Link. Die halten eine Stunde und werden zwischengespeichert,
   damit nicht bei jedem Rendern neu unterschrieben wird.
------------------------------------------------------------ */

const photoUrlCache = new Map();   // path -> { url, until }

async function photoUrl(path) {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;          // externe Bilder, etwa von Open Food Facts

  const hit = photoUrlCache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;

  try {
    const url = await Cloud.signPhoto(path);
    if (!url) return null;
    photoUrlCache.set(path, { url, until: Date.now() + 50 * 60 * 1000 });
    return url;
  } catch (e) {
    console.warn('Bildlink fehlgeschlagen:', e.message || e);
    return null;
  }
}

/* Füllt alle <img data-photo="pfad"> im übergebenen Bereich.
   So muss die Oberfläche nicht auf Links warten, bevor sie zeichnet. */
async function fillPhotos(root) {
  const nodes = (root || document).querySelectorAll('img[data-photo]:not([data-filled])');
  await Promise.all(Array.from(nodes).map(async (img) => {
    img.dataset.filled = '1';
    const url = await photoUrl(img.dataset.photo);
    if (url) img.src = url;
    else img.closest('.photo-wrap')?.classList.add('photo-missing');
  }));
}
