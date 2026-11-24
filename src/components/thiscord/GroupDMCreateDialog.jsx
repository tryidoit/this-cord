import React, { useState, useEffect } from "react";
import { X, Search, Check, Users } from "lucide-react";
import { api } from "@/api/client";
import { useProfile } from "@/lib/ProfileContext";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function GroupDMCreateDialog({ onClose, onCreated }) {
  const { profile } = useProfile();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const page = await api.entities.Profile.filter({}, { sort: "created_date", limit: 300 });
        setPlayers((page?.items || []).filter((p) => p.created_by_id !== profile?.created_by_id));
      } catch { /* ignore */ }
    })();
  }, [profile?.created_by_id]);

  const toggle = (p) => {
    setSelected((prev) =>
      prev.find((s) => s.created_by_id === p.created_by_id)
        ? prev.filter((s) => s.created_by_id !== p.created_by_id)
        : prev.length >= 9 ? prev : [...prev, p]
    );
  };

  const create = async () => {
    const memberIds = [profile.created_by_id, ...selected.map((p) => p.created_by_id)];
    const memberNames = [profile.username, ...selected.map((p) => p.username)];
    const threadKey = `gdm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const groupName = name.trim() || selected.slice(0, 3).map((p) => p.display_name || p.username).join(", ");
    const created = await api.entities.GroupDM.create({
      name: groupName,
      owner_id: profile.created_by_id,
      owner_username: profile.username,
      member_user_ids: memberIds,
      member_usernames: memberNames,
      thread_key: threadKey,
    });
    onCreated?.(created);
    onClose();
  };

  const filtered = players.filter((p) =>
    !search || p.username.includes(search) || (p.display_name || "").includes(search)
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-[15px] font-bold text-foreground">New Group DM</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-4 pt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name (optional)"
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2">
            {selected.map((p) => (
              <span key={p.created_by_id} className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary">
                {p.display_name || p.username}
                <button onClick={() => toggle(p)} className="text-primary/70 hover:text-primary"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        <div className="px-4 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Add friends to the group"
              className="w-full rounded-lg border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-64 min-h-0 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">No players found.</p>
          ) : (
            filtered.map((p) => {
              const isSelected = !!selected.find((s) => s.created_by_id === p.created_by_id);
              return (
                <button
                  key={p.created_by_id}
                  onClick={() => toggle(p)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition",
                    isSelected ? "bg-primary/15" : "hover:bg-muted"
                  )}
                >
                  <ProfileAvatar avatarId={p.avatar_id} size={32} />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[12px] font-semibold text-foreground">{p.display_name || p.username}</p>
                    <p className="truncate text-[10px] text-muted-foreground">@{p.username}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-[11px] text-muted-foreground">{selected.length}/9 selected</p>
          <Button onClick={create} disabled={selected.length === 0}>
            <Users className="mr-1.5 h-4 w-4" /> Create Group
          </Button>
        </div>
      </div>
    </div>
  );
}