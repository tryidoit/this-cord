import { useEffect, useState } from "react";
import { api } from "@/api/client";

// ── In-memory + IndexedDB cache for resolved asset URLs ──
const memCache = new Map();
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const req = indexedDB.open("thiscord_assets", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("assets", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function idbGet(id) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction("assets", "readonly");
    const req = tx.objectStore("assets").get(id);
    req.onsuccess = () => resolve(req.result?.url || null);
    req.onerror = () => resolve(null);
  });
}

async function idbSet(id, url) {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction("assets", "readwrite");
    tx.objectStore("assets").put({ id, url });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// ── Public helper: resolve any avatar_id / attachment_url to a usable URL ──
export async function getAssetUrl(ref) {
  if (typeof ref !== "string" || !ref) return ref;
  // Already a URL (legacy upload or external GIF link)
  if (/^https?:\/\//.test(ref)) return ref;
  // Asset reference: "asset:<id>"
  if (!ref.startsWith("asset:")) return ref;
  const id = ref.slice(6);
  if (memCache.has(id)) return memCache.get(id);
  const cached = await idbGet(id);
  if (cached) {
    memCache.set(id, cached);
    return cached;
  }
  try {
    const asset = await api.entities.Asset.get(id);
    if (asset?.data_url) {
      memCache.set(id, asset.data_url);
      idbSet(id, asset.data_url);
      return asset.data_url;
    }
  } catch { /* not found */ }
  return null;
}

// ── React hook for lazy-loading an asset URL ──
export function useAssetUrl(ref) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAssetUrl(ref).then((resolved) => {
      if (alive) {
        setUrl(resolved);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [ref]);
  return { url, loading };
}

// ── Image compression ──
// Compresses to JPEG (or keeps GIF/animated), caps dimensions and quality.
export function compressImage(file, maxDim = 1280, quality = 0.7, maxSize = 240000) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve({ dataUrl: null, width: 0, height: 0 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const isGif = file.type === "image/gif";
        const mime = isGif ? "image/gif" : "image/jpeg";
        const fmt = isGif ? 0.8 : quality;
        let dataUrl = canvas.toDataURL(mime, fmt);
        // Shrink further if still too large
        let q = fmt;
        while (dataUrl.length > maxSize && width > 80) {
          width = Math.round(width * 0.8);
          height = Math.round(height * 0.8);
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          q = Math.max(0.2, q - 0.1);
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        resolve({ dataUrl, width, height });
      };
      img.onerror = () => resolve({ dataUrl: null, width: 0, height: 0 });
      img.src = reader.result;
    };
    reader.onerror = () => resolve({ dataUrl: null, width: 0, height: 0 });
    reader.readAsDataURL(file);
  });
}

// ── Audio compression ──
// Reads the file as a data URL, capping size.
export function compressAudio(file, maxSize = 200000) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("audio/")) {
      resolve({ dataUrl: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === "string" && dataUrl.length <= maxSize) {
        resolve({ dataUrl });
      } else {
        // Too large — we can't easily re-encode without an audio library.
        // Return null; the caller will show an error.
        resolve({ dataUrl: null, tooLarge: true });
      }
    };
    reader.onerror = () => resolve({ dataUrl: null });
    reader.readAsDataURL(file);
  });
}

// ── Save an asset to the entity and return the reference ──
export async function saveAsset(dataUrl, kind, mime, size, width, height) {
  const asset = await api.entities.Asset.create({
    kind,
    mime,
    size: size || dataUrl.length,
    width: width || 0,
    height: height || 0,
    data_url: dataUrl,
  });
  return `asset:${asset.id}`;
}