import React, { useState } from "react";
import { api } from "@/api/client";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import RankCard from "./RankCard";

export default function LevelingPanel({ server, community, currentUserId, profile }) {
  const { levels, roleRewards, reload } = community;
  const [rewardForm, setRewardForm] = useState({ level_required: 5, role_id: "", role_name: "" });
  const [saving, setSaving] = useState(false);

  const myLevel = levels.find((l) => l.user_id === currentUserId);

  const createReward = async () => {
    if (!rewardForm.role_id.trim() || !rewardForm.role_name.trim()) {
      toast({ title: "Role ID and name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.entities.RoleReward.create({
        server_id: server.id,
        level_required: parseInt(rewardForm.level_required),
        role_id: rewardForm.role_id.trim(),
        role_name: rewardForm.role_name.trim(),
      });
      setRewardForm({ level_required: 5, role_id: "", role_name: "" });
      reload();
      toast({ title: "Role reward added" });
    } catch { toast({ title: "Failed to add reward", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const removeReward = async (reward) => {
    try {
      await api.entities.RoleReward.delete(reward.id);
      reload();
      toast({ title: "Reward removed" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Leveling & XP</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Members earn XP by chatting. Define role rewards for reaching levels.</p>
      </div>

      {myLevel && (
        <RankCard
          username={myLevel.username}
          display_name={profile?.display_name || myLevel.username}
          totalXp={myLevel.total_xp}
          level={myLevel.level}
          rankColor={myLevel.rank_color}
          rankTitle={myLevel.rank_title}
        />
      )}

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <h4 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Leaderboard</h4>
        <div className="space-y-1">
          {levels.length === 0 && <p className="text-[12px] text-muted-foreground">No XP earned yet.</p>}
          {levels.slice(0, 10).map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5" style={{ background: i < 3 ? "var(--primary)" : "transparent", backgroundBlendMode: i < 3 ? "overlay" : "normal" }}>
              <span className="w-6 text-center text-[13px] font-bold" style={{ color: i < 3 ? "var(--primary)" : "var(--muted-foreground)" }}>#{i + 1}</span>
              <span className="flex-1 truncate text-[13px] text-foreground">{l.username}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">Lv {l.level}</span>
              <span className="text-[11px] text-muted-foreground">{l.total_xp?.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <h4 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Role Rewards</h4>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Level
            <input type="number" value={rewardForm.level_required} onChange={(e) => setRewardForm({ ...rewardForm, level_required: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Role ID
            <input value={rewardForm.role_id} onChange={(e) => setRewardForm({ ...rewardForm, role_id: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Role Name
            <input value={rewardForm.role_name} onChange={(e) => setRewardForm({ ...rewardForm, role_name: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
        </div>
        <button onClick={createReward} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add Reward
        </button>
        <div className="mt-3 space-y-1">
          {roleRewards.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-[12px] text-foreground">Level {r.level_required} → <span className="font-semibold">{r.role_name}</span></span>
              <button onClick={() => removeReward(r)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}