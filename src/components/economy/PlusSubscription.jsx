import React, { useState } from "react";
import { Sparkles, Check, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { PLUS_COST, PLUS_BENEFITS, isPlus, plusDaysRemaining, purchasePlus } from "@/lib/plus";
import { formatCoins } from "@/lib/economy";

export default function PlusSubscription({ profile, applyProfile }) {
  const [purchasing, setPurchasing] = useState(false);
  const active = isPlus(profile);
  const daysLeft = plusDaysRemaining(profile);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await purchasePlus(profile, applyProfile);
      toast({ title: "ThisCord Plus activated! 🎉", description: "Enjoy your premium benefits for 30 days" });
    } catch (e) {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    }
    setPurchasing(false);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-4 flex flex-col items-center text-center">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", active ? "bg-warning/20" : "bg-primary/20")}>
            {active ? <Crown className="h-8 w-8 text-warning" /> : <Sparkles className="h-8 w-8 text-primary" />}
          </div>
          <h2 className="mt-3 font-display text-xl font-bold text-foreground">ThisCord Plus</h2>
          {active ? (
            <p className="text-sm text-success">Active · {daysLeft} days remaining</p>
          ) : (
            <p className="text-sm text-muted-foreground">Unlock premium features with coins</p>
          )}
        </div>

        {/* Benefits */}
        <div className="mb-4 space-y-2">
          {PLUS_BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="text-xl">{b.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
              <Check className="h-4 w-4 text-success" />
            </div>
          ))}
        </div>

        {/* CTA */}
        {!active && (
          <button
            onClick={handlePurchase}
            disabled={purchasing || (profile?.points || 0) < PLUS_COST}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
            Activate for {formatCoins({ points: PLUS_COST })} coins / month
          </button>
        )}
        {!active && (profile?.points || 0) < PLUS_COST && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            You need {(PLUS_COST - (profile?.points || 0)).toLocaleString()} more coins
          </p>
        )}
      </div>
    </div>
  );
}