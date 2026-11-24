import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Target, Crown, BarChart3, Shield, User, Gamepad2, ShoppingBag } from "lucide-react";
import QuestsPanel from "@/components/economy/QuestsPanel";
import RoleShop from "@/components/economy/RoleShop";
import PlusSubscription from "@/components/economy/PlusSubscription";
import Tournaments from "@/components/economy/Tournaments";
import ServerAnalytics from "@/components/insights/ServerAnalytics";
import AdminOverview from "@/components/insights/AdminOverview";
import Wrapped from "@/components/insights/Wrapped";

export default function ExtraFeaturesPanel({ profile, applyProfile, config, activeServer, serverMembers, roles, isAdmin }) {
  const [tab, setTab] = useState("quests");

  const tabs = [
    { id: "quests", label: "Quests", icon: Target, section: "economy" },
    { id: "tournaments", label: "Tournaments", icon: Gamepad2, section: "economy" },
    { id: "roleshop", label: "Role Shop", icon: ShoppingBag, section: "economy" },
    { id: "plus", label: "Plus", icon: Crown, section: "economy" },
    { id: "analytics", label: "Analytics", icon: BarChart3, section: "insights" },
    { id: "wrapped", label: "Wrapped", icon: User, section: "insights" },
  ];
  if (isAdmin) tabs.push({ id: "admin", label: "Admin", icon: Shield, section: "insights" });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="mr-2 text-sm font-bold text-foreground">Extra Features</span>
        <div className="flex flex-1 flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <t.icon className="h-3 w-3" />
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "quests" && <QuestsPanel profile={profile} applyProfile={applyProfile} config={config} />}
        {tab === "tournaments" && <Tournaments serverId={activeServer?.id} profile={profile} applyProfile={applyProfile} isAdmin={isAdmin} />}
        {tab === "roleshop" && <RoleShop serverId={activeServer?.id} profile={profile} applyProfile={applyProfile} isAdmin={isAdmin} roles={roles} />}
        {tab === "plus" && <PlusSubscription profile={profile} applyProfile={applyProfile} />}
        {tab === "analytics" && <ServerAnalytics serverId={activeServer?.id} server={activeServer} />}
        {tab === "wrapped" && <Wrapped profile={profile} />}
        {tab === "admin" && isAdmin && <AdminOverview />}
      </div>
    </div>
  );
}