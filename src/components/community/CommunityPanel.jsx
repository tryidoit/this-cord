import React, { useState } from "react";
import {
  Terminal, TrendingUp, Star, Gift, LifeBuoy, Bot, Lightbulb,
  Cake, Hash, Shield, X, Settings2,
} from "lucide-react";
import CustomCommands from "./CustomCommands";
import LevelingPanel from "./LevelingPanel";
import ReactionRoles from "./ReactionRoles";
import StarboardPanel from "./StarboardPanel";
import GiveawayPanel from "./GiveawayPanel";
import TicketPanel from "./TicketPanel";
import AutomationPanel from "./AutomationPanel";
import SuggestionPanel from "./SuggestionPanel";
import BirthdayPanel from "./BirthdayPanel";
import CountingPanel from "./CountingPanel";
import ModerationPanel from "./ModerationPanel";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "commands", label: "Custom Commands", icon: Terminal },
  { id: "leveling", label: "Leveling & XP", icon: TrendingUp },
  { id: "reactionroles", label: "Reaction Roles", icon: Bot },
  { id: "starboard", label: "Starboard", icon: Star },
  { id: "giveaways", label: "Giveaways", icon: Gift },
  { id: "tickets", label: "Tickets", icon: LifeBuoy },
  { id: "automation", label: "Welcome & Auto-Roles", icon: Settings2 },
  { id: "suggestions", label: "Suggestions", icon: Lightbulb },
  { id: "birthdays", label: "Birthdays", icon: Cake },
  { id: "counting", label: "Counting", icon: Hash },
  { id: "moderation", label: "Moderation", icon: Shield },
];

export default function CommunityPanel({
  open, onClose, server, community, channels, isAdmin, currentUserId, profile, serverMembers,
}) {
  const [tab, setTab] = useState("commands");

  if (!open || !server) return null;

  const sharedProps = { server, community, channels, isAdmin, currentUserId, profile, serverMembers };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="font-display text-sm font-bold text-foreground">Community Tools</h2>
            <p className="text-[11px] text-muted-foreground">{server.name}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Tab sidebar */}
          <div className="w-56 shrink-0 overflow-y-auto border-r border-border bg-background/50 p-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition",
                  tab === t.id ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {tab === "commands" && <CustomCommands {...sharedProps} />}
            {tab === "leveling" && <LevelingPanel {...sharedProps} />}
            {tab === "reactionroles" && <ReactionRoles {...sharedProps} />}
            {tab === "starboard" && <StarboardPanel {...sharedProps} />}
            {tab === "giveaways" && <GiveawayPanel {...sharedProps} />}
            {tab === "tickets" && <TicketPanel {...sharedProps} />}
            {tab === "automation" && <AutomationPanel {...sharedProps} />}
            {tab === "suggestions" && <SuggestionPanel {...sharedProps} />}
            {tab === "birthdays" && <BirthdayPanel {...sharedProps} />}
            {tab === "counting" && <CountingPanel {...sharedProps} />}
            {tab === "moderation" && <ModerationPanel {...sharedProps} />}
          </div>
        </div>
      </div>
    </div>
  );
}