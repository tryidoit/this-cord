import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/api/client";
import { Play, Pause, Plus, X, Youtube, Volume2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

function extractVideoId(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return { type: "youtube", id: yt[1] };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: "vimeo", id: vm[1] };
  return null;
}

export default function WatchTogether({ channelId, serverId, userId, username, isHost }) {
  const [party, setParty] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  const loadParty = useCallback(async () => {
    const page = await api.entities.WatchParty.filter({ channel_id: channelId }, { sort: "-created_date", limit: 1 });
    setParty(page?.items?.[0] || null);
  }, [channelId]);

  useEffect(() => {
    loadParty();
    const unsub = api.entities.WatchParty.subscribe(() => loadParty());
    return () => { unsub?.(); clearInterval(intervalRef.current); };
  }, [loadParty]);

  // Sync playback state
  useEffect(() => {
    if (!party) return;
    const iframe = playerRef.current;
    if (!iframe) return;
    // For YouTube: postMessage to control playback
    if (party.video_type === "youtube" && party.video_id) {
      iframe.src = `https://www.youtube.com/embed/${party.video_id}?autoplay=${party.is_playing ? 1 : 0}&start=${Math.floor(party.current_time || 0)}&controls=1&modestbranding=1`;
    }
  }, [party?.video_id, party?.is_playing, party?.current_time]);

  // Host: periodically update current_time
  useEffect(() => {
    if (!isHost || !party) return;
    intervalRef.current = setInterval(async () => {
      const iframe = playerRef.current;
      // We can't read iframe time without YT API, so just update heartbeat
      await api.entities.WatchParty.update(party.id, { updated_at: new Date().toISOString() }).catch(() => {});
    }, 10000);
    return () => clearInterval(intervalRef.current);
  }, [isHost, party]);

  const startParty = async () => {
    const parsed = extractVideoId(urlInput.trim());
    if (!parsed) {
      toast({ title: "Invalid URL", description: "Paste a YouTube or Vimeo link", variant: "destructive" });
      return;
    }
    const existing = party;
    if (existing) {
      await api.entities.WatchParty.update(existing.id, {
        video_url: urlInput.trim(),
        video_type: parsed.type,
        video_id: parsed.id,
        is_playing: true,
        current_time: 0,
        updated_at: new Date().toISOString(),
        ended: false,
      });
    } else {
      await api.entities.WatchParty.create({
        channel_id: channelId,
        server_id: serverId,
        host_user_id: userId,
        host_username: username,
        video_url: urlInput.trim(),
        video_type: parsed.type,
        video_id: parsed.id,
        is_playing: true,
        current_time: 0,
        updated_at: new Date().toISOString(),
      });
    }
    setUrlInput("");
    await loadParty();
    toast({ title: "Watch party started!", description: "Video is now synced for everyone" });
  };

  const togglePlay = async () => {
    if (!party) return;
    await api.entities.WatchParty.update(party.id, { is_playing: !party.is_playing, updated_at: new Date().toISOString() });
    await loadParty();
  };

  const endParty = async () => {
    if (!party) return;
    await api.entities.WatchParty.update(party.id, { ended: true, is_playing: false });
    await loadParty();
  };

  if (!party || party.ended) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <Youtube className="h-10 w-10 text-primary" />
        <h3 className="mt-3 font-display text-lg font-bold text-foreground">Watch Together</h3>
        <p className="mb-4 text-xs text-muted-foreground">Paste a YouTube or Vimeo link to start a synced watch party</p>
        <div className="flex w-full max-w-md gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
          />
          <button onClick={startParty} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold text-foreground">Watch Party</h3>
          <p className="text-[11px] text-muted-foreground">Hosted by @{party.host_username}</p>
        </div>
        {isHost && (
          <div className="flex gap-1">
            <button onClick={togglePlay} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90">
              {party.is_playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={endParty} className="rounded-lg bg-destructive p-2 text-destructive-foreground hover:bg-destructive/90">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-black">
        {party.video_type === "youtube" && (
          <iframe
            ref={playerRef}
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${party.video_id}?autoplay=${party.is_playing ? 1 : 0}&start=${Math.floor(party.current_time || 0)}&controls=1&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        {party.video_type === "vimeo" && (
          <iframe
            ref={playerRef}
            className="aspect-video w-full"
            src={`https://player.vimeo.com/video/${party.video_id}?autoplay=${party.is_playing ? 1 : 0}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      {party.is_playing && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-success">
          <Volume2 className="h-3 w-3" /> Now playing
        </div>
      )}
    </div>
  );
}