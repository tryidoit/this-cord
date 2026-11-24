import React from "react";
import { Link } from "react-router-dom";
import { Plus, Store, Gamepad2, ShieldCheck, Trophy, Palette, Users, Settings, Inbox, Compass, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

function RailButton({ active, children, label, onClick, className, badge, mention }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "group relative grid h-12 w-12 place-items-center rounded-2xl text-lg transition-all duration-200 hover:rounded-xl",
        active
          ? "rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary))]"
          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {active && <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-foreground" />}
      {children}
      {badge > 0 && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-foreground ring-2 ring-sidebar",
            mention ? "bg-danger" : "bg-primary"
          )}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default function ServerRail({ servers, activeServerId, onSelectServer, onHome, isHome, onAddServer, onJoinServer, onDiscover, isAdmin, reportCount = 0, serverUnread = {}, totalUnread = 0, totalMentions = 0, onOpenInbox }) {
  return (
    <div className="flex h-full w-[74px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-border bg-sidebar py-3">
      <button
        onClick={onOpenInbox}
        title="Inbox"
        aria-label="Inbox"
        className="relative grid h-12 w-12 place-items-center rounded-2xl bg-muted/70 text-muted-foreground transition hover:rounded-xl hover:bg-muted hover:text-foreground"
      >
        <Inbox className="h-5 w-5" />
        {totalUnread > 0 && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-foreground ring-2 ring-sidebar",
              totalMentions > 0 ? "bg-danger" : "bg-primary"
            )}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      <Link to="/" onClick={onHome}>
        <RailButton active={isHome} label="Direct messages" onClick={onHome}>
          <span className="font-display text-[15px] font-extrabold tracking-tighter">TC</span>
        </RailButton>
      </Link>
      <div className="my-1 h-px w-7 bg-border" />

      {servers.map((server) => {
        const unread = serverUnread[server.id];
        return (
          <RailButton
            key={server.id}
            active={activeServerId === server.id && !isHome}
            label={server.name}
            onClick={() => onSelectServer(server)}
            className={activeServerId === server.id && !isHome ? "" : "text-xl"}
            badge={unread?.count || 0}
            mention={unread?.mention}
          >
            <span className="text-xl leading-none">{server.icon || "🛰️"}</span>
          </RailButton>
        );
      })}

      <button
        onClick={onAddServer}
        title="Create a server"
        aria-label="Create a server"
        className="grid h-12 w-12 place-items-center rounded-2xl border border-dashed border-border text-muted-foreground transition hover:rounded-xl hover:border-primary/60 hover:text-primary"
      >
        <Plus className="h-5 w-5" />
      </button>
      <button
        onClick={onJoinServer}
        title="Join a server"
        aria-label="Join a server"
        className="grid h-12 w-12 place-items-center rounded-2xl border border-dashed border-border text-muted-foreground transition hover:rounded-xl hover:border-primary/60 hover:text-primary"
      >
        <KeyRound className="h-5 w-5" />
      </button>
      <button
        onClick={onDiscover}
        title="Discover servers"
        aria-label="Discover servers"
        className="grid h-12 w-12 place-items-center rounded-2xl border border-dashed border-border text-muted-foreground transition hover:rounded-xl hover:border-primary/60 hover:text-primary"
      >
        <Compass className="h-5 w-5" />
      </button>

      <div className="mt-auto flex flex-col items-center gap-2 pt-4">
        <Link to="/friends" title="Friends">
          <RailButton label="Friends">
            <Users className="h-5 w-5 text-success" />
          </RailButton>
        </Link>
        <Link to="/leaderboard" title="Leaderboard">
          <RailButton label="Leaderboard">
            <Trophy className="h-5 w-5 text-warning" />
          </RailButton>
        </Link>
        <Link to="/shop" title="Avatar shop">
          <RailButton label="Avatar shop">
            <Store className="h-5 w-5" />
          </RailButton>
        </Link>
        <Link to="/games" title="Arcade">
          <RailButton label="Arcade">
            <Gamepad2 className="h-5 w-5" />
          </RailButton>
        </Link>
        <Link to="/appearance" title="Appearance">
          <RailButton label="Themes & sidebars">
            <Palette className="h-5 w-5 text-info" />
          </RailButton>
        </Link>
        <Link to="/settings" title="User settings">
          <RailButton label="User settings">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </RailButton>
        </Link>
        {isAdmin && (
          <Link to="/admin" title="Admin panel">
            <RailButton label="Admin panel">
              <ShieldCheck className="h-5 w-5 text-warning" />
              {reportCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-foreground">
                  {reportCount > 9 ? "9+" : reportCount}
                </span>
              )}
            </RailButton>
          </Link>
        )}
      </div>
    </div>
  );
}