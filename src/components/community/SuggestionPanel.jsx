import React, { useState } from "react";
import { api } from "@/api/client";
import { Lightbulb, ThumbsUp, ThumbsDown, Check, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function SuggestionPanel({ server, community, currentUserId, profile }) {
  const { suggestions, reload } = community;
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!content.trim()) { toast({ title: "Suggestion cannot be empty", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await api.entities.Suggestion.create({
        server_id: server.id,
        user_id: currentUserId,
        username: profile?.username || "user",
        content: content.trim(),
        status: "pending",
        upvote_user_ids: [],
        downvote_user_ids: [],
      });
      setContent("");
      reload();
      toast({ title: "Suggestion submitted" });
    } catch { toast({ title: "Failed to submit", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const vote = async (sugg, type) => {
    const upKey = "upvote_user_ids";
    const downKey = "downvote_user_ids";
    let up = [...(sugg.upvote_user_ids || [])];
    let down = [...(sugg.downvote_user_ids || [])];
    if (type === "up") {
      if (up.includes(currentUserId)) { up = up.filter((id) => id !== currentUserId); }
      else { up.push(currentUserId); down = down.filter((id) => id !== currentUserId); }
    } else {
      if (down.includes(currentUserId)) { down = down.filter((id) => id !== currentUserId); }
      else { down.push(currentUserId); up = up.filter((id) => id !== currentUserId); }
    }
    try { await api.entities.Suggestion.update(sugg.id, { [upKey]: up, [downKey]: down }); reload(); }
    catch { toast({ title: "Failed to vote", variant: "destructive" }); }
  };

  const setStatus = async (sugg, status) => {
    try { await api.entities.Suggestion.update(sugg.id, { status }); reload(); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const STATUS_COLORS = {
    pending: "bg-muted text-muted-foreground",
    approved: "bg-success/20 text-success",
    denied: "bg-danger/20 text-danger",
    implemented: "bg-primary/20 text-primary",
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Suggestion Box</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Members submit ideas. Upvote/downvote and admin review.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your suggestion..." rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground" />
        <button onClick={create} disabled={saving} className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
          <Lightbulb className="h-4 w-4" /> {saving ? "Submitting..." : "Submit Suggestion"}
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.length === 0 && <p className="text-[12px] text-muted-foreground">No suggestions yet.</p>}
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-background/50 p-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}>{s.status}</span>
              <span className="text-[11px] text-muted-foreground">by @{s.username}</span>
            </div>
            <p className="mt-2 text-[13px] text-foreground">{s.content}</p>
            {s.admin_response && <p className="mt-1 rounded-lg bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">Admin: {s.admin_response}</p>}
            <div className="mt-2 flex items-center gap-3">
              <button onClick={() => vote(s, "up")} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition ${s.upvote_user_ids?.includes(currentUserId) ? "bg-success/20 text-success" : "text-muted-foreground hover:bg-muted"}`}>
                <ThumbsUp className="h-3.5 w-3.5" /> {s.upvote_user_ids?.length || 0}
              </button>
              <button onClick={() => vote(s, "down")} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition ${s.downvote_user_ids?.includes(currentUserId) ? "bg-danger/20 text-danger" : "text-muted-foreground hover:bg-muted"}`}>
                <ThumbsDown className="h-3.5 w-3.5" /> {s.downvote_user_ids?.length || 0}
              </button>
              <div className="ml-auto flex gap-1">
                <button onClick={() => setStatus(s, "approved")} title="Approve" className="rounded-lg p-1 text-muted-foreground hover:bg-success/20 hover:text-success"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => setStatus(s, "denied")} title="Deny" className="rounded-lg p-1 text-muted-foreground hover:bg-danger/20 hover:text-danger"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}