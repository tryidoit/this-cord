import React, { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Coins, RotateCcw, Trophy, Gamepad2 } from "lucide-react";
import { GAMES } from "@/pages/Games";
import VortexRun from "@/components/games/VortexRun";
import OrbitSlam from "@/components/games/OrbitSlam";
import SerpentArena from "@/components/games/SerpentArena";
import PrismStack from "@/components/games/PrismStack";
import NeonPong from "@/components/games/NeonPong";
import ColorMatch from "@/components/games/ColorMatch";
import ReactionRush from "@/components/games/ReactionRush";
import IntroOverlay from "@/components/thiscord/IntroOverlay";
import { useProfile } from "@/lib/ProfileContext";
import { api } from "@/api/client";
import { GAME_WIN_COINS, formatPoints, multiplierFor } from "@/lib/economy";

const COMPONENTS = {
  "vortex-run": VortexRun,
  "orbit-slam": OrbitSlam,
  "serpent-arena": SerpentArena,
  "prism-stack": PrismStack,
  "neon-pong": NeonPong,
  "color-match": ColorMatch,
  "reaction-rush": ReactionRush,
};

export default function GamePlayer() {
  const { gameId } = useParams();
  const { profile, config, setProfile } = useProfile();
  const game = GAMES.find((g) => g.id === gameId);
  const Game = COMPONENTS[gameId];

  const [phase, setPhase] = useState("intro");
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);
  const [earned, setEarned] = useState(0);

  const tokenRef = useRef(null);
  const startGame = useCallback(() => {
    tokenRef.current = null;
    api.economy.gameStart(gameId).then((r) => { tokenRef.current = r.token; }).catch(() => {});
  }, [gameId]);
  const finishRef = useRef(null);
  finishRef.current = async (outcome) => {
    setResult(outcome);
    if (outcome === "win" && profile) {
      const gain = Math.round(GAME_WIN_COINS * multiplierFor(profile, config));
      setEarned(gain);
      try {
        const { profile: updated, reward } = await api.economy.gameWin(gameId, tokenRef.current);
        if (updated) setProfile(updated);
        if (typeof reward === "number") setEarned(reward);
      } catch (err) {
        console.error(err);
      }
    }
  };
  const onFinish = useCallback((outcome) => finishRef.current?.(outcome), []);

  const replay = () => {
    setResult(null);
    setEarned(0);
    startGame();
    setPhase("playing");
    setRound((r) => r + 1);
  };

  if (!game || !Game) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background text-foreground">
        <Gamepad2 className="h-8 w-8 text-foreground/30" />
        <p className="text-sm text-foreground/50">That game doesn't exist.</p>
        <Link to="/games" className="rounded-xl bg-white/10 px-4 py-2 text-sm">Back to the arcade</Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {phase === "intro" && (
        <IntroOverlay label={`${game.title.toLowerCase()} · starting`} duration={1600} onDone={() => { startGame(); setPhase("playing"); }} />
      )}

      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] px-3">
        <Link to="/games" className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/[0.06] text-foreground/60 transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{game.title}</p>
          <p className="truncate text-[10px] uppercase tracking-widest text-foreground/30">{game.tagline}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-warning/25 bg-warning/10 px-2.5 py-1.5 text-xs font-bold text-warning">
          <Coins className="h-3.5 w-3.5" /> {formatPoints(profile)}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {phase === "playing" && !result && <Game key={round} onFinish={onFinish} />}

        {result && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/92 px-6 text-center backdrop-blur-md">
            <div
              className={`grid h-20 w-20 place-items-center rounded-3xl ${
                result === "win" ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"
              }`}
            >
              {result === "win" ? <Trophy className="h-9 w-9" /> : <RotateCcw className="h-9 w-9" />}
            </div>
            <h2 className="mt-5 font-display text-3xl font-extrabold">{result === "win" ? "Victory" : "Game over"}</h2>
            <p className="mt-1 text-sm text-foreground/45">
              {result === "win" ? "You beat the game." : "So close — run it back."}
            </p>
            {result === "win" && (
              <p className="mt-4 flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm font-bold text-warning">
                <Coins className="h-4 w-4" /> +{earned} coins
              </p>
            )}
            <div className="mt-7 flex gap-3">
              <button
                onClick={replay}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-teal-400 px-5 py-2.5 text-sm font-bold text-black"
              >
                <RotateCcw className="h-4 w-4" /> Play again
              </button>
              <Link to="/games" className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 transition hover:bg-foreground/5">
                Arcade
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}