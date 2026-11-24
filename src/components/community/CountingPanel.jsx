import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Hash, Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function CountingPanel({ server, community, channels, currentUserId, profile }) {
  const { countingGames, reload } = community;
  const [channelId, setChannelId] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [guess, setGuess] = useState("");

  const textChannels = channels?.filter((ch) => ch.type === "text") || [];

  // Auto-select first game
  useEffect(() => {
    if (countingGames.length > 0 && !selectedGame) setSelectedGame(countingGames[0]);
  }, [countingGames, selectedGame]);

  const create = async () => {
    if (!channelId) { toast({ title: "Select a channel", variant: "destructive" }); return; }
    try {
      await api.entities.CountingGame.create({
        server_id: server.id,
        channel_id: channelId,
        current_number: 0,
        last_user_id: "",
        last_username: "",
        high_score: 0,
        broken_count: 0,
      });
      reload();
      toast({ title: "Counting game created" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const submit = async () => {
    if (!selectedGame || !guess.trim()) return;
    const num = parseInt(guess.trim());
    if (isNaN(num)) { toast({ title: "Enter a number", variant: "destructive" }); return; }

    const expected = selectedGame.current_number + 1;
    const isSameUser = selectedGame.last_user_id === currentUserId;

    if (isSameUser) {
      toast({ title: "You can't count twice in a row!", variant: "destructive" });
      setGuess("");
      return;
    }

    if (num === expected) {
      const newNumber = expected;
      const newHigh = Math.max(selectedGame.high_score, newNumber);
      try {
        await api.entities.CountingGame.update(selectedGame.id, {
          current_number: newNumber,
          last_user_id: currentUserId,
          last_username: profile?.username || "user",
          high_score: newHigh,
          high_score_user: newHigh > selectedGame.high_score ? currentUserId : selectedGame.high_score_user,
          high_score_username: newHigh > selectedGame.high_score ? (profile?.username || "user") : selectedGame.high_score_username,
        });
        setGuess("");
        reload();
        if (newHigh > selectedGame.high_score) toast({ title: `New high score: ${newHigh}!` });
      } catch { toast({ title: "Failed", variant: "destructive" }); }
    } else {
      // Wrong number — reset
      try {
        await api.entities.CountingGame.update(selectedGame.id, {
          current_number: 0,
          last_user_id: "",
          last_username: "",
          broken_count: (selectedGame.broken_count || 0) + 1,
        });
        setGuess("");
        reload();
        toast({ title: `Wrong! Expected ${expected}, got ${num}. Count reset.`, variant: "destructive" });
      } catch { toast({ title: "Failed", variant: "destructive" }); }
    }
  };

  const remove = async (g) => {
    try { await api.entities.CountingGame.delete(g.id); setSelectedGame(null); reload(); toast({ title: "Removed" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Counting Game</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Members count up by 1. Can't count twice in a row. Wrong number resets the count.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
          Channel
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
            <option value="">Select channel</option>
            {textChannels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
          </select>
        </label>
        <button onClick={create} className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Create Game
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {countingGames.map((g) => {
          const ch = channels?.find((c) => c.id === g.channel_id);
          return (
            <button key={g.id} onClick={() => setSelectedGame(g)} className={`rounded-lg border p-3 text-left transition ${selectedGame?.id === g.id ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-muted/50"}`}>
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[13px] font-medium text-foreground">{ch?.name || "Unknown"}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Current: <span className="font-bold text-foreground">{g.current_number}</span></p>
              <p className="text-[11px] text-muted-foreground">High score: {g.high_score}</p>
            </button>
          );
        })}
      </div>

      {selectedGame && (
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-foreground">Count: {selectedGame.current_number}</h4>
            <button onClick={() => remove(selectedGame)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="number" value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder={`Enter ${selectedGame.current_number + 1}`} className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
            <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground">Submit</button>
          </div>
          {selectedGame.high_score > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2">
              <Trophy className="h-4 w-4 text-warning" />
              <span className="text-[12px] font-semibold text-warning">High Score: {selectedGame.high_score} by @{selectedGame.high_score_username}</span>
            </div>
          )}
          {selectedGame.last_username && <p className="mt-2 text-[11px] text-muted-foreground">Last counted by @{selectedGame.last_username}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">Times broken: {selectedGame.broken_count || 0}</p>
        </div>
      )}
    </div>
  );
}