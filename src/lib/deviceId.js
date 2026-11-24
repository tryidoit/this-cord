// Anti-evasion signals for device bans. The browser keeps a random id in two places (localStorage and
// IndexedDB) so "clear cookies" alone doesn't make it a new device, and sends a coarse fingerprint hash.
// The server only ever uses these to match against bans it already has.
const KEY = "tc_local_id";
let cached = { local: null, fp: null };

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomId = () => hex(crypto.getRandomValues(new Uint8Array(16)));

function idbGet() {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open("tc_device", 1);
      open.onupgradeneeded = () => open.result.createObjectStore("kv");
      open.onsuccess = () => { const r = open.result.transaction("kv").objectStore("kv").get(KEY); r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null); };
      open.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
function idbSet(v) {
  try {
    const open = indexedDB.open("tc_device", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    open.onsuccess = () => { open.result.transaction("kv", "readwrite").objectStore("kv").put(v, KEY); };
  } catch { /* storage blocked */ }
}

async function fingerprint() {
  const parts = [navigator.userAgent, navigator.language, (navigator.languages || []).join(","), navigator.platform, navigator.hardwareConcurrency,
    screen.width, screen.height, screen.colorDepth, Intl.DateTimeFormat().resolvedOptions().timeZone];
  try {
    const c = document.createElement("canvas"); c.width = 200; c.height = 40;
    const g = c.getContext("2d"); g.textBaseline = "top"; g.font = "16px Arial"; g.fillStyle = "#f60"; g.fillRect(10, 5, 80, 20);
    g.fillStyle = "#069"; g.fillText("This-Cord \u{1F4AC} fp", 4, 12); parts.push(c.toDataURL());
    const gl = document.createElement("canvas").getContext("webgl"); const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    if (gl && ext) parts.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
  } catch { /* ignore */ }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("|")));
  return hex(new Uint8Array(buf)).slice(0, 32);
}

export async function initDeviceSignals() {
  let id = null;
  try { id = localStorage.getItem(KEY); } catch { /* blocked */ }
  if (!/^[a-f0-9]{32}$/.test(id || "")) id = await idbGet();
  if (!/^[a-f0-9]{32}$/.test(id || "")) id = randomId();
  try { localStorage.setItem(KEY, id); } catch { /* blocked */ }
  idbSet(id);
  cached = { local: id, fp: await fingerprint().catch(() => null) };
}
export const deviceHeaders = () => ({ ...(cached.local ? { "X-TC-Local": cached.local } : {}), ...(cached.fp ? { "X-TC-FP": cached.fp } : {}) });
