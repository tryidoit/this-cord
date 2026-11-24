import React, { useState, useEffect, useRef } from "react";
import { Search, Clock, X } from "lucide-react";
import { EMOJI_CATEGORIES, ALL_EMOJI, loadRecentEmoji, saveRecentEmoji } from "@/lib/emojiData";
import { cn } from "@/lib/utils";

export default function EmojiPicker({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState(0);
  const [recent, setRecent] = useState(loadRecentEmoji());
  const scrollRef = useRef(null);
  const catRefs = useRef([]);

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const filtered = query
    ? ALL_EMOJI.filter((e) => e.includes(query) || query === "")
    : null;

  const pick = (emoji) => {
    saveRecentEmoji(emoji);
    setRecent(loadRecentEmoji());
    onPick(emoji);
  };

  const scrollToCat = (idx) => {
    setActiveCat(idx);
    catRefs.current[idx]?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card" style={{ width: 340, height: 360 }}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji…"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {filtered ? (
        <div className="grid flex-1 grid-cols-8 gap-0.5 overflow-y-auto p-2">
          {filtered.map((emoji, i) => (
            <button
              key={i}
              onClick={() => pick(emoji)}
              className="grid h-8 w-8 place-items-center rounded text-lg transition hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-8 py-6 text-center text-[12px] text-muted-foreground">No emoji found</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-0.5 border-b border-border px-1 py-1">
            {recent.length > 0 && (
              <button
                onClick={() => scrollToCat(0)}
                className={cn("grid h-7 w-7 place-items-center rounded text-sm transition", activeCat === 0 ? "bg-muted" : "hover:bg-muted/50")}
                title="Recent"
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            )}
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => scrollToCat(recent.length > 0 ? i + 1 : i)}
                className={cn("grid h-7 w-7 place-items-center rounded text-sm transition", (recent.length > 0 ? activeCat === i + 1 : activeCat === i) ? "bg-muted" : "hover:bg-muted/50")}
                title={cat.name}
              >
                {cat.emojis[0]}
              </button>
            ))}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2">
            {recent.length > 0 && (
              <div ref={(el) => (catRefs.current[0] = el)}>
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</p>
                <div className="mb-2 grid grid-cols-8 gap-0.5">
                  {recent.map((emoji, i) => (
                    <button key={i} onClick={() => pick(emoji)} className="grid h-8 w-8 place-items-center rounded text-lg transition hover:bg-muted">{emoji}</button>
                  ))}
                </div>
              </div>
            )}
            {EMOJI_CATEGORIES.map((cat, i) => (
              <div key={i} ref={(el) => (catRefs.current[recent.length > 0 ? i + 1 : i] = el)}>
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat.name}</p>
                <div className="mb-2 grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((emoji, j) => (
                    <button key={j} onClick={() => pick(emoji)} className="grid h-8 w-8 place-items-center rounded text-lg transition hover:bg-muted">{emoji}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}