import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";

const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 min
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 min

export default function usePresence(profile, applyProfile) {
  const userId = profile?.created_by_id;
  const [status, setStatus] = useState(profile?.presence_status || "online");
  const lastBeatRef = useRef(0);
  const lastActivityRef = useRef(Date.now());

  // Track user activity
  useEffect(() => {
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, []);

  // Compute effective status (auto-idle)
  const effectiveStatus = useCallback(() => {
    if (status === "invisible" || status === "dnd") return status;
    const idle = Date.now() - lastActivityRef.current > IDLE_THRESHOLD;
    if (idle) return "idle";
    return status;
  }, [status]);

  // Throttled heartbeat — one write per minute or less
  useEffect(() => {
    if (!userId || !profile?.id) return undefined;
    const beat = () => {
      const now = Date.now();
      if (now - lastBeatRef.current < HEARTBEAT_INTERVAL) return;
      lastBeatRef.current = now;
      const effective = effectiveStatus();
      api.entities.Profile.update(profile.id, {
        last_seen: new Date().toISOString(),
        presence_status: effective,
      }).catch(() => {});
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => clearInterval(timer);
  }, [userId, profile?.id, effectiveStatus]);

  const setStatusAndSave = useCallback(async (newStatus) => {
    if (!profile?.id) return;
    setStatus(newStatus);
    lastBeatRef.current = Date.now();
    const updated = await api.entities.Profile.update(profile.id, {
      presence_status: newStatus,
      last_seen: new Date().toISOString(),
    });
    applyProfile(updated);
  }, [profile?.id, applyProfile]);

  const setCustomStatus = useCallback(async (text, emoji, expiryMinutes) => {
    if (!profile?.id) return;
    const expiry = expiryMinutes ? new Date(Date.now() + expiryMinutes * 60000).toISOString() : null;
    const updated = await api.entities.Profile.update(profile.id, {
      custom_status: text || null,
      custom_status_emoji: emoji || null,
      custom_status_expiry: expiry,
    });
    applyProfile(updated);
  }, [profile?.id, applyProfile]);

  const clearCustomStatus = useCallback(async () => {
    if (!profile?.id) return;
    const updated = await api.entities.Profile.update(profile.id, {
      custom_status: null,
      custom_status_emoji: null,
      custom_status_expiry: null,
    });
    applyProfile(updated);
  }, [profile?.id, applyProfile]);

  const setRichPresence = useCallback(async (gameName) => {
    if (!profile?.id) return;
    const updated = await api.entities.Profile.update(profile.id, {
      rich_presence: gameName || null,
    });
    applyProfile(updated);
  }, [profile?.id, applyProfile]);

  return {
    status,
    effectiveStatus: effectiveStatus(),
    setStatus: setStatusAndSave,
    setCustomStatus,
    clearCustomStatus,
    setRichPresence,
  };
}