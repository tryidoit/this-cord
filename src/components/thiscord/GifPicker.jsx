import React, { useEffect, useRef, useState } from "react";
import { Search, Loader2, X, Link2, Heart, Clock, ExternalLink, Image as ImageIcon } from "lucide-react";
import { searchAllMedia, googleImageSearchUrl } from "@/lib/mediaSearch";
import { cn } from "@/lib/utils";

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem("thiscord_gif_favorites") || "[]"); } catch { return []; }
}
function saveFavorites(list) {
  localStorage.setItem("thiscord_gif_favorites", JSON.stringify(list.slice(0, 50)));
}
function loadRecent() {
  try { return JSON.parse(localStorage.getItem("thiscord_gif_recent") || "[]"); } catch { return []; }
}
function saveRecent(gif) {
  const list = loadRecent().filter((g) => g.url !== gif.url);
  list.unshift(gif);
  localStorage.setItem("thiscord_gif_recent", JSON.stringify(list.slice(0, 12)));
}

export default function GifPicker({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [tab, setTab] = useState("search");
  const [favorites, setFavorites] = useState(loadFavorites());
  const [pasteUrl, setPasteUrl] = useState("");
  const debounceRef = useRef(null);

  const doSearch = async (q) => {
    setLoading(true);
    setSources([]);
    try {
      const { results, sources: okSources } = await searchAllMedia(q, true);
      setResults(results);
      setSources(okSources);
    } catch {
      setResults([]);
      setSources([]);
    }
    setLoading(false);
  };

  useEffect(() => { doSearch(""); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { doSearch(""); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const toggleFavorite = (gif) => {
    const exists = favorites.some((f) => f.url === gif.url);
    const next = exists ? favorites.filter((f) => f.url !== gif.url) : [gif, ...favorites];
    saveFavorites(next);
    setFavorites(next);
  };

  const pickGif = (gif) => {
    saveRecent(gif);
    onPick(gif.url);
  };

  const sendFallback = () => {
    const url = pasteUrl.trim();
    if (!/^https?:\/\//i.test(url)) return;
    onPick(url);
  };

  const displayList = tab === "favorites" ? favorites : results;
  const showGoogleFallback = !loading && results.length === 0 && query.trim() !== "" && tab === "search";

  return (
    <div className="mb-2 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        {tab === "search" && <Search className="h-3.5 w-3.5 text-muted-foreground" />}
        {tab === "search" ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs, images…"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        ) : (
          <span className="min-w-0 flex-1 text-[12.5px] text-muted-foreground">
            {tab === "favorites" ? "Your favorite GIFs" : "Recently sent"}
          </span>
        )}
        {tab === "search" && sources.length > 0 && (
          <span className="shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground">
            {sources.join(" · ")}
          </span>
        )}
        <button
          type="button"
          onClick={() => setTab("favorites")}
          className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg transition", tab === "favorites" ? "bg-danger/20 text-danger" : "bg-muted text-muted-foreground hover:text-foreground")}
          title="Favorites"
        >
          <Heart className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onClose} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {tab === "search" && loading ? (
          <div className="flex h-32 flex-col items-center justify-center gap-1.5">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">Searching Giphy, Tenor, Reddit…</p>
          </div>
        ) : displayList.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {displayList.map((gif, i) => (
              <div key={`${gif.url}-${i}`} className="group relative">
                <button
                  type="button"
                  onClick={() => pickGif(gif)}
                  className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/40 transition hover:ring-2 hover:ring-primary"
                >
                  {gif.preview && <img src={gif.preview} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </button>
                {gif.source && gif.source !== "Giphy" && gif.source !== "Tenor" && gif.source !== "Reddit" && (
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-background/80 px-1 text-[7px] text-muted-foreground">
                    {gif.source}
                  </span>
                )}
                {gif.license && (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-background/80 px-1 text-[7px] text-muted-foreground" title={gif.license}>
                    ©
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(gif); }}
                  className={cn("absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full transition", favorites.some((f) => f.url === gif.url) ? "bg-danger/80 text-foreground" : "bg-background/40 text-muted-foreground opacity-0 group-hover:opacity-100")}
                >
                  <Heart className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : showGoogleFallback ? (
          <div className="space-y-3 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              No results from Giphy, Tenor, Reddit, Wikimedia, or Openverse.
            </div>
            {/* Paste box */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground">Paste an image or GIF URL:</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={pasteUrl}
                    onChange={(e) => setPasteUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendFallback()}
                    placeholder="https://…"
                    className="h-9 w-full rounded-lg border border-border bg-background pl-7 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendFallback}
                  className="rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground"
                >
                  Send
                </button>
              </div>
              {pasteUrl && /^https?:\/\//i.test(pasteUrl) && (
                <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
                  <img src={pasteUrl} alt="" className="h-24 w-full object-contain" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }} />
                  <p className="hidden p-2 text-center text-[10px] text-danger">This URL is not a direct image or the host blocks hotlinking.</p>
                </div>
              )}
            </div>
            {/* Google link-out */}
            <a
              href={googleImageSearchUrl(query, true)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-foreground transition hover:bg-muted/50"
            >
              <ExternalLink className="h-3.5 w-3.5 text-info" />
              Search Google for "{query}"
            </a>
          </div>
        ) : (
          <div className="flex h-24 flex-col items-center justify-center gap-1.5 text-muted-foreground">
            {tab === "favorites" ? <Heart className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            <p className="text-[11px]">{tab === "favorites" ? "No favorites yet" : "No recent GIFs"}</p>
          </div>
        )}
      </div>
    </div>
  );
}