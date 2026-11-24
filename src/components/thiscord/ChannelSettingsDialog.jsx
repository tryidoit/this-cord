import React, { useState, useEffect } from "react";
import { X, Trash2, Bell, BellOff, BellRing, Shield, AlertTriangle } from "lucide-react";
import { SLOWMODE_OPTIONS, getChannelType } from "@/lib/channelTypes";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "permissions", label: "Permissions" },
  { key: "invites", label: "Invites" },
  { key: "danger", label: "Danger Zone" },
];

export default function ChannelSettingsDialog({
  channel,
  server,
  members = [],
  roles = [],
  onClose,
  onUpdate,
  onDelete,
  onClone,
  onInvite,
}) {
  const [tab, setTab] = useState("overview");
  const [name, setName] = useState(channel?.name || "");
  const [topic, setTopic] = useState(channel?.topic || "");
  const [slowmode, setSlowmode] = useState(channel?.slowmode || 0);
  const [nsfw, setNsfw] = useState(channel?.nsfw || false);
  const [isPrivate, setIsPrivate] = useState(channel?.is_private || false);
  const [guidelines, setGuidelines] = useState(channel?.guidelines || "");
  const [notifLevel, setNotifLevel] = useState(channel?.notification_level || "all");
  const [nsfwConfirmed, setNsfwConfirmed] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [overrides, setOverrides] = useState([]);

  useEffect(() => {
    if (!channel) return;
    setName(channel.name || "");
    setTopic(channel.topic || "");
    setSlowmode(channel.slowmode || 0);
    setNsfw(channel.nsfw || false);
    setIsPrivate(channel.is_private || false);
    setGuidelines(channel.guidelines || "");
    setNotifLevel(channel.notification_level || "all");
    setNsfwConfirmed(channel.nsfw || false);
  }, [channel]);

  if (!channel) return null;

  const handleSave = async () => {
    const updates = {
      name: name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || channel.name,
      topic: topic.trim(),
      slowmode: Number(slowmode) || 0,
      nsfw: nsfw,
      is_private: isPrivate,
      guidelines: channel.type === "forum" ? guidelines.trim() : undefined,
    };
    await onUpdate?.(channel.id, updates);
    onClose();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    await onDelete?.(channel.id);
    onClose();
  };

  const handleClone = async () => {
    await onClone?.(channel.id);
    onClose();
  };

  const handleInvite = async () => {
    const member = members.find((m) => m.username === inviteUsername.trim());
    if (!member) return;
    await onInvite?.(channel.id, member);
    setInviteUsername("");
  };

  const ct = getChannelType(channel.type);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <ct.icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Edit Channel: {channel.name}</h3>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="w-40 shrink-0 border-r border-border p-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "mb-0.5 block w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium transition",
                  tab === t.key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {tab === "overview" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Channel Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Topic</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Slowmode</label>
                  <select
                    value={slowmode}
                    onChange={(e) => setSlowmode(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
                  >
                    {SLOWMODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {channel.type === "forum" && (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Guidelines</label>
                    <textarea
                      value={guidelines}
                      onChange={(e) => setGuidelines(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 cursor-pointer">
                    <input type="checkbox" checked={nsfw} onChange={(e) => {
                      setNsfw(e.target.checked);
                      if (e.target.checked) setNsfwConfirmed(false);
                    }} className="h-4 w-4 rounded border-border" />
                    <span className="text-[13px] text-foreground">Age-Restricted Channel (NSFW)</span>
                  </label>

                  {nsfw && !nsfwConfirmed && (
                    <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
                        <p className="flex-1 text-[12px] text-danger">This channel will be restricted to users who confirm they are 18+.</p>
                      </div>
                      <button
                        onClick={() => setNsfwConfirmed(true)}
                        className="mt-2 w-full rounded-lg bg-danger/20 py-1.5 text-[12px] font-semibold text-danger transition hover:bg-danger/30"
                      >
                        I understand — enable NSFW
                      </button>
                    </div>
                  )}

                  <label className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 cursor-pointer">
                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-4 w-4 rounded border-border" />
                    <span className="text-[13px] text-foreground">Private Channel — only invited members can see it</span>
                  </label>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notification Level</label>
                  <div className="flex gap-1">
                    {[
                      { key: "all", label: "All Messages", icon: Bell },
                      { key: "mentions", label: "Mentions Only", icon: BellRing },
                      { key: "none", label: "Nothing", icon: BellOff },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setNotifLevel(opt.key)}
                          className={cn(
                            "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition",
                            notifLevel === opt.key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted/60"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {tab === "permissions" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-[13px] font-bold text-foreground">Permission Overrides</h4>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Manage which roles and members can access this channel. Add or remove members from the access list below.
                </p>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Members with access ({channel.member_user_ids?.length || 0})</label>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
                    {members.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-muted-foreground">No members in this server yet.</p>
                    ) : (
                      members.map((m) => (
                        <div key={m.id || m.user_id} className="flex items-center gap-2 rounded px-2 py-1">
                          <span className="flex-1 truncate text-[12px] text-foreground">{m.username}</span>
                          {channel.member_user_ids?.includes(m.user_id) && (
                            <span className="text-[10px] font-semibold text-success">✓ Access</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Add member to channel</label>
                  <div className="flex gap-2">
                    <input
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="username"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
                    />
                    <button onClick={handleInvite} disabled={!inviteUsername.trim()} className="rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground disabled:opacity-50">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "invites" && (
              <div className="space-y-3">
                <h4 className="text-[13px] font-bold text-foreground">Invite to Channel</h4>
                <p className="text-[11px] text-muted-foreground">Share this link to invite members to the channel. Only server members can join.</p>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Invite link</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-muted/60 px-2 py-1 text-[11px] text-foreground">
                      {window.location.origin}/?server={channel.server_id}&channel={channel.id}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(`${window.location.origin}/?server=${channel.server_id}&channel=${channel.id}`);
                      }}
                      className="rounded-lg bg-muted px-3 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-muted/80"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "danger" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="text-[13px] font-bold text-foreground">Clone Channel</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground">Create a copy of this channel with the same settings.</p>
                  <button
                    onClick={handleClone}
                    className="mt-3 rounded-lg bg-muted px-4 py-2 text-[12px] font-semibold text-foreground transition hover:bg-muted/80"
                  >
                    Clone Channel
                  </button>
                </div>

                <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                  <h4 className="flex items-center gap-2 text-[13px] font-bold text-danger">
                    <AlertTriangle className="h-4 w-4" /> Delete Channel
                  </h4>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    This will permanently delete the channel and all its messages. This cannot be undone.
                  </p>
                  <button
                    onClick={handleDelete}
                    className={cn(
                      "mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition",
                      deleteConfirm
                        ? "bg-danger text-primary-foreground hover:bg-danger/90"
                        : "bg-danger/20 text-danger hover:bg-danger/30"
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteConfirm ? "Click again to confirm deletion" : "Delete Channel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {tab === "overview" && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <button onClick={onClose} className="rounded-lg bg-muted px-4 py-2 text-[12px] font-medium text-muted-foreground">
              Cancel
            </button>
            <button onClick={handleSave} className="rounded-lg bg-primary px-5 py-2 text-[12px] font-semibold text-primary-foreground">
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}