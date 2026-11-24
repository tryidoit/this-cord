import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.20),transparent_65%)] blur-2xl" />
        <div className="absolute -bottom-52 right-[-10%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.13),transparent_65%)] blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[30%] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-teal-400 shadow-[0_0_44px_-8px_rgba(168,85,247,0.9)]">
            <Icon className="h-6 w-6 text-foreground" aria-hidden="true" />
          </div>
          <p className="font-display text-[11px] uppercase tracking-[0.42em] text-primary/70">This-Cord</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-3xl border border-border bg-card/90 p-7 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
          {children}
        </div>
        {footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        )}
      </div>
    </div>
  );
}