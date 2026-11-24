import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Coins, Lock, RefreshCw, Globe } from "lucide-react";

const ICONS = [
  "🛰️", "🎮", "🔥", "🌌", "⚡", "🎧", "🕹️", "🧿", "💎", "🚀",
  "🐍", "🦊", "🐙", "🦋", "🌿", "🍄", "🌊", "🌙", "☄️", "🪐",
  "👾", "🤖", "🎯", "🎲", "🎨", "🎬", "🏆", "💀", "🕯️", "🪄",
];

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function NewServerModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [description, setDescription] = useState("");
  const [joinCost, setJoinCost] = useState(0);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [inviteCode, setInviteCode] = useState(randomCode());
  const [discoverable, setDiscoverable] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: name.trim().slice(0, 32),
        icon,
        description: description.trim().slice(0, 200),
        join_cost: Math.max(0, Math.round(Number(joinCost) || 0)),
        invite_only: inviteOnly,
        invite_code: inviteOnly ? inviteCode : undefined,
        discoverable,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-border bg-card p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Create a server</h2>
            <p className="mt-1 text-xs text-muted-foreground">Your server, your community.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-1.5">
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={`grid h-10 place-items-center rounded-xl text-lg transition ${icon === i ? "bg-primary/25 ring-1 ring-primary" : "bg-muted/60 hover:bg-muted"}`}
            >
              {i}
            </button>
          ))}
        </div>

        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Server name"
          maxLength={32}
          className="mt-4 h-11"
        />

        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's your server about? (optional)"
          maxLength={200}
          className="mt-3 h-11"
        />

        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Coins className="h-3 w-3" /> Entry cost (coins)
          </label>
          <input
            type="number"
            min={0}
            value={joinCost}
            onChange={(e) => setJoinCost(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:border-primary/60 focus:outline-none"
          />
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            0 means the server is free to enter. Set a price and members pay it once.
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
              <Lock className="h-3 w-3" /> Invite only
            </span>
            <button
              type="button"
              onClick={() => setInviteOnly((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition ${inviteOnly ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${inviteOnly ? "left-4" : "left-0.5"}`} />
            </button>
          </label>
          {inviteOnly && (
            <div className="mt-2">
              <p className="text-[10.5px] text-muted-foreground">Share this code with people you want to invite:</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 8))}
                  className="h-9 font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setInviteCode(randomCode())}
                  title="Generate new code"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
              <Globe className="h-3 w-3" /> Discoverable
            </span>
            <button
              type="button"
              onClick={() => setDiscoverable((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition ${discoverable ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${discoverable ? "left-4" : "left-0.5"}`} />
            </button>
          </label>
          <p className="mt-1.5 text-[10.5px] text-muted-foreground">
            Show this server in Discovery so anyone can find and join it.
          </p>
        </div>

        <Button onClick={submit} disabled={saving || !name.trim()} className="mt-4 h-11 w-full font-semibold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create server"}
        </Button>
      </motion.div>
    </div>
  );
}