import React from "react";
import { Check, Coins, Lock, Play } from "lucide-react";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { TIERS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export default function AvatarCard({ avatar, owned, equipped, affordable, onBuy, onEquip }) {
  const tier = TIERS[avatar.tier];
  const price = avatar.price;

  return (
    <div
      className="group relative flex flex-col items-center rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
      style={{ boxShadow: equipped ? `0 0 0 1px ${tier.ring}, 0 18px 40px -30px ${tier.glow}` : undefined }}
    >
      <div className="relative">
        <ProfileAvatar avatarId={avatar.id} size={92} />
        {avatar.animated && (
          <span className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-background/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-info backdrop-blur">
            <Play className="h-2 w-2 fill-teal-300" /> anim
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-2 h-8 text-center text-[11px] font-medium leading-4 text-foreground/75">{avatar.name}</p>

      <span
        className="mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
        style={{ color: tier.ring, backgroundColor: `${tier.ring}1F` }}
      >
        {tier.label}
      </span>

      <div className="mt-2 w-full">
        {owned ? (
          equipped ? (
            <div className="flex h-8 items-center justify-center gap-1 rounded-lg bg-success/15 text-[11px] font-semibold text-success">
              <Check className="h-3.5 w-3.5" /> Equipped
            </div>
          ) : (
            <button
              onClick={() => onEquip(avatar.id)}
              className="h-8 w-full rounded-lg bg-foreground/10 text-[11px] font-semibold text-foreground transition hover:bg-foreground/20"
            >
              Equip
            </button>
          )
        ) : (
          <button
            onClick={() => onBuy(avatar)}
            className={cn(
              "flex h-8 w-full items-center justify-center gap-1 rounded-lg text-[11px] font-bold transition",
              affordable
                ? "bg-gradient-to-r from-amber-300 to-amber-500 text-black hover:opacity-90"
                : "bg-foreground/[0.06] text-muted-foreground/70"
            )}
          >
            {!affordable && <Lock className="h-3 w-3" />}
            <Coins className="h-3 w-3" />
            {price.toLocaleString()}
          </button>
        )}
      </div>
    </div>
  );
}