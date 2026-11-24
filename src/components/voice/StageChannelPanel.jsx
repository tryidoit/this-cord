import React, { useState } from "react";
import { Hand, Mic, MicOff, Crown, X, UserPlus, UserMinus, Megaphone } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { cn } from "@/lib/utils";

export default function StageChannelPanel({
  channel,
  participants,
  currentUserId,
  isAdmin,
  onJoin,
  onLeave,
  onRaiseHand,
  onInviteToSpeak,
  onRemoveFromStage,
  isActive,
}) {
  const [stageTopic, setStageTopic] = useState(channel?.topic || "");
  const speakers = participants.filter((p) => p.is_speaker);
  const audience = participants.filter((p) => !p.is_speaker);
  const handRaised = participants.filter((p) => p.hand_raised && !p.is_speaker);
  const me = participants.find((p) => p.user_id === currentUserId);
  const amSpeaker = me?.is_speaker;

  return (
    <div className="mb-1 rounded-xl bg-card/60 p-2">
      {/* Stage header */}
      <div className="flex items-center gap-1.5 px-1 pb-1.5">
        <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 truncate text-[12px] font-semibold text-foreground">{channel?.name || "Stage"}</span>
        {isActive && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-online animate-pulse" />
            <span className="text-[10px] text-muted-foreground">{participants.length}</span>
          </span>
        )}
      </div>

      {/* Stage topic */}
      {isActive && stageTopic && (
        <p className="mb-1.5 rounded-md bg-muted/30 px-2 py-1 text-[11px] italic text-muted-foreground">{stageTopic}</p>
      )}

      {!isActive ? (
        <button
          onClick={() => onJoin?.(channel)}
          className="flex w-full items-center gap-2 rounded-lg bg-muted/40 px-2 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
        >
          <Megaphone className="h-3.5 w-3.5" />
          Join as Audience
        </button>
      ) : (
        <div className="space-y-1.5">
          {/* Speakers */}
          {speakers.length > 0 && (
            <div>
              <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Speakers</p>
              {speakers.map((p) => (
                <StageParticipantRow
                  key={p.user_id}
                  p={p}
                  isMe={p.user_id === currentUserId}
                  isAdmin={isAdmin}
                  onRemoveFromStage={onRemoveFromStage}
                />
              ))}
            </div>
          )}

          {/* Hand raised */}
          {handRaised.length > 0 && (
            <div>
              <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-warning">Hand Raised</p>
              {handRaised.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                  <Hand className="h-3 w-3 text-warning" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{p.display_name || p.username}</span>
                  {isAdmin && (
                    <button
                      onClick={() => onInviteToSpeak?.(p.user_id)}
                      className="grid h-5 w-5 place-items-center rounded text-success transition hover:bg-success/15"
                      title="Invite to speak"
                    >
                      <UserPlus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Audience */}
          {audience.length > 0 && (
            <div>
              <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Audience</p>
              {audience.slice(0, 10).map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 rounded-lg px-1.5 py-0.5">
                  <ProfileAvatar avatarId={p.avatar_id} size={20} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{p.display_name || p.username}{p.user_id === currentUserId && " (you)"}</span>
                </div>
              ))}
              {audience.length > 10 && (
                <p className="px-2 text-[10px] text-muted-foreground">+{audience.length - 10} more</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-1.5">
            {!amSpeaker && (
              <button
                onClick={onRaiseHand}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition",
                  me?.hand_raised ? "bg-warning/20 text-warning" : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                )}
              >
                <Hand className="h-3 w-3" />
                {me?.hand_raised ? "Lower hand" : "Raise hand"}
              </button>
            )}
            {isActive && (
              <button
                onClick={onLeave}
                className="ml-auto flex items-center gap-1.5 rounded-md bg-danger/15 px-2 py-1 text-[11px] font-medium text-danger transition hover:bg-danger/25"
              >
                <X className="h-3 w-3" />
                Leave
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StageParticipantRow({ p, isMe, isAdmin, onRemoveFromStage }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-1.5 py-1 transition",
        p.speaking ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-muted/40"
      )}
    >
      <div className="relative">
        <ProfileAvatar avatarId={p.avatar_id} size={24} />
        {p.speaking && <span className="absolute -inset-0.5 rounded-full ring-2 ring-online animate-pulse" />}
      </div>
      <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{p.display_name || p.username}{isMe && " (you)"}</span>
      {p.priority_speaker && <Crown className="h-3 w-3 text-warning" />}
      {p.muted ? <MicOff className="h-3 w-3 text-danger" /> : <Mic className="h-3 w-3 text-success" />}
      {isAdmin && !isMe && (
        <button
          onClick={() => onRemoveFromStage?.(p.user_id)}
          className="grid h-5 w-5 place-items-center rounded text-danger transition hover:bg-danger/15"
          title="Move to audience"
        >
          <UserMinus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}