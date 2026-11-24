import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Coins, Search, Sparkles } from "lucide-react";
import AvatarCard from "@/components/shop/AvatarCard";
import { AVATARS, TIERS, countByTier } from "@/lib/avatars";
import { formatPoints, isInfinite } from "@/lib/economy";
import { useProfile } from "@/lib/ProfileContext";
import { api } from "@/api/client";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const PAGE = 60;

export default function Shop() {
  const { profile, setProfile } = useProfile();
  const [tier, setTier] = useState("all");
  const [onlyAnimated, setOnlyAnimated] = useState(false);
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [busy, setBusy] = useState(null);

  const owned = useMemo(() => new Set(profile?.owned_avatars || []), [profile]);
  const infinite = isInfinite(profile);
  const balance = profile?.points || 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AVATARS.filter((a) => {
      if (tier !== "all" && a.tier !== tier) return false;
      if (onlyAnimated && !a.animated) return false;
      if (onlyOwned && !owned.has(a.id)) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tier, onlyAnimated, onlyOwned, query, owned]);

  const buy = async (avatar) => {
    if (busy) return;
    const price = avatar.price;
    if (!infinite && balance < price) {
      toast({ title: "Not enough coins", description: `${price - balance} more coins needed.` });
      return;
    }
    setBusy(avatar.id);
    try {
      const updated = await api.entities.Profile.update(profile.id, {
        points: infinite ? profile.points || 0 : balance - price,
        owned_avatars: [...(profile.owned_avatars || []), avatar.id],
        avatar_id: avatar.id,
      });
      setProfile(updated);
      toast({ title: "Avatar unlocked", description: avatar.name });
    } catch (err) {
      toast({ title: "Purchase failed", description: err?.message || "Try again." });
    } finally {
      setBusy(null);
    }
  };

  const equip = async (avatarId) => {
    const updated = await api.entities.Profile.update(profile.id, { avatar_id: avatarId });
    setProfile(updated);
  };

  const results = filtered.slice(0, visible);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-xl bg-foreground/[0.06] text-foreground/60 transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold leading-tight">Avatar shop</h1>
            <p className="text-[11px] text-foreground/35">{(visible > filtered.length ? filtered.length : visible).toLocaleString()} of {filtered.length.toLocaleString()} · {AVATARS.length.toLocaleString()} total</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-sm font-bold text-warning">
            <Coins className="h-4 w-4" /> {formatPoints(profile)}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(PAGE);
                }}
                placeholder="Search every avatar"
                className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-8 pr-2 text-[13px] text-foreground placeholder:text-foreground/25 focus:border-primary/50 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setOnlyAnimated((v) => !v)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold transition",
                onlyAnimated ? "bg-info/20 text-info ring-1 ring-info/50" : "bg-foreground/5 text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" /> Animated
            </button>
            <button
              onClick={() => setOnlyOwned((v) => !v)}
              className={cn(
                "h-9 rounded-lg px-3 text-[12px] font-semibold transition",
                onlyOwned ? "bg-primary/20 text-primary ring-1 ring-primary/50" : "bg-foreground/5 text-muted-foreground hover:text-foreground"
              )}
            >
              Owned
            </button>
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => {
                setTier("all");
                setVisible(PAGE);
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                tier === "all" ? "bg-white text-black" : "bg-foreground/5 text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {countByTier().map((t) => (
              <button
                key={t.tier}
                onClick={() => {
                  setTier(t.tier);
                  setVisible(PAGE);
                }}
                className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition"
                style={
                  tier === t.tier
                    ? { backgroundColor: TIERS[t.tier].ring, color: "#08080D" }
                    : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }
                }
              >
                {t.label} · {t.count}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-5">
        {results.length === 0 ? (
          <p className="py-20 text-center text-sm text-foreground/35">Nothing matches that search.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((avatar) => (
              <AvatarCard
                key={avatar.id}
                avatar={avatar}
                owned={owned.has(avatar.id)}
                equipped={profile?.avatar_id === avatar.id}
                affordable={infinite || balance >= avatar.price}
                onBuy={buy}
                onEquip={equip}
              />
            ))}
          </div>
        )}

        {visible < filtered.length && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-5 py-2.5 text-sm font-semibold text-foreground/80 transition hover:bg-foreground/10"
            >
              Load more avatars
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-foreground/25">
          Rarer avatars cost more. Animated avatars cost 60% extra. Earn coins from daily logins, presence rewards and arcade wins.
          {infinite && <span className="ml-1 text-info">Infinite That is active — everything is free.</span>}
        </p>
      </div>
    </div>
  );
}