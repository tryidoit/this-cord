import React, { useRef, useState } from "react";
import { Play, Pause, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetUrl } from "@/lib/assets";

// Plays a voice message attachment. Shows a play/pause button, progress bar, and duration.
// props: attachmentUrl, mine
export default function VoiceMessagePlayer({ attachmentUrl, mine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const { url, loading } = useAssetUrl(attachmentUrl);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play();
  };

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("flex items-center gap-2 rounded-2xl border border-border px-3 py-2", mine ? "bg-info text-foreground" : "bg-secondary text-foreground")}>
      <button
        onClick={togglePlay}
        disabled={loading || !url}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/80 active:scale-95 disabled:opacity-50"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-0.5 overflow-hidden">
        {Array.from({ length: 28 }).map((_, i) => {
          const pct = i / 28;
          const filled = pct <= progress;
          const heightPct = 20 + Math.abs(Math.sin(i * 1.5)) * 80;
          return (
            <div
              key={i}
              className={cn("w-1 rounded-full transition-colors", filled ? "bg-primary" : "bg-muted-foreground/40")}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
      <span className="shrink-0 text-[11px] font-mono text-muted-foreground">
        {loading ? "…" : fmtTime(playing || progress > 0 ? duration * (1 - progress) : duration)}
      </span>
      {url && (
        <a
          href={url}
          download="voice-message.webm"
          className="grid h-6 w-6 place-items-center rounded-full bg-muted/50 text-muted-foreground transition hover:text-foreground"
          title="Download"
        >
          <Download className="h-3 w-3" />
        </a>
      )}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDuration(e.target.duration)}
          onTimeUpdate={(e) => setProgress(e.target.currentTime / (e.target.duration || 1))}
          onEnded={() => { setPlaying(false); setProgress(0); }}
        />
      )}
    </div>
  );
}