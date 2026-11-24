import React, { useState } from "react";
import { api } from "@/api/client";
import { Shield, AlertTriangle, Clock, Trash2, Ban, UserX, Hammer } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ModerationPanel({ server, community, serverMembers }) {
  const { modActions, reload } = community;
  const [form, setForm] = useState({ target_username: "", action_type: "warn", reason: "", duration_minutes: 10, message_count: 10 });
  const [saving, setSaving] = useState(false);

  const members = serverMembers || [];
  const ACTION_ICONS = { warn: AlertTriangle, timeout: Clock, purge: Trash2, kick: UserX, ban: Ban };

  const submit = async () => {
    if (!form.target_username.trim() || !form.reason.trim()) {
      toast({ title: "Target username and reason are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const actor = (await api.auth.me())?.full_name || "admin";
      await api.entities.ModerationAction.create({
        server_id: server.id,
        actor_username: actor,
        target_username: form.target_username.trim(),
        action_type: form.action_type,
        reason: form.reason.trim(),
        duration_minutes: form.action_type === "timeout" ? parseInt(form.duration_minutes) : undefined,
        message_count: form.action_type === "purge" ? parseInt(form.message_count) : undefined,
      });
      setForm({ target_username: "", action_type: "warn", reason: "", duration_minutes: 10, message_count: 10 });
      reload();
      toast({ title: `${form.action_type} action logged` });
    } catch { toast({ title: "Failed to log action", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Moderation</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Log moderation actions. Use /warn, /timeout, /purge in chat or use the form below.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Target
            <input list="member-list" value={form.target_username} onChange={(e) => setForm({ ...form, target_username: e.target.value })} placeholder="@username" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
            <datalist id="member-list">
              {members.map((m) => <option key={m.id} value={m.username} />)}
            </datalist>
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Action
            <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
              <option value="warn">Warn</option>
              <option value="timeout">Timeout</option>
              <option value="purge">Purge</option>
              <option value="kick">Kick</option>
              <option value="ban">Ban</option>
            </select>
          </label>
          {form.action_type === "timeout" && (
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Duration (minutes)
              <input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
            </label>
          )}
          {form.action_type === "purge" && (
            <label className="text-[11px] font-semibold uppercase text-muted-foreground">
              Message Count
              <input type="number" value={form.message_count} onChange={(e) => setForm({ ...form, message_count: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
            </label>
          )}
        </div>
        <label className="mt-3 block text-[11px] font-semibold uppercase text-muted-foreground">
          Reason
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for action" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
        </label>
        <button onClick={submit} disabled={saving} className="mt-3 flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-[12px] font-semibold text-danger-foreground transition hover:bg-danger/90 disabled:opacity-50">
          <Hammer className="h-4 w-4" /> {saving ? "Logging..." : "Log Action"}
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Moderation Log ({modActions.length})</h4>
        {modActions.length === 0 && <p className="text-[12px] text-muted-foreground">No actions logged.</p>}
        {modActions.map((a) => {
          const Icon = ACTION_ICONS[a.action_type] || Shield;
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
              <Icon className={`h-4 w-4 ${a.action_type === "ban" ? "text-danger" : a.action_type === "warn" ? "text-warning" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="text-[12px] text-foreground">
                  <span className="font-semibold">{a.actor_username}</span> → <span className="font-semibold">{a.target_username}</span>
                  {" "}({a.action_type}{a.duration_minutes ? ` ${a.duration_minutes}m` : ""}{a.message_count ? ` ${a.message_count} msgs` : ""})
                </p>
                <p className="text-[11px] text-muted-foreground">{a.reason}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{new Date(a.created_date).toLocaleDateString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}