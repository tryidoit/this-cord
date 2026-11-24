import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Save } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function AutomationPanel({ server, community, channels }) {
  const [welcome, setWelcome] = useState({ enabled: false, channel_id: "", message: "Welcome {user} to {server}! 🎉" });
  const [leave, setLeave] = useState({ enabled: false, channel_id: "", message: "{user} has left {server}. 👋" });
  const [autoRoles, setAutoRoles] = useState("");
  const [saving, setSaving] = useState(false);

  const textChannels = channels?.filter((ch) => ch.type === "text" || ch.type === "announcement") || [];

  useEffect(() => {
    if (!server?.id) return;
    (async () => {
      try {
        const [w, l, ar] = await Promise.all([
          api.entities.ServerAutomation.filter({ server_id: server.id, feature: "welcome" }, { limit: 1 }).then((r) => (r.items || [])[0]),
          api.entities.ServerAutomation.filter({ server_id: server.id, feature: "leave" }, { limit: 1 }).then((r) => (r.items || [])[0]),
          api.entities.ServerAutomation.filter({ server_id: server.id, feature: "autorole" }, { limit: 1 }).then((r) => (r.items || [])[0]),
        ]);
        if (w) setWelcome({ enabled: w.enabled, channel_id: w.channel_id || w.config?.channel_id || "", message: w.config?.message || "Welcome {user} to {server}! 🎉" });
        if (l) setLeave({ enabled: l.enabled, channel_id: l.channel_id || l.config?.channel_id || "", message: l.config?.message || "{user} has left {server}. 👋" });
        if (ar) setAutoRoles((ar.config?.role_ids || []).join(", "));
      } catch {}
    })();
  }, [server?.id]);

  const save = async () => {
    setSaving(true);
    try {
      const upsert = async (feature, data) => {
        const existing = await api.entities.ServerAutomation.filter({ server_id: server.id, feature }, { limit: 1 });
        const sa = (existing.items || [])[0];
        if (sa) await api.entities.ServerAutomation.update(sa.id, data);
        else await api.entities.ServerAutomation.create(data);
      };

      await upsert("welcome", { server_id: server.id, feature: "welcome", enabled: welcome.enabled, channel_id: welcome.channel_id, config: { message: welcome.message, channel_id: welcome.channel_id } });
      await upsert("leave", { server_id: server.id, feature: "leave", enabled: leave.enabled, channel_id: leave.channel_id, config: { message: leave.message, channel_id: leave.channel_id } });
      const roleIds = autoRoles.split(",").map((s) => s.trim()).filter(Boolean);
      await upsert("autorole", { server_id: server.id, feature: "autorole", enabled: roleIds.length > 0, config: { role_ids: roleIds } });

      community.reload();
      toast({ title: "Automation settings saved" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Welcome & Auto-Roles</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Automate welcome/leave messages and assign roles on join. Use {"{user}"} and {"{server}"} as placeholders.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={welcome.enabled} onChange={(e) => setWelcome({ ...welcome, enabled: e.target.checked })} className="h-4 w-4 accent-primary" />
          <span className="text-[13px] font-semibold text-foreground">Welcome Messages</span>
        </label>
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Welcome Channel
          <select value={welcome.channel_id} onChange={(e) => setWelcome({ ...welcome, channel_id: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
            <option value="">Select channel</option>
            {textChannels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
          </select>
        </label>
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Welcome Message
          <textarea value={welcome.message} onChange={(e) => setWelcome({ ...welcome, message: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground" />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={leave.enabled} onChange={(e) => setLeave({ ...leave, enabled: e.target.checked })} className="h-4 w-4 accent-primary" />
          <span className="text-[13px] font-semibold text-foreground">Leave Messages</span>
        </label>
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Leave Channel
          <select value={leave.channel_id} onChange={(e) => setLeave({ ...leave, channel_id: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
            <option value="">Select channel</option>
            {textChannels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
          </select>
        </label>
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Leave Message
          <textarea value={leave.message} onChange={(e) => setLeave({ ...leave, message: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground" />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
        <h4 className="text-[13px] font-semibold text-foreground">Auto-Roles</h4>
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Role IDs (comma-separated)
          <input value={autoRoles} onChange={(e) => setAutoRoles(e.target.value)} placeholder="role-id-1, role-id-2" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
        </label>
        <p className="text-[11px] text-muted-foreground">These roles are automatically suggested to new members on join.</p>
      </div>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save All"}
      </button>
    </div>
  );
}