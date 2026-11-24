import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Coins, Trophy, Play, Box, Target, CircleDot, Layers, Zap, Palette } from "lucide-react";
import IntroOverlay from "@/components/thiscord/IntroOverlay";
import { useProfile } from "@/lib/ProfileContext";
import { formatPoints } from "@/lib/economy";

export const GAMES = [
  {
    id: "vortex-run",
    title: "Vortex Run",
    tagline: "3D · dodge the neon grid",
    description: "Sprint down a neon corridor. Collect 12 energy cores while red blocks try to flatten you.",
    icon: Box,
    accent: "from-violet-500/30 to-fuchsia-500/10",
    ring: "border-violet-400/30",
    go: "text-primary",
  },
  {
    id: "orbit-slam",
    title: "Orbit Slam",
    tagline: "3D · precision clicking",
    description: "Twelve cores orbit a collapsing star. Shatter every one before the 45 second clock runs dry.",
    icon: Target,
    accent: "from-teal-400/30 to-sky-500/10",
    ring: "border-teal-300/30",
    go: "text-info",
  },
  {
    id: "prism-stack",
    title: "Prism Stack",
    tagline: "3D · timing tower",
    description: "Blocks slide overhead. Drop ten of them into a straight glowing tower without missing the edge.",
    icon: Layers,
    accent: "from-fuchsia-500/25 to-indigo-500/10",
    ring: "border-fuchsia-300/30",
    go: "text-primary",
  },
  {
    id: "serpent-arena",
    title: "Serpent Arena",
    tagline: "snake.io · outgrow the bots",
    description: "Classic grow-your-tail arena against two hungry bots. Reach 22 segments to take the win.",
    icon: CircleDot,
    accent: "from-warning/25 to-rose-500/10",
    ring: "border-warning/30",
    go: "text-warning",
  },
  {
    id: "neon-pong",
    title: "Neon Pong",
    tagline: "arcade · beat the AI",
    description: "Classic neon pong against a relentless AI. First to 7 points takes the win.",
    icon: Zap,
    accent: "from-cyan-400/25 to-violet-500/10",
    ring: "border-cyan-300/30",
    go: "text-info",
  },
  {
    id: "color-match",
    title: "Color Match",
    tagline: "memory · repeat the pattern",
    description: "Watch the tiles light up, then repeat the sequence. Reach 6 tiles to win.",
    icon: Palette,
    accent: "from-fuchsia-400/25 to-purple-500/10",
    ring: "border-fuchsia-300/30",
    go: "text-primary",
  },
  {
    id: "reaction-rush",
    title: "Reaction Rush",
    tagline: "reflexes · tap on green",
    description: "Wait for the green flash, then tap as fast as you can. Average under 400ms across 3 rounds wins.",
    icon: Target,
    accent: "from-emerald-400/25 to-teal-500/10",
    ring: "border-emerald-300/30",
    go: "text-success",
  },
];

export default function Games() {
  const { profile } = useProfile();
  const [intro, setIntro] = useState(true);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {intro && <IntroOverlay label="arcade · loading" onDone={() => setIntro(false)} />}

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-8 flex items-center gap-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/[0.06] text-foreground/60 transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Arcade</h1>
            <p className="text-[12px] text-foreground/35">Seven games · 8 coins per win</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-sm font-bold text-warning">
            <Coins className="h-4 w-4" /> {formatPoints(profile)}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              to={`/games/${game.id}`}
              className={`group relative overflow-hidden rounded-3xl border ${game.ring} bg-gradient-to-br ${game.accent} p-5 transition hover:-translate-y-1`}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
              <game.icon className={`h-7 w-7 ${game.go}`} />
              <h2 className="mt-4 font-display text-lg font-bold">{game.title}</h2>
              <p className="text-[11px] uppercase tracking-widest text-foreground/35">{game.tagline}</p>
              <p className="mt-3 min-h-[54px] text-[12px] leading-relaxed text-foreground/50">{game.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                  <Coins className="h-3.5 w-3.5" /> +8 per win
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-white/20">
                  <Play className="h-3.5 w-3.5 fill-white" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/20 py-3 text-[11px] text-foreground/35">
          <Trophy className="h-3.5 w-3.5" /> {profile?.games_won || 0} wins on This-Cord · 2× coin events double every payout
        </div>
      </div>
    </div>
  );
}