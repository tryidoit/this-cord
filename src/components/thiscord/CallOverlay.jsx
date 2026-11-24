import React, { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2, Volume2, Wifi, RefreshCw, RotateCcw, Info, VolumeX, Monitor, PictureInPicture2 } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { cn } from "@/lib/utils";

export default function CallOverlay({
  call, localStream, remoteStream, connection, muted, camOff,
  remoteMuted, remoteCamOff, error, fallbackMode, fallbackFrame, stats, connectedAt,
  screenSharing,
  onToggleMute, onToggleCam, onEnd, onUpgrade, onDowngrade, onToggleScreenShare,
}) {
  const [seconds, setSeconds] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState("");
  const localRef = useRef(null);
  const remoteRef = useRef(null);

  // Timer starts when the call connects, not when the overlay mounts
  useEffect(() => {
    if (!connectedAt) return undefined;
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - connectedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [connectedAt]);

  useEffect(() => {
    const el = remoteRef.current;
    if (!el) return;
    if (el.srcObject !== (remoteStream || null)) el.srcObject = remoteStream || null;
    const played = el.play?.();
    if (played?.catch) {
      played.catch(() => setAudioBlocked(true));
    }
  }, [remoteStream, call?.kind, fallbackMode]);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    if (el.srcObject !== (localStream || null)) el.srcObject = localStream || null;
    const played = el.play?.();
    if (played?.catch) played.catch(() => {});
  }, [localStream, call?.kind]);

  // Enumerate audio output devices
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
    }).catch(() => {});
  }, []);

  const changeOutput = async (deviceId) => {
    setSelectedOutput(deviceId);
    const el = remoteRef.current;
    if (el && el.setSinkId) {
      try { await el.setSinkId(deviceId); } catch { /* not supported */ }
    }
  };

  const togglePiP = async () => {
    const el = remoteRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
    } catch { /* not supported */ }
  };

  if (!call) return null;

  const peer = call.peer || {};
  const hasRemoteVideo = !!remoteStream?.getVideoTracks?.().length;
  const hasFallbackFrame = !!fallbackFrame;
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const isLive = connection === "connected" || call.status === "active";
  const isReconnecting = connection === "disconnected" || connection === "connecting" || (connection === "new" && call.status === "connecting");
  const statusLabel = fallbackMode
    ? "data mode"
    : isLive && connectedAt
    ? mmss
    : call.status === "ringing"
    ? call.role === "caller" ? "ringing…" : "connecting…"
    : isReconnecting
    ? "reconnecting…"
    : "connecting…";

  const enableAudio = () => {
    const el = remoteRef.current;
    if (!el) return;
    el.play().then(() => setAudioBlocked(false)).catch(() => {});
  };

  const flipCamera = async () => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track?.getCapabilities) return;
    const caps = track.getCapabilities();
    if (!caps.facingMode) return;
    const newFacing = caps.facingMode?.[0] === "user" ? "environment" : "user";
    try {
      await track.applyConstraints({ facingMode: newFacing });
    } catch { /* not supported */ }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      {call.kind === "video" ? (
        <div className="relative flex-1 overflow-hidden">
          {fallbackMode ? (
            hasFallbackFrame ? (
              <img src={fallbackFrame} alt="remote" className="h-full w-full bg-background object-contain" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-background">
                <ProfileAvatar avatarId={peer.avatar_id} size={132} />
                <p className="text-sm text-zinc-500">connecting data mode…</p>
              </div>
            )
          ) : (
            <>
              <video
                key="remote-video"
                ref={remoteRef}
                autoPlay
                playsInline
                className="h-full w-full bg-background object-cover"
                style={{ visibility: hasRemoteVideo && !remoteCamOff ? "visible" : "hidden" }}
              />
              {!hasRemoteVideo || remoteCamOff ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
                  <ProfileAvatar avatarId={peer.avatar_id} size={132} />
                  <p className="text-sm text-zinc-500">{remoteCamOff ? "their camera is off" : isLive ? "their camera is off" : "connecting video…"}</p>
                </div>
              ) : null}
            </>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center gap-1.5 rounded-full bg-background/45 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
              {fallbackMode ? <Wifi className="h-3 w-3 text-warning" /> : isReconnecting ? <RefreshCw className="h-3 w-3 animate-spin" /> : !isLive ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
              {statusLabel}
            </div>
            <p className="truncate text-sm font-semibold text-foreground">{peer.display_name || peer.username}</p>
            {remoteMuted && <span className="rounded-full bg-danger/20 px-2 py-0.5 text-[10px] text-danger">muted</span>}
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="pointer-events-auto ml-auto grid h-7 w-7 place-items-center rounded-full bg-background/45 text-foreground/70 hover:text-foreground"
              title="Call info"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>

          {showInfo && (
            <div className="absolute right-4 top-14 rounded-xl border border-border bg-background/80 p-3 text-[11px] text-foreground/80 backdrop-blur">
              <p className="font-semibold text-foreground/90">Call info</p>
              {stats ? (
                <>
                  <p className="mt-1">Connection: {stats.rtcType || "—"}</p>
                  <p>RTT: {stats.rtt != null ? `${stats.rtt}ms` : "—"}</p>
                  <p>Packets lost: {stats.packetsLost || 0}</p>
                  <p>Bitrate: {stats.bitrate ? `${stats.bitrate}kbps` : "—"}</p>
                  <p>ICE: {stats.iceState || "—"}</p>
                </>
              ) : <p className="mt-1">Gathering stats…</p>}
              {audioOutputs.length > 1 && typeof HTMLMediaElement.prototype.setSinkId === "function" && (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="mb-1 font-semibold text-foreground/90">Output device</p>
                  <select value={selectedOutput} onChange={(e) => changeOutput(e.target.value)} className="w-full rounded-md border border-border bg-background/50 px-1.5 py-1 text-foreground">
                    {audioOutputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Audio device"}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <video
            key="local-video"
            ref={localRef}
            autoPlay
            muted
            playsInline
            className="-scale-x-100 absolute bottom-4 right-4 h-32 w-24 rounded-2xl border border-white/15 bg-background object-cover shadow-2xl sm:h-44 sm:w-32"
            style={{ visibility: localStream && !camOff ? "visible" : "hidden" }}
          />
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col items-center justify-center bg-background">
          <ProfileAvatar avatarId={peer.avatar_id} size={132} />
          <p className="mt-5 font-display text-xl font-bold text-foreground">{peer.display_name || peer.username}</p>
          <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">{statusLabel}</p>
          {fallbackMode && (
            <p className="mt-2 max-w-xs text-center text-[11px] text-warning/70">
              Low-quality data mode active — audio and video may be delayed.
            </p>
          )}
          {remoteMuted && <p className="mt-1 text-[11px] text-danger">muted</p>}
        </div>
      )}

      {call.kind === "voice" && !fallbackMode && <audio key="remote-audio" ref={remoteRef} autoPlay />}

      {audioBlocked && (
        <button
          type="button"
          onClick={enableAudio}
          className="mx-auto mb-2 flex items-center gap-2 rounded-full bg-warning/20 px-4 py-2 text-[12px] font-semibold text-warning transition hover:bg-warning/30"
        >
          <VolumeX className="h-4 w-4" /> Tap to enable sound
        </button>
      )}

      {error && <p className="bg-danger/15 py-2 text-center text-[12px] text-danger">{error}</p>}

      <div className="flex items-center justify-center gap-3 bg-background/60 py-4">
        <button
          type="button"
          onClick={onToggleMute}
          className={cn("grid h-12 w-12 place-items-center rounded-full transition active:scale-95", muted ? "bg-danger/20 text-danger" : "bg-foreground/10 text-foreground hover:bg-foreground/15")}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {call.kind === "video" && (
          <>
            <button
              type="button"
              onClick={onToggleCam}
              className={cn("grid h-12 w-12 place-items-center rounded-full transition active:scale-95", camOff ? "bg-danger/20 text-danger" : "bg-foreground/10 text-foreground hover:bg-foreground/15")}
              title={camOff ? "Turn on camera" : "Turn off camera"}
            >
              {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={flipCamera}
              className="grid h-12 w-12 place-items-center rounded-full bg-foreground/10 text-foreground transition hover:bg-foreground/15 active:scale-95"
              title="Flip camera"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </>
        )}
        {call.kind === "voice" && onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="grid h-12 w-12 place-items-center rounded-full bg-foreground/10 text-foreground transition hover:bg-foreground/15 active:scale-95"
            title="Switch to video"
          >
            <Video className="h-5 w-5" />
          </button>
        )}
        {call.kind === "video" && onDowngrade && (
          <button
            type="button"
            onClick={onDowngrade}
            className="grid h-12 w-12 place-items-center rounded-full bg-foreground/10 text-foreground transition hover:bg-foreground/15 active:scale-95"
            title="Switch to voice"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        )}
        {call.kind === "video" && typeof navigator.mediaDevices?.getDisplayMedia === "function" && onToggleScreenShare && (
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={cn("grid h-12 w-12 place-items-center rounded-full transition active:scale-95", screenSharing ? "bg-success/20 text-success" : "bg-foreground/10 text-foreground hover:bg-foreground/15")}
            title="Share screen"
          >
            <Monitor className="h-5 w-5" />
          </button>
        )}
        {call.kind === "video" && document.pictureInPictureEnabled && (
          <button
            type="button"
            onClick={togglePiP}
            className="grid h-12 w-12 place-items-center rounded-full bg-foreground/10 text-foreground transition hover:bg-foreground/15 active:scale-95"
            title="Picture in picture"
          >
            <PictureInPicture2 className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onEnd}
          className="grid h-14 w-14 place-items-center rounded-full bg-danger text-foreground shadow-[0_0_30px_-6px_hsl(var(--danger)/0.9)] transition hover:bg-danger active:scale-95"
          title="End call"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}