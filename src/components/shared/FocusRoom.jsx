import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { Play, Pause, RotateCcw, Timer, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

export default function FocusRoom({ channelId, serverId, userId, username }) {
  const [sessions, setSessions] = useState([]);
  const [mode, setMode] = useState("focus"); // focus | break
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [myStats, setMyStats] = useState({ total_minutes: 0, sessions_completed: 0 });

  const load = useCallback(async () => {
    const page = await api.entities.FocusSession.filter({ channel_id: channelId }, { sort: "-created_date", limit: 50 });
    const items = page?.items || [];
    setSessions(items.filter((s) => !s.ended_at));
    const mine = items.filter((s) => s.user_id === userId && s.completed);
    setMyStats({
      total_minutes: mine.reduce((sum, s) => sum + (s.total_focus_minutes || 0), 0),
      sessions_completed: mine.length,
    });
  }, [channelId, userId]);

  useEffect(() => {
    load();
    const unsub = api.entities.FocusSession.subscribe(() => load());
    return unsub;
  }, [load]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Session ended
          completeSession();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const completeSession = async () => {
    setRunning(false);
    if (mode === "focus") {
      await api.entities.FocusSession.create({
        channel_id: channelId,
        server_id: serverId,
        user_id: userId,
        username,
        session_type: "focus",
        duration_minutes: FOCUS_MINUTES,
        started_at: new Date(Date.now() - FOCUS_MINUTES * 60 * 1000).toISOString(),
        ended_at: new Date().toISOString(),
        completed: true,
        total_focus_minutes: FOCUS_MINUTES,
      });
      setMode("break");
      setSecondsLeft(BREAK_MINUTES * 60);
    } else {
      setMode("focus");
      setSecondsLeft(FOCUS_MINUTES * 60);
    }
    await load();
  };

  const toggle = async () => {
    if (!running) {
      // Start a session record
      await api.entities.FocusSession.create({
        channel_id: channelId,
        server_id: serverId,
        user_id: userId,
        username,
        session_type: mode,
        duration_minutes: mode === "focus" ? FOCUS_MINUTES : BREAK_MINUTES,
        started_at: new Date().toISOString(),
      }).catch(() => {});
      await load();
    }
    setRunning(!running);
  };

  const reset = () => {
    setRunning(false);
    setMode("focus");
    setSecondsLeft(FOCUS_MINUTES * 60);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const progress = mode === "focus"
    ? ((FOCUS_MINUTES * 60 - secondsLeft) / (FOCUS_MINUTES * 60)) * 100
    : ((BREAK_MINUTES * 60 - secondsLeft) / (BREAK_MINUTES * 60)) * 100;

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="mb-4 flex items-center gap-2">
        <Timer className={cn("h-5 w-5", mode === "focus" ? "text-primary" : "text-success")} />
        <h3 className="font-display text-lg font-bold text-foreground">
          {mode === "focus" ? "Focus Session" : "Break Time"}
        </h3>
      </div>

      {/* Timer circle */}
      <div className="relative mb-6 h-48 w-48">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          <circle
            cx="100" cy="100" r="90" fill="none"
            stroke="currentColor" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
            className={mode === "focus" ? "text-primary" : "text-success"}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold text-foreground">{formatTime(secondsLeft)}</span>
          <span className="text-xs text-muted-foreground">{mode === "focus" ? "Stay focused!" : "Take a break"}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition",
            running ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={reset} className="rounded-xl border border-border p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Who is focusing */}
      {sessions.length > 0 && (
        <div className="mt-6 w-full max-w-sm rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Who's focusing now
          </div>
          <div className="flex flex-wrap gap-2">
            {sessions.map((s) => (
              <span key={s.id} className={cn("rounded-full px-2.5 py-1 text-xs", s.user_id === userId ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                @{s.username} · {s.session_type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Personal stats */}
      <div className="mt-4 flex gap-4 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{myStats.total_minutes}</p>
          <p className="text-xs text-muted-foreground">focus minutes</p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{myStats.sessions_completed}</p>
          <p className="text-xs text-muted-foreground">sessions done</p>
        </div>
      </div>
    </div>
  );
}