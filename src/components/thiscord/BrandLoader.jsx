import React from "react";

// Branded loading state used while auth / profile data resolves.
export default function BrandLoader({ label = "loading" }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background">
      <div className="relative grid h-16 w-16 place-items-center rounded-[30%] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-teal-400 shadow-[0_0_50px_-8px_rgba(168,85,247,0.9)]">
        <span className="absolute inset-[-8px] animate-spin rounded-[34%] border border-white/20 border-t-white/70" />
        <span className="text-2xl font-black tracking-tighter text-foreground">TC</span>
      </div>
      <p className="font-display text-sm uppercase tracking-[0.36em] text-foreground/40">{label}</p>
    </div>
  );
}