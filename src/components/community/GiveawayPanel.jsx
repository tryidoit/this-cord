import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Gift, Plus, Trash2, Users, Trophy } from "lucide-react";
import { pickGiveawayWinners, generateSeed } from "@/lib/giveawayRng";
import { toast } from "@/components/ui/use-toast";

export default function GiveawayPanel({ server, community, channels, currentUserId }) {
  const { giveaways, reload } = community;
  const [form, setForm] = useState({ title: "", description: "", prize: "", channel_id: "", duration_hours: 24, winner_count: 1 });
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  const textChannels = channels?.filter((ch) => ch.type === "text" || ch.type === "announcement") || [];

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const create = async () => {
    if (!form.title.trim() || !form.channel_id) {
      toast({ title: "Title and channel are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const ends_at = new Date(Date.now() + parseInt(form.duration_hours) * 3600000).toISOString();
      const seed = generateSeed();
      await api.entities.Giveaway.create({
        server_id: server.id,
        channel_id: form.channel_id,
        title: form.title.trim(),
        description: form.description,
        prize: form.prize || form.title,
        ends_at,
        winner_count: parseInt(form.winner_count) || 1,
        participant_user_ids: [],
        ended: false,
        winner_ids: [],
        winner_usernames: [],
        seed,
      });
      setForm({ title: "", description: "", prize: "", channel_id: "", duration_hours: 24, winner_count: 1 });
      reload();
      toast({ title: "Giveaway created" });
    } catch { toast({ title: "Failed to create giveaway", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const join = async (g) => {
    if (g.ended) return;
    if (g.participant_user_ids?.includes(currentUserId)) {
      toast({ title: "Already entered!", desc: "You're in the draw." });
      return;
    }
    try {
      const updated = [...(g.participant_user_ids || []), currentUserId];
      await api.entities.Giveaway.update(g.id, { participant_user_ids: updated });
      reload();
    } catch { toast({ title: "Failed to join", variant: "destructive" }); }
  };

  const endGiveaway = async (g) => {
    try {
      const winnerIds = pickGiveawayWinners(g.participant_user_ids || [], g.winner_count || 1, g.seed);
      await api.entities.Giveaway.update(g.id, { ended: true, winner_ids: winnerIds });
      reload();
      toast({ title: `Giveaway ended! ${winnerIds.length} winner(s) picked.` });
    } catch { toast({ title: "Failed to end giveaway", variant: "destructive" }); }
  };

  const remove = async (g) => {
    try { await api.entities.Giveaway.delete(g.id); reload(); toast({ title: "Giveaway deleted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const formatTimeLeft = (endsAt) => {
    const diff = new Date(endsAt).getTime() - now;
    if (diff <= 0) return "Ended";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Giveaways</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Winners are picked deterministically — any client with the seed computes the same result.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Prize
            <input value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Channel
            <select value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
              <option value="">Select</option>
              {textChannels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Duration (hours)
            <input type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Winner Count
            <input type="number" value={form.winner_count} onChange={(e) => setForm({ ...form, winner_count: e.target.value })} min={1} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
        </div>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={2} className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground" />
        <button onClick={create} disabled={saving} className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {saving ? "Creating..." : "Create Giveaway"}
        </button>
      </div>

      <div className="space-y-2">
        {giveaways.length === 0 && <p className="text-[12px] text-muted-foreground">No giveaways yet.</p>}
        {giveaways.map((g) => {
          const timeLeft = formatTimeLeft(g.ends_at);
          const shouldEnd = !g.ended && timeLeft === "Ended";
          return (
            <div key={g.id} className="rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-start gap-3">
                <Gift className="mt-0.5 h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14px] font-bold text-foreground">{g.title}</h4>
                  {g.description && <p className="mt-1 text-[12px] text-muted-foreground">{g.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {g.participant_user_ids?.length || 0} entered</span>
                    <span className={`font-semibold ${g.ended ? "text-muted-foreground" : "text-success"}`}>{g.ended ? "Ended" : timeLeft}</span>
                    <span>Winners: {g.winner_count}</span>
                  </div>
                  {g.ended && g.winner_ids?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-warning/10 px-2 py-1">
                      <Trophy className="h-3.5 w-3.5 text-warning" />
                      <span className="text-[11px] font-semibold text-warning">Winner(s): {g.winner_ids.join(", ")}</span>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    {!g.ended && !shouldEnd && (
                      <button onClick={() => join(g)} className="rounded-lg bg-success/20 px-3 py-1.5 text-[11px] font-semibold text-success transition hover:bg-success/30">
                        {g.participant_user_ids?.includes(currentUserId) ? "✓ Entered" : "Join Giveaway"}
                      </button>
                    )}
                    {!g.ended && shouldEnd && (
                      <button onClick={() => endGiveaway(g)} className="rounded-lg bg-danger/20 px-3 py-1.5 text-[11px] font-semibold text-danger transition hover:bg-danger/30">
                        Pick Winners
                      </button>
                    )}
                    <button onClick={() => remove(g)} className="rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}