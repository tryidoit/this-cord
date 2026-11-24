import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { Trophy, Plus, Users, Coins, Swords, Trash2, Crown } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const GAMES = ["Neon Pong", "Color Match", "Vortex Run", "Prism Stack", "Reaction Rush", "Serpent Arena", "Orbit Slam"];

export default function Tournaments({ serverId, profile, applyProfile, isAdmin }) {
  const [tournaments, setTournaments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newT, setNewT] = useState({ game_name: GAMES[0], title: "", entry_fee: 0, max_participants: 8 });

  const load = useCallback(async () => {
    const page = await api.entities.Tournament.filter({ server_id: serverId }, { sort: "-created_date", limit: 50 });
    setTournaments(page?.items || []);
  }, [serverId]);

  useEffect(() => { load(); }, [load]);

  const createTournament = async () => {
    if (!newT.title.trim()) return;
    await api.entities.Tournament.create({
      server_id: serverId,
      game_name: newT.game_name,
      title: newT.title.trim(),
      entry_fee: newT.entry_fee,
      max_participants: newT.max_participants,
      prize_pool: 0,
      status: "open",
    });
    setNewT({ game_name: GAMES[0], title: "", entry_fee: 0, max_participants: 8 });
    setShowAdd(false);
    await load();
  };

  const join = async (t) => {
    if (!profile?.id) return;
    if ((t.participant_user_ids || []).includes(profile.created_by_id)) return;
    if ((t.participant_user_ids || []).length >= t.max_participants) {
      toast({ title: "Tournament full", variant: "destructive" });
      return;
    }
    if (t.entry_fee > 0 && (profile.points || 0) < t.entry_fee) {
      toast({ title: "Not enough coins", description: `Entry fee is ${t.entry_fee} coins`, variant: "destructive" });
      return;
    }
    // Deduct entry fee and add to prize pool
    if (t.entry_fee > 0) {
      const updated = await api.entities.Profile.update(profile.id, { points: (profile.points || 0) - t.entry_fee });
      applyProfile(updated);
    }
    await api.entities.Tournament.update(t.id, {
      participant_user_ids: [...(t.participant_user_ids || []), profile.created_by_id],
      participant_usernames: [...(t.participant_usernames || []), profile.username],
      prize_pool: (t.prize_pool || 0) + t.entry_fee,
    });
    await load();
    toast({ title: "Joined tournament!", description: `You're in! Prize pool is now ${(t.prize_pool || 0) + t.entry_fee} coins` });
  };

  const deleteT = async (id) => {
    await api.entities.Tournament.delete(id);
    await load();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
          <Trophy className="h-4 w-4 text-warning" /> Tournaments
        </h3>
        {isAdmin && (
          <button onClick={() => setShowAdd(!showAdd)} className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isAdmin && showAdd && (
        <div className="border-b border-border bg-card p-3 space-y-2">
          <input
            value={newT.title}
            onChange={(e) => setNewT({ ...newT, title: e.target.value })}
            placeholder="Tournament title"
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          />
          <select
            value={newT.game_name}
            onChange={(e) => setNewT({ ...newT, game_name: e.target.value })}
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          >
            {GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={newT.entry_fee}
              onChange={(e) => setNewT({ ...newT, entry_fee: Number(e.target.value) })}
              placeholder="Entry fee"
              className="flex-1 rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
            />
            <input
              type="number"
              value={newT.max_participants}
              onChange={(e) => setNewT({ ...newT, max_participants: Number(e.target.value) })}
              placeholder="Max players"
              className="flex-1 rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
            />
          </div>
          <button onClick={createTournament} className="rounded-lg bg-primary px-4 py-1.5 text-xs text-primary-foreground">Create tournament</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {tournaments.map((t) => {
            const joined = (t.participant_user_ids || []).includes(profile?.created_by_id);
            const full = (t.participant_user_ids || []).length >= t.max_participants;
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Swords className="h-3 w-3" /> {t.game_name}
                    </p>
                  </div>
                  {t.status === "completed" && t.winner_username && (
                    <span className="flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] text-warning">
                      <Crown className="h-2.5 w-2.5" /> @{t.winner_username}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {t.participant_user_ids?.length || 0}/{t.max_participants}</span>
                  <span className="flex items-center gap-0.5"><Coins className="h-3 w-3 text-warning" /> {t.prize_pool || 0}</span>
                  {t.entry_fee > 0 && <span>Entry: {t.entry_fee}</span>}
                </div>
                <div className="mt-2 flex gap-2">
                  {t.status === "open" && !joined && !full && (
                    <button onClick={() => join(t)} className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                      Join {t.entry_fee > 0 ? `(${t.entry_fee} coins)` : "Free"}
                    </button>
                  )}
                  {joined && <span className="flex-1 text-center text-xs text-success">✓ You're in!</span>}
                  {full && !joined && <span className="flex-1 text-center text-xs text-danger">Tournament full</span>}
                  {isAdmin && (
                    <button onClick={() => deleteT(t.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {tournaments.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Trophy className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No tournaments yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}