import React, { useState } from "react";
import { Bell, BellOff, Moon, Star, Bookmark, Download, CheckCheck, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/api/client";
import BookmarksPanel from "@/components/productivity/BookmarksPanel";
import RemindersPanel from "@/components/productivity/RemindersPanel";

export default function ProductivityPanel({ profile, applyProfile, channels, servers, onMarkAllRead, onExportChannel, selection }) {
  const [tab, setTab] = useState("quiet");

  if (!profile) return null;

  const updateProfile = async (data) => {
    const updated = await api.entities.Profile.update(profile.id, data);
    applyProfile(updated);
  };

  const toggleFavorite = (id) => {
    const favs = profile.favorites || [];
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    updateProfile({ favorites: next });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {[
          { id: "quiet", label: "Quiet Hours", icon: Moon },
          { id: "focus", label: "Focus Mode", icon: BellOff },
          { id: "favorites", label: "Favorites", icon: Star },
          { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
          { id: "reminders", label: "Reminders", icon: BellRing },
          { id: "export", label: "Export", icon: Download },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "quiet" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Quiet Hours</h4>
              <p className="text-xs text-muted-foreground">Mute all notifications during these hours.</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Start</label>
                <input
                  type="time"
                  value={profile.quiet_hours_start || ""}
                  onChange={(e) => updateProfile({ quiet_hours_start: e.target.value })}
                  className="mt-1 block rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End</label>
                <input
                  type="time"
                  value={profile.quiet_hours_end || ""}
                  onChange={(e) => updateProfile({ quiet_hours_end: e.target.value })}
                  className="mt-1 block rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground"
                />
              </div>
            </div>
            {profile.quiet_hours_start && profile.quiet_hours_end && (
              <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                Notifications muted from {profile.quiet_hours_start} to {profile.quiet_hours_end}
              </p>
            )}
          </div>
        )}

        {tab === "focus" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Focus Mode</h4>
              <p className="text-xs text-muted-foreground">Mute everything except chosen channels and people.</p>
            </div>
            <button
              onClick={() => updateProfile({ focus_mode: !profile.focus_mode })}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border p-3 transition",
                profile.focus_mode ? "border-primary bg-primary/10" : "border-border bg-card"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                {profile.focus_mode ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                {profile.focus_mode ? "Focus mode is ON" : "Focus mode is OFF"}
              </span>
              <span className={cn("h-5 w-9 rounded-full p-0.5 transition", profile.focus_mode ? "bg-primary" : "bg-muted")}>
                <span className={cn("block h-4 w-4 rounded-full bg-white transition", profile.focus_mode ? "translate-x-4" : "")} />
              </span>
            </button>
            {profile.focus_mode && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Whitelisted channels:</p>
                {channels.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={(profile.focus_whitelist || []).includes(ch.id)}
                      onChange={() => {
                        const wl = profile.focus_whitelist || [];
                        const next = wl.includes(ch.id) ? wl.filter((w) => w !== ch.id) : [...wl, ch.id];
                        updateProfile({ focus_whitelist: next });
                      }}
                      className="rounded border-border"
                    />
                    #{ch.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "favorites" && (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Favorites</h4>
              <p className="text-xs text-muted-foreground">Star your favorite servers and channels for quick access.</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Servers</p>
              {servers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleFavorite(s.id)}
                  className="flex w-full items-center justify-between rounded-lg p-2 hover:bg-muted"
                >
                  <span className="text-sm text-foreground">{s.icon} {s.name}</span>
                  <Star className={cn("h-4 w-4", (profile.favorites || []).includes(s.id) ? "fill-warning text-warning" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Channels</p>
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => toggleFavorite(ch.id)}
                  className="flex w-full items-center justify-between rounded-lg p-2 hover:bg-muted"
                >
                  <span className="text-sm text-foreground">#{ch.name}</span>
                  <Star className={cn("h-4 w-4", (profile.favorites || []).includes(ch.id) ? "fill-warning text-warning" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "bookmarks" && (
          <BookmarksPanel profile={profile} />
        )}

        {tab === "reminders" && (
          <RemindersPanel profile={profile} />
        )}

        {tab === "export" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Export & Mark Read</h4>
              <p className="text-xs text-muted-foreground">Download conversation history or mark everything as read.</p>
            </div>
            <button
              onClick={onMarkAllRead}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <CheckCheck className="h-4 w-4 text-success" />
              Mark everything as read
            </button>
            {selection?.type === "channel" && (
              <button
                onClick={() => onExportChannel?.()}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <Download className="h-4 w-4 text-primary" />
                Export #{selection.channel.name}
              </button>
            )}
            {selection?.type === "dm" && (
              <button
                onClick={() => onExportChannel?.()}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <Download className="h-4 w-4 text-primary" />
                Export DM with @{selection.peer.username}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}