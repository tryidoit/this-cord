import React, { useState, useRef, useEffect } from "react";
import {
  Mic, MicOff, Headphones, HeadphoneOff, Video, VideoOff,
  Monitor, MonitorOff, PhoneOff, Maximize2,
  Grid3x3, Focus, Settings2, Activity, Gauge,
} from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { cn } from "@/lib/utils";

export default function VoiceRoomView({
  channel,
  participants,
  localStream,
  currentUserId,
  muted,
  deafened,
  camOn,
  screenSharing,
  speaking,
  error,
  connectionQuality,
  perUserVolume,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onOpenSettings,
  onOpenSoundboard,
  onOpenActivities,
  onChangePerUserVolume,
}) {
  const [layout, setLayout] = useState("grid"); // grid | spotlight
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [showVolumeSliders, setShowVolumeSliders] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startTime] = useState(Date.now());
  const videoRefs = useRef({});

  // Timer
  useEffect(() => {
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  // Attach local stream to video element
  useEffect(() => {
    const el = videoRefs.current["local"];
    if (el && localStream) {
      el.srcObject = localStream;
      el.play().catch(() => {});
    }
  }, [localStream, camOn]);

  const others = participants.filter((p) => p.user_id !== currentUserId);
  const me = participants.find((p) => p.user_id === currentUserId);
  const hasVideo = camOn || screenSharing || others.some((p) => p.camera_on || p.screen_sharing);

  // For spotlight layout, find the pinned user or first person with video
  const spotlightUser = pinnedUserId
    ? participants.find((p) => p.user_id === pinnedUserId)
    : others.find((p) => p.camera_on || p.screen_sharing) || me;
  const spotlightIsMe = spotlightUser?.user_id === currentUserId;

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const qualityColor = connectionQuality === "good" ? "bg-online" : connectionQuality === "medium" ? "bg-warning" : "bg-danger";
  const qualityLabel = connectionQuality === "good" ? "Excellent" : connectionQuality === "medium" ? "Fair" : "Poor";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", qualityColor, "animate-pulse")} />
          <span className="text-[12px] font-semibold text-foreground">{channel?.name || "Voice Channel"}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{mmss}</span>
        <span className="text-[11px] text-muted-foreground">· {participants.length}/{8}</span>
        <div className="ml-auto flex items-center gap-1">
          {hasVideo && (
            <>
              <button
                onClick={() => setLayout("grid")}
                className={cn("grid h-7 w-7 place-items-center rounded-md transition", layout === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/60")}
                title="Grid layout"
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setLayout("spotlight")}
                className={cn("grid h-7 w-7 place-items-center rounded-md transition", layout === "spotlight" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/60")}
                title="Spotlight layout"
              >
                <Focus className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowVolumeSliders((v) => !v)}
            className={cn("grid h-7 w-7 place-items-center rounded-md transition", showVolumeSliders ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/60")}
            title="Per-user volume"
          >
            <Gauge className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/60"
            title="Voice settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger/15 px-4 py-2 text-center text-[12px] text-danger">{error}</div>
      )}

      {/* Main content */}
      <div className="relative flex-1 overflow-hidden">
        {hasVideo ? (
          layout === "spotlight" && spotlightUser ? (
            <SpotlightLayout
              spotlightUser={spotlightUser}
              spotlightIsMe={spotlightIsMe}
              localStream={localStream}
              participants={participants}
              currentUserId={currentUserId}
              videoRefs={videoRefs}
              onPin={setPinnedUserId}
              pinnedUserId={pinnedUserId}
            />
          ) : (
            <GridLayout
              participants={participants}
              currentUserId={currentUserId}
              localStream={localStream}
              videoRefs={videoRefs}
              onPin={setPinnedUserId}
              pinnedUserId={pinnedUserId}
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {participants.map((p) => (
                <VoiceAvatar key={p.user_id} p={p} isMe={p.user_id === currentUserId} />
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">{channel?.name || "Voice Channel"} · {participants.length} connected</p>
          </div>
        )}

        {/* Volume sliders panel */}
        {showVolumeSliders && (
          <div className="absolute right-3 top-3 w-56 rounded-xl border border-border bg-card/90 p-3 backdrop-blur">
            <p className="mb-2 text-[11px] font-semibold text-foreground">Per-user volume</p>
            {others.length === 0 && <p className="text-[11px] text-muted-foreground">No other participants</p>}
            {others.map((p) => (
              <div key={p.user_id} className="mb-2">
                <div className="flex items-center gap-1.5">
                  <ProfileAvatar avatarId={p.avatar_id} size={20} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{p.display_name || p.username}</span>
                  <span className="text-[10px] text-muted-foreground">{perUserVolume[p.user_id] ?? 100}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  defaultValue={perUserVolume[p.user_id] ?? 100}
                  onChange={(e) => onChangePerUserVolume?.(p.user_id, parseInt(e.target.value))}
                  className="mt-1 w-full accent-primary"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-card/40 px-4 py-3">
        <ControlButton
          onClick={onToggleMute}
          active={muted}
          activeClass="bg-danger/20 text-danger"
          title={muted ? "Unmute" : "Mute"}
          icon={muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        />
        <ControlButton
          onClick={onToggleDeafen}
          active={deafened}
          activeClass="bg-danger/20 text-danger"
          title={deafened ? "Undeafen" : "Deafen"}
          icon={deafened ? <HeadphoneOff className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
        />
        <ControlButton
          onClick={onToggleCamera}
          active={camOn}
          activeClass="bg-success/20 text-success"
          title={camOn ? "Turn off camera" : "Turn on camera"}
          icon={camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        />
        {typeof navigator.mediaDevices?.getDisplayMedia === "function" && (
          <ControlButton
            onClick={onToggleScreenShare}
            active={screenSharing}
            activeClass="bg-info/20 text-info"
            title={screenSharing ? "Stop sharing" : "Share screen"}
            icon={screenSharing ? <Monitor className="h-5 w-5" /> : <MonitorOff className="h-5 w-5" />}
          />
        )}
        <button
          onClick={onOpenSoundboard}
          className="grid h-10 w-10 place-items-center rounded-full bg-foreground/10 text-foreground transition hover:bg-foreground/15 active:scale-95"
          title="Soundboard"
        >
          <Activity className="h-4 w-4" />
        </button>
        <button
          onClick={onOpenActivities}
          className="grid h-10 w-10 place-items-center rounded-full bg-foreground/10 text-foreground transition hover:bg-foreground/15 active:scale-95"
          title="Activities"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={onLeave}
          className="grid h-12 w-12 place-items-center rounded-full bg-danger text-foreground shadow-[0_0_30px_-6px_hsl(var(--danger)/0.9)] transition hover:bg-danger active:scale-95"
          title="Disconnect"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function ControlButton({ onClick, active, activeClass, title, icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full transition active:scale-95",
        active ? activeClass : "bg-foreground/10 text-foreground hover:bg-foreground/15"
      )}
      title={title}
    >
      {icon}
    </button>
  );
}

function VoiceAvatar({ p, isMe }) {
  return (
    <div className={cn("relative", p.speaking && "ring-2 ring-online rounded-full")}>
      <ProfileAvatar avatarId={p.avatar_id} size={64} />
      {p.speaking && <span className="absolute -inset-1 rounded-full ring-2 ring-online animate-pulse" />}
      <span className="mt-1 block text-center text-[11px] text-foreground">
        {p.display_name || p.username}{isMe && " (you)"}
      </span>
      {p.muted && <MicOff className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card p-0.5 text-danger" />}
    </div>
  );
}

function GridLayout({ participants, currentUserId, localStream, videoRefs, onPin, pinnedUserId }) {
  const cols = participants.length <= 1 ? 1 : participants.length <= 4 ? 2 : 3;
  return (
    <div className="grid h-full w-full gap-1 p-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {participants.map((p) => (
        <VideoTile
          key={p.user_id}
          p={p}
          isMe={p.user_id === currentUserId}
          localStream={localStream}
          videoRefs={videoRefs}
          onPin={onPin}
          pinned={pinnedUserId === p.user_id}
        />
      ))}
    </div>
  );
}

function SpotlightLayout({ spotlightUser, spotlightIsMe, localStream, participants, currentUserId, videoRefs, onPin, pinnedUserId }) {
  return (
    <div className="flex h-full w-full flex-col gap-1 p-1">
      <div className="flex-1 overflow-hidden rounded-lg">
        <VideoTile
          p={spotlightUser}
          isMe={spotlightIsMe}
          localStream={localStream}
          videoRefs={videoRefs}
          onPin={onPin}
          pinned={pinnedUserId === spotlightUser?.user_id}
          large
        />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {participants.filter((p) => p.user_id !== spotlightUser?.user_id).map((p) => (
          <div key={p.user_id} className="h-20 w-28 shrink-0">
            <VideoTile
              p={p}
              isMe={p.user_id === currentUserId}
              localStream={localStream}
              videoRefs={videoRefs}
              onPin={onPin}
              pinned={pinnedUserId === p.user_id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoTile({ p, isMe, localStream, videoRefs, onPin, pinned, large }) {
  const hasVideo = (isMe && localStream?.getVideoTracks()?.length) || (!isMe && p.camera_on);
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg bg-card",
        p.speaking && "ring-2 ring-online",
        pinned && "ring-2 ring-primary"
      )}
    >
      {hasVideo ? (
        <video
          ref={(el) => {
            if (isMe) videoRefs.current["local"] = el;
          }}
          autoPlay
          playsInline
          muted={isMe}
          className="h-full w-full object-cover"
          style={{ transform: isMe ? "scaleX(-1)" : undefined }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          <ProfileAvatar avatarId={p.avatar_id} size={large ? 96 : 48} />
          <span className="text-[11px] text-muted-foreground">{p.display_name || p.username}{isMe && " (you)"}</span>
        </div>
      )}
      {/* Pin button */}
      <button
        onClick={() => onPin?.(p.user_id)}
        className={cn(
          "absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md transition",
          pinned ? "bg-primary text-primary-foreground" : "bg-background/60 text-foreground/60 opacity-0 hover:opacity-100"
        )}
        title={pinned ? "Unpin" : "Pin"}
      >
        <Focus className="h-3 w-3" />
      </button>
      {/* Name overlay */}
      <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded-md bg-background/60 px-1.5 py-0.5">
        {p.muted && <MicOff className="h-3 w-3 text-danger" />}
        <span className="text-[10px] font-medium text-foreground">{p.display_name || p.username}{isMe && " (you)"}</span>
      </div>
    </div>
  );
}