import React, { useEffect, useRef, useState } from "react";

// Reaction time test: wait for green, tap as fast as you can.
// Best of 3 rounds under 400ms average = win.
const ROUNDS = 3;
const WIN_THRESHOLD = 400;

export default function ReactionRush({ onFinish }) {
  const [phase, setPhase] = useState("ready"); // ready | waiting | go | result | done
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [lastTime, setLastTime] = useState(null);
  const timeoutRef = useRef(null);
  const startRef = useRef(0);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const startRound = () => {
    setPhase("waiting");
    const delay = 1200 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      setPhase("go");
      startRef.current = performance.now();
    }, delay);
  };

  const handleTap = () => {
    if (phase === "ready") {
      startRound();
      return;
    }
    if (phase === "waiting") {
      clearTimeout(timeoutRef.current);
      setPhase("ready");
      setLastTime(null);
      return;
    }
    if (phase === "go") {
      const reaction = Math.round(performance.now() - startRef.current);
      const newTimes = [...times, reaction];
      const newRound = round + 1;
      setTimes(newTimes);
      setLastTime(reaction);
      setRound(newRound);

      if (newRound >= ROUNDS) {
        setPhase("done");
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        onFinish(avg <= WIN_THRESHOLD ? "win" : "lose");
        return;
      }
      setPhase("result");
      return;
    }
    if (phase === "result") {
      startRound();
      return;
    }
  };

  const bg = phase === "waiting" ? "bg-danger/20" : phase === "go" ? "bg-success/20" : "bg-background";
  const label =
    phase === "ready" ? "Tap to start" :
    phase === "waiting" ? "Wait for green…" :
    phase === "go" ? "TAP!" :
    phase === "result" ? `${lastTime}ms · tap for round ${round + 1}` :
    "Done";

  return (
    <div
      onClick={handleTap}
      className={`flex h-full w-full cursor-pointer select-none flex-col items-center justify-center ${bg} transition-colors duration-150`}
    >
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-center backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">round</p>
        <p className="font-display text-lg font-bold text-warning">
          {Math.min(round + (phase === "done" ? 0 : 1), ROUNDS)} <span className="text-foreground/30">/ {ROUNDS}</span>
        </p>
      </div>
      <p className="font-display text-3xl font-extrabold text-foreground">{label}</p>
      {phase === "waiting" && <p className="mt-3 text-sm text-danger/70">Don't tap too early!</p>}
      {phase === "go" && <p className="mt-3 text-sm text-success/70">Tap now!</p>}
      {phase === "result" && lastTime !== null && (
        <p className="mt-3 text-sm text-foreground/50">
          {lastTime < 250 ? "Lightning fast!" : lastTime < WIN_THRESHOLD ? "Great reflexes!" : "Keep practicing"}
        </p>
      )}
      {times.length > 0 && phase !== "done" && (
        <div className="mt-6 flex gap-2">
          {times.map((t, i) => (
            <span key={i} className="rounded-lg bg-foreground/10 px-2 py-1 text-[11px] font-bold text-foreground/70">{t}ms</span>
          ))}
        </div>
      )}
      {phase === "done" && (
        <div className="mt-4 flex gap-2">
          {times.map((t, i) => (
            <span key={i} className="rounded-lg bg-foreground/10 px-2 py-1 text-[11px] font-bold text-foreground/70">{t}ms</span>
          ))}
        </div>
      )}
    </div>
  );
}