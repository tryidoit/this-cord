import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { createRinger } from "@/lib/sound";
import { getAssetUrl } from "@/lib/assets";

export default function IncomingCall({ call, ringtoneUri, onAccept, onDecline }) {
  const ringerRef = useRef(null);

  // Ring with the uploaded ringtone, or a synthesised pulse when there is none.
  useEffect(() => {
    if (!call) return undefined;
    let cancelled = false;
    const ringer = createRinger(null);
    ringerRef.current = ringer;
    ringer.start();

    if (ringtoneUri) {
      getAssetUrl(ringtoneUri).then((url) => {
        if (cancelled || !url) return;
        const custom = createRinger(url);
        ringer.stop();
        ringerRef.current = custom;
        custom.start();
      });
    }

    return () => {
      cancelled = true;
      ringerRef.current?.stop();
    };
  }, [call, ringtoneUri]);

  if (!call) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="fixed bottom-4 left-1/2 z-[90] w-[min(92vw,26rem)] -translate-x-1/2 rounded-3xl border border-border bg-card p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ProfileAvatar avatarId={call.caller_avatar} size={46} />
          <span className="absolute -inset-1 animate-ping rounded-full border border-emerald-400/40" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{call.caller_name || call.caller_username}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {call.kind === "video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
            incoming {call.kind} call
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDecline}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-danger/15 py-2.5 text-[13px] font-semibold text-danger transition hover:bg-danger/25 active:scale-[0.98]"
        >
          <PhoneOff className="h-4 w-4" /> Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-[13px] font-semibold text-success-foreground transition hover:bg-success active:scale-[0.98]"
        >
          <Phone className="h-4 w-4" /> Accept
        </button>
      </div>
    </motion.div>
  );
}