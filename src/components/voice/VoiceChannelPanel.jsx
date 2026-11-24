import React from "react";
import { Mic, MicOff, HeadphoneOff, Monitor, Camera, Radio, PhoneOff, Settings2, Activity, Crown } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { cn } from "@/lib/utils";

export default function VoiceChannelPanel({
  channel,
  participants,
  currentUserId,
  onJoin,
  onLeave,
  onOpenSettings,
  onOpenSoundboard,
  onOpenActivities,
  isActive,
}) {
  const others = participants.filter((p) => p.user_id !== currentUserId);
  const me = participants.find((p) => p.user_id === currentUserId);

  return (
    <div className="mb-1 rounded-xl bg-card/60 p-2">
      <div className="flex items-center gap-1.5 px-1 pb-1.5">
        <Radio className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 truncate text-[12px] font-semibold text-foreground">{channel?.name || "Voice"}</span>
        {isActive && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-online animate-pulse" />
            <span className="text-[10px] text-muted-foreground">{participants.length}/{8}</span>
          </span>
        )}
      </div>

      {!isActive ? (
        <button
          onClick={() => onJoin?.(channel)}
          className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-2 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          Join Voice
        </button>
      ) : (
        <div className="space-y-0.5">
          {me && (
            <ParticipantRow p={me} isMe onLeave={onLeave} />
          )}
          {others.map((p) => (
            <ParticipantRow key={p.user_id} p={p} onOpenSettings={onOpenSettings} />
          ))}

          <div className="flex items-center gap-1 pt-1.5">
            <button
              onClick={onOpenSoundboard}
              className="grid h-7 w-7 place-items-center rounded-md bg-muted/40 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
              title="Soundboard"
            >
              <Activity className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onOpenActivities}
              className="grid h-7 w-7 place-items-center rounded-md bg-muted/40 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
              title="Activities"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onOpenSettings?.(channel)}
              className="grid h-7 w-7 place-items-center rounded-md bg-muted/40 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
              title="Voice settings"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ParticipantRow({ p, isMe, onLeave, onOpenSettings }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-1.5 py-1 transition",
        p.speaking ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-muted/40"
      )}
    >
      <div className="relative">
        <ProfileAvatar avatarId={p.avatar_id} size={28} />
        {p.speaking && (
          <span className="absolute -inset-0.5 rounded-full ring-2 ring-online animate-pulse" />
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
        {p.display_name || p.username}
        {isMe && " (you)"}
      </span>
      <div className="flex items-center gap-0.5">
        {p.priority_speaker && <Crown className="h-3 w-3 text-warning" />}
        {p.is_speaker && p.hand_raised && <span className="text-[10px]">✋</span>}
        {p.muted ? (
          <MicOff className="h-3 w-3 text-danger" />
        ) : (
          <Mic className="h-3 w-3 text-muted-foreground" />
        )}
        {p.deafened ? (
          <HeadphoneOff className="h-3 w-3 text-danger" />
        ) : null}
        {p.camera_on && <Camera className="h-3 w-3 text-success" />}
        {p.screen_sharing && <Monitor className="h-3 w-3 text-info" />}
        {isMe && onLeave && (
          <button
            onClick={onLeave}
            className="grid h-5 w-5 place-items-center rounded text-danger transition hover:bg-danger/15"
            title="Disconnect"
          >
            <PhoneOff className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}