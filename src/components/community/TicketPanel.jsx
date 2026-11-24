import React, { useState } from "react";
import { api } from "@/api/client";
import { Plus, Download, Trash2, MessageSquare } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function TicketPanel({ server, community, channels, currentUserId, profile }) {
  const { tickets, reload } = community;
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [channelId, setChannelId] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");

  const textChannels = channels?.filter((ch) => ch.type === "text") || [];

  const create = async () => {
    if (!subject.trim()) { toast({ title: "Subject is required", variant: "destructive" }); return; }
    try {
      const count = await api.entities.Ticket.count({ server_id: server.id });
      await api.entities.Ticket.create({
        server_id: server.id,
        channel_id: channelId || undefined,
        ticket_number: (count || 0) + 1,
        user_id: currentUserId,
        username: profile?.username || "user",
        subject: subject.trim(),
        priority,
        status: "open",
        transcript: `Ticket opened by ${profile?.username || "user"}: ${subject.trim()}\n`,
      });
      setSubject("");
      reload();
      toast({ title: "Ticket created" });
    } catch { toast({ title: "Failed to create ticket", variant: "destructive" }); }
  };

  const addReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    try {
      const ts = new Date().toLocaleString();
      const entry = `[${ts}] ${profile?.username || "user"}: ${reply.trim()}\n`;
      await api.entities.Ticket.update(selectedTicket.id, { transcript: (selectedTicket.transcript || "") + entry });
      setReply("");
      const updated = await api.entities.Ticket.get(selectedTicket.id);
      setSelectedTicket(updated);
      reload();
    } catch { toast({ title: "Failed to reply", variant: "destructive" }); }
  };

  const closeTicket = async (ticket) => {
    try {
      const ts = new Date().toLocaleString();
      const entry = `[${ts}] Ticket closed by ${profile?.username || "admin"}\n`;
      await api.entities.Ticket.update(ticket.id, { status: "closed", closed_at: new Date().toISOString(), transcript: (ticket.transcript || "") + entry });
      if (selectedTicket?.id === ticket.id) setSelectedTicket(null);
      reload();
      toast({ title: "Ticket closed" });
    } catch { toast({ title: "Failed to close", variant: "destructive" }); }
  };

  const downloadTranscript = (ticket) => {
    const blob = new Blob([ticket.transcript || "No transcript available."], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${ticket.ticket_number || ticket.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (ticket) => {
    try { await api.entities.Ticket.delete(ticket.id); if (selectedTicket?.id === ticket.id) setSelectedTicket(null); reload(); toast({ title: "Ticket deleted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Support Tickets</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Private support channels with downloadable transcripts.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-[11px] font-semibold uppercase text-muted-foreground">
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Channel (optional)
            <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
              <option value="">None</option>
              {textChannels.map((ch) => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </label>
        </div>
        <button onClick={create} className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Open Ticket
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">All Tickets</h4>
          {tickets.length === 0 && <p className="text-[12px] text-muted-foreground">No tickets.</p>}
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setSelectedTicket(t)} className={`w-full rounded-lg border p-3 text-left transition ${selectedTicket?.id === t.id ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-muted/50"}`}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">#{t.ticket_number || t.id.slice(-4)}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${t.status === "open" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${t.priority === "high" ? "bg-danger/20 text-danger" : t.priority === "medium" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>{t.priority}</span>
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-foreground">{t.subject}</p>
              <p className="text-[10px] text-muted-foreground">by @{t.username}</p>
            </button>
          ))}
        </div>

        {selectedTicket && (
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-foreground">#{selectedTicket.ticket_number || selectedTicket.id.slice(-4)} — {selectedTicket.subject}</h4>
              <button onClick={() => downloadTranscript(selectedTicket)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <Download className="h-3.5 w-3.5" /> Transcript
              </button>
            </div>
            <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-background p-2 text-[11px] text-muted-foreground">
              <pre className="whitespace-pre-wrap font-sans">{selectedTicket.transcript || "No transcript."}</pre>
            </div>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." rows={2} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground" />
            <div className="mt-2 flex gap-2">
              <button onClick={addReply} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"><MessageSquare className="h-3 w-3" /> Reply</button>
              {selectedTicket.status === "open" && <button onClick={() => closeTicket(selectedTicket)} className="rounded-lg bg-danger/20 px-3 py-1.5 text-[11px] font-semibold text-danger">Close</button>}
              <button onClick={() => remove(selectedTicket)} className="ml-auto text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}