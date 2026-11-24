import React, { useState, useEffect } from "react";
import { Volume2, X, Play } from "lucide-react";
import { getSoundboardSounds, playSound } from "@/lib/soundboard";
import { api } from "@/api/client";

export default function Soundboard({ onPlay, onClose }) {
  const sounds = getSoundboardSounds();
  const [volume, setVolume] = useState(70);
  const [serverClips, setServerClips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    try {
      const page = await api.entities.Asset.filter({ kind: "soundboard" }, { limit: 50 });
      setServerClips((page?.items || []).filter((a) => (a.size || 0) <= 102400));
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handlePlay = (soundId) => {
    playSound(soundId, volume / 100);
    onPlay?.(soundId, volume / 100);
  };

  const playClip = (clip) => {
    const audio = new Audio(clip.data_url);
    audio.volume = volume / 100;
    audio.play().catch(() => {});
    onPlay?.(clip.id, volume / 100);
  };

  return (
    <div className="fixed bottom-20 right-4 z-[75] w-72 rounded-xl border border-border bg-card p-4 shadow-2xl">
      <div className="mb-3 flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-primary" />
        <span className="flex-1 text-[13px] font-semibold text-foreground">Soundboard</span>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted/60">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Volume slider */}
      <div className="mb-3 flex items-center gap-2">
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="w-8 text-right text-[10px] text-muted-foreground">{volume}%</span>
      </div>

      {/* Synthesized sounds */}
      <div className="grid grid-cols-3 gap-1.5">
        {sounds.map((s) => (
          <button
            key={s.id}
            onClick={() => handlePlay(s.id)}
            className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 p-2 text-center transition hover:bg-muted/70 active:scale-95"
          >
            <span className="text-lg">{s.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Server clips */}
      {serverClips.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Server clips (≤100KB)</p>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {serverClips.map((clip) => (
              <button
                key={clip.id}
                onClick={() => playClip(clip)}
                className="flex w-full items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-left transition hover:bg-muted/60"
              >
                <Play className="h-3 w-3 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{clip.id.slice(0, 12)}</span>
                <span className="text-[9px] text-muted-foreground">{Math.round(clip.size / 1024)}KB</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="text-center text-[10px] text-muted-foreground">Loading clips…</p>}
    </div>
  );
}