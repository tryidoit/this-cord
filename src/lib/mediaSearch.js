// Media search with fallback chain: Giphy → Tenor → Reddit → Wikimedia → Openverse → Google link-out

const GIPHY_KEY = "dc6zaTOxFJmzC";

export async function searchGiphy(query, limit = 24) {
  const endpoint = query
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=pg`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("giphy failed");
  const json = await res.json();
  return (json.data || []).map((g) => ({
    url: g.images?.original?.url || g.images?.downsized?.url,
    preview: g.images?.fixed_height_small?.url || g.images?.downsized?.url,
    source: "Giphy",
  })).filter((g) => g.url);
}

export async function searchGiphyStickers(query, limit = 20) {
  if (!query) return [];
  const res = await fetch(
    `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg`
  );
  if (!res.ok) throw new Error("giphy stickers failed");
  const json = await res.json();
  return (json.data || []).map((g) => ({
    url: g.images?.original?.url || g.images?.downsized?.url,
    preview: g.images?.fixed_height_small?.url || g.images?.downsized?.url,
    source: "Giphy Stickers",
  })).filter((g) => g.url);
}

export async function searchTenor(query, limit = 24) {
  const endpoint = query
    ? `https://g.tenor.com/v2/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=${limit}&contentfilter=medium`
    : `https://g.tenor.com/v2/featured?key=LIVDSRZULELA&limit=${limit}&contentfilter=medium`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("tenor failed");
  const json = await res.json();
  return (json.results || []).map((g) => ({
    url: g.media_formats?.gif?.url || g.itemurl,
    preview: g.media_formats?.tinygif?.url || g.media_formats?.gif?.url,
    source: "Tenor",
  })).filter((g) => g.url);
}

export async function searchReddit(query, limit = 25) {
  const endpoint = query
    ? `https://www.reddit.com/r/gifs/search.json?q=${encodeURIComponent(query)}&limit=${limit}&sort=relevance&restrict_sr=1`
    : `https://www.reddit.com/r/gifs/hot.json?limit=${limit}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("reddit failed");
  const json = await res.json();
  return (json.data?.children || [])
    .map((c) => {
      const url = c.data?.url;
      const preview = c.data?.preview?.images?.[0]?.source?.url;
      return { url, preview: preview || url, source: "Reddit" };
    })
    .filter((g) => g.url && /\.(gif|gifv|mp4)$/i.test(g.url));
}

// Wikimedia Commons API — free, keyless, origin=*
export async function searchWikimedia(query, limit = 20) {
  if (!query) return [];
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query + " filetype:bitmap|gif")}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=320`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("wikimedia failed");
  const json = await res.json();
  const pages = json.query?.pages || {};
  return Object.values(pages).map((p) => {
    const info = p.imageinfo?.[0];
    if (!info) return null;
    const license = info.extmetadata?.LicenseShortName?.value || "Unknown";
    return {
      url: info.url,
      preview: info.thumburl || info.url,
      source: "Wikimedia",
      license: license.replace(/<[^>]*>/g, ""),
    };
  }).filter(Boolean);
}

// Openverse API — free, anonymous, no key needed
export async function searchOpenverse(query, limit = 20) {
  if (!query) return [];
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}&mature=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("openverse failed");
  const json = await res.json();
  return (json.results || []).map((r) => ({
    url: r.url,
    preview: r.thumbnail || r.url,
    source: "Openverse",
    license: r.license || "Unknown",
    creator: r.creator,
  })).filter((g) => g.url);
}

export const MEDIA_SOURCES = ["Giphy", "Tenor", "Giphy Stickers", "Reddit", "Wikimedia", "Openverse"];

export function googleImageSearchUrl(query, gifOnly = false) {
  const q = encodeURIComponent(query);
  const tbs = gifOnly ? "&tbs=itp:animated" : "";
  return `https://www.google.com/search?tbm=isch&q=${q}${tbs}`;
}

export async function searchAllMedia(query, gifOnly = true) {
  const tasks = gifOnly
    ? [searchGiphy(query), searchTenor(query), searchGiphyStickers(query), searchReddit(query)]
    : [searchGiphy(query), searchTenor(query), searchWikimedia(query), searchOpenverse(query)];

  const settled = await Promise.allSettled(tasks);
  const ok = [];
  const okSources = [];
  const taskNames = gifOnly
    ? ["Giphy", "Tenor", "Giphy Stickers", "Reddit"]
    : ["Giphy", "Tenor", "Wikimedia", "Openverse"];

  settled.forEach((s, i) => {
    if (s.status === "fulfilled" && s.value.length) {
      ok.push(...s.value);
      okSources.push(taskNames[i]);
    }
  });

  // If GIF sources failed or returned nothing, try image sources
  if (ok.length === 0) {
    const imgTasks = [searchWikimedia(query), searchOpenverse(query)];
    const imgSettled = await Promise.allSettled(imgTasks);
    imgSettled.forEach((s, i) => {
      if (s.status === "fulfilled" && s.value.length) {
        ok.push(...s.value);
        okSources.push(["Wikimedia", "Openverse"][i]);
      }
    });
  }

  // Dedupe
  const seen = new Set();
  const merged = ok.filter((g) => {
    if (seen.has(g.url)) return false;
    seen.add(g.url);
    return true;
  });

  return { results: merged, sources: okSources };
}