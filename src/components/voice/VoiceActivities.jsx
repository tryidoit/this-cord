import React, { useState } from "react";
import { Gamepad2, X, Trophy, Users, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const GAMES = [
  { id: "ColorMatch", label: "Color Match", emoji: "🎨" },
  { id: "VortexRun", label: "Vortex Run", emoji: "🌀" },
  { id: "PrismStack", label: "Prism Stack", emoji: "💎" },
  { id: "NeonPong", label: "Neon Pong", emoji: "🏓" },
  { id: "ReactionRush", label: "Reaction Rush", emoji: "⚡" },
  { id: "SerpentArena", label: "Serpent Arena", emoji: "🐍" },
  { id: "OrbitSlam", label: "Orbit Slam", emoji: "🪐" },
];

export default function VoiceActivities({ participants, currentUserId, onClose, onLaunch }) {
  const [selected, setSelected] = useState(null);
  const [lobby, setLobby] = useState([]);
  const [launched, setLaunched] = useState(false);
  const [scores, setScores] = useState({});

  const toggleLobby = (userId) => {
    setLobby((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleLaunch = () => {
    if (!selected) return;
    setLaunched(true);
    onLaunch?.(selected, lobby);
  };

  return (
    <div className="fixed bottom-20 right-4 z-[75] w-80 rounded-xl border border-border bg-card p-4 shadow-2xl">
      <div className="flex items-center gap-2">
        <Gamepad2 className="h-4 w-4 text-primary" />
        <span className="flex-1 text-[13px] font-semibold text-foreground">Activities</span>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted/60">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {launched ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-warning" />
            <span className="text-[12px] font-semibold text-foreground">Leaderboard</span>
          </div>
          <div className="space-y-1">
            {lobby.map((userId) => {
              const p = participants.find((pp) => pp.user_id === userId);
              return (
                <div key={userId} className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">{p?.display_name || p?.username || "Player"}</span>
                  <span className="text-[12px] font-bold text-primary">{scores[userId] || 0}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => { setLaunched(false); setLobby([]); setScores({}); }}
            className="mt-3 w-full rounded-md bg-muted/40 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/70"
          >
            End activity
          </button>
        </div>
      ) : (
        <div className="mt-3">
          {/* Game selection */}
          <div className="grid grid-cols-2 gap-1.5">
            {GAMES.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelected(g.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg p-2 transition",
                  selected === g.id ? "bg-primary/20 ring-1 ring-primary/40" : "bg-muted/40 hover:bg-muted/70"
                )}
              >
                <span className="text-lg">{g.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{g.label}</span>
              </button>
            ))}
          </div>

          {/* Lobby */}
          {selected && (
            <div className="mt-3 border-t border-border pt-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-foreground">Lobby</span>
              </div>
              <div className="max-h-28 space-y-0.5 overflow-y-auto">
                {participants.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => toggleLobby(p.user_id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition",
                      lobby.includes(p.user_id) ? "bg-primary/15" : "hover:bg-muted/40"
                    )}
                  >
                    <span className={cn(
                      "grid h-4 w-4 place-items-center rounded border",
                      lobby.includes(p.user_id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                    )}>
                      {lobby.includes(p.user_id) && <span className="text-[8px]">✓</span>}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                      {p.display_name || p.username}{p.user_id === currentUserId && " (you)"}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={handleLaunch}
                disabled={lobby.length === 0}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-1.5 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <Play className="h-3 w-3" />
                Launch ({lobby.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}