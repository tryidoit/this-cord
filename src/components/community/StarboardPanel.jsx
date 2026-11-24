import React, { useState } from "react";
import { api } from "@/api/client";
import { Star, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function StarboardPanel({ server, community, channels }) {
  const { starboards, reload } = community;
  const [threshold, setThreshold] = useState(5);
  const [starboardChannelId, setStarboardChannelId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const textChannels = channels?.filter((ch) => ch.type === "text" || ch.type === "announcement") || [];

  React.useEffect(() => {
    if (!server?.id) return;
    api.entities.ServerAutomation.filter({ server_id: server.id, feature: "starboard" }, { limit: 1 })
      .then((r) => {
        const sa = (r.items || [])[0];
        if (sa) {
          setEnabled(sa.enabled);
          setThreshold(sa.config?.threshold || 5);
          setStarboardChannelId(sa.config?.starboard_channel_id || sa.channel_id || "");
        }
      })
      .catch(() => {});
  }, [server?.id]);

  const save = async () => {
    setSaving(true);
    try {
      const existing = await api.entities.ServerAutomation.filter({ server_id: server.id, feature: "starboard" }, { limit: 1 });
      const sa = (existing.items || [])[0];
      const data = { server_id: server.id, feature: "starboard", enabled, channel_id: starboardChannelId, config: { threshold: parseInt(threshold), starboard_channel_id: starboardChannelId } };
      if (sa) await api.entities.ServerAutomation.update(sa.id, data);
      else await api.entities.ServerAutomation.create(data);
      toast({ title: "Starboard settings saved" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await api.entities.Starboard.delete(id); reload(); toast({ title: "Removed from starboard" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Starboard</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Messages that receive enough star reactions get pinned to a starboard channel.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
          <span className="text-[13px] text-foreground">Enable starboard</span>
        </label>
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Starboard Channel
          <select value={starboardChannelId} onChange={(e) => setStarboardChannelId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
            <option value="">Select channel</option>
            {textChannels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
          </select>
        </label>
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Star Threshold
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} min={1} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
        </label>
        <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Starred Messages ({starboards.length})</h4>
        {starboards.length === 0 && <p className="text-[12px] text-muted-foreground">No starred messages yet.</p>}
        {starboards.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-[11px] font-semibold text-foreground">{s.star_count} stars</span>
              <span className="text-[11px] text-muted-foreground">by @{s.author_username}</span>
              <button onClick={() => remove(s.id)} className="ml-auto text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <p className="mt-2 text-[12px] text-foreground">{s.content?.slice(0, 200)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}