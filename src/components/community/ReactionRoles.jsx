import React, { useState } from "react";
import { api } from "@/api/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ReactionRoles({ server, community, channels }) {
  const { commands: _c, ...rest } = community;
  const reactionRoles = community.starboards?.filter((s) => s.role_id) || [];
  const [form, setForm] = useState({ emoji: "👍", role_id: "", role_name: "", channel_id: "", message_id: "" });

  const textChannels = channels?.filter((ch) => ch.type === "text" || ch.type === "announcement") || [];

  const create = async () => {
    if (!form.emoji.trim() || !form.role_id.trim()) {
      toast({ title: "Emoji and role ID are required", variant: "destructive" });
      return;
    }
    try {
      // Store reaction roles in ServerAutomation with feature "autorole" for now — actually use a dedicated approach
      // We'll store them in the ReactionRole entity
      await api.entities.ReactionRole.create({
        server_id: server.id,
        channel_id: form.channel_id,
        message_id: form.message_id || "manual",
        emoji: form.emoji.trim(),
        role_id: form.role_id.trim(),
        role_name: form.role_name.trim(),
        enabled: true,
      });
      setForm({ emoji: "👍", role_id: "", role_name: "", channel_id: "", message_id: "" });
      community.reload();
      toast({ title: "Reaction role created" });
    } catch { toast({ title: "Failed to create", variant: "destructive" }); }
  };

  const remove = async (id) => {
    try { await api.entities.ReactionRole.delete(id); community.reload(); toast({ title: "Removed" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  // Load reaction roles directly
  const [rrList, setRrList] = useState([]);
  React.useEffect(() => {
    if (!server?.id) return;
    api.entities.ReactionRole.filter({ server_id: server.id }, { limit: 100 })
      .then((r) => setRrList(r.items || []))
      .catch(() => {});
  }, [server?.id, community]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Reaction Roles</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Members react to a message to get a role. Configure emoji-to-role mappings.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Emoji
            <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Role ID
            <input value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Role Name
            <input value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Channel
            <select value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
              <option value="">Select channel</option>
              {textChannels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </label>
        </div>
        <button onClick={create} className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Reaction Role
        </button>
      </div>

      <div className="space-y-2">
        {rrList.length === 0 && <p className="text-[12px] text-muted-foreground">No reaction roles configured.</p>}
        {rrList.map((rr) => (
          <div key={rr.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
            <span className="text-2xl">{rr.emoji}</span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">{rr.role_name || rr.role_id}</p>
              <p className="text-[11px] text-muted-foreground">Role ID: {rr.role_id}</p>
            </div>
            {rr.enabled && <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium text-success">Active</span>}
            <button onClick={() => remove(rr.id)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}