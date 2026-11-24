import React, { useState } from "react";
import { Gift, X, Loader2, ShieldAlert } from "lucide-react";
import { api } from "@/api/client";
import { useProfile } from "@/lib/ProfileContext";
import { isInfinite, formatCoins, transferLimitFor } from "@/lib/economy";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { toast } from "@/components/ui/use-toast";

const QUICK = [25, 100, 500, 1000];

export default function GiftDialog({ player, onClose }) {
  const { profile, config, setProfile } = useProfile();
  const [amount, setAmount] = useState(player?._presetAmount || 100);
  const [note, setNote] = useState(player?._presetNote || "");
  const [sending, setSending] = useState(false);
  const balance = profile?.points || 0;
  const limit = transferLimitFor(profile, config);
  const overLimit = !isInfinite(profile) && Number(amount) > limit;

  const send = async () => {
    const value = Math.round(Number(amount) || 0);
    if (value <= 0) return;
    if (!isInfinite(profile) && value > balance) {
      toast({ title: "Not enough coins", description: `You have ${formatCoins(profile)} coins.`, variant: "destructive" });
      return;
    }
    if (!isInfinite(profile) && value > limit) {
      toast({ title: "Transfer limit", description: `You can send up to ${limit.toLocaleString()} coins per gift.`, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { profile: updated } = await api.economy.gift(player.created_by_id, value, note.trim().slice(0, 120));
      if (updated) setProfile(updated);
      toast({ title: `Sent ${value} coins`, description: `@${player.username} gets it the moment they're online.` });
      onClose?.();
    } catch (err) {
      toast({ title: "Gift failed", description: err?.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-warning" />
            <p className="font-display text-sm font-bold text-foreground">Gift coins</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted/50 p-2.5">
          <ProfileAvatar avatarId={player.avatar_id} size={34} glow={false} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{player.display_name || player.username}</p>
            <p className="truncate text-[11px] text-muted-foreground">@{player.username}</p>
          </div>
        </div>

        <label className="mt-4 block text-[10px] uppercase tracking-widest text-muted-foreground">Amount</label>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none"
        />
        <div className="mt-2 flex gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              className="flex-1 rounded-lg bg-muted py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-primary/20 hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          maxLength={120}
          className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
        />

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Balance: <span className="font-semibold text-warning">{formatCoins(profile)} coins</span></span>
          <span>Limit: <span className="font-semibold text-foreground">{limit.toLocaleString()}</span></span>
        </div>

        {overLimit && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-danger/10 px-2.5 py-1.5 text-[11px] font-medium text-danger">
            <ShieldAlert className="h-3 w-3" /> Exceeds your transfer limit of {limit.toLocaleString()} coins
          </div>
        )}

        <button
          type="button"
          onClick={send}
          disabled={sending || overLimit}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-warning py-2.5 text-[13px] font-bold text-warning-foreground transition hover:bg-warning active:scale-[0.99] disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} Send gift
        </button>
      </div>
    </div>
  );
}