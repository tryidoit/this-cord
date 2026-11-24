import React, { useState } from "react";
import { api } from "@/api/client";
import { Plus, Trash2, Terminal, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function CustomCommands({ server, community }) {
  const { commands, reload } = community;
  const [form, setForm] = useState({ command_name: "", description: "", response_type: "text", content: "", embed_title: "", embed_description: "", embed_color: "#5865f2", embed_footer: "" });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!form.command_name.trim() || !form.content.trim()) {
      toast({ title: "Command name and content are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const name = form.command_name.trim().replace(/^\//, "");
      await api.entities.ServerCommand.create({
        server_id: server.id,
        command_name: name,
        description: form.description,
        response_type: form.response_type,
        content: form.content,
        embed_title: form.response_type === "embed" ? form.embed_title : "",
        embed_description: form.response_type === "embed" ? form.embed_description : "",
        embed_color: form.response_type === "embed" ? form.embed_color : "",
        embed_footer: form.response_type === "embed" ? form.embed_footer : "",
        enabled: true,
      });
      setForm({ command_name: "", description: "", response_type: "text", content: "", embed_title: "", embed_description: "", embed_color: "#5865f2", embed_footer: "" });
      reload();
      toast({ title: "Command created" });
    } catch (e) {
      toast({ title: "Failed to create command", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (cmd) => {
    try {
      await api.entities.ServerCommand.update(cmd.id, { enabled: !cmd.enabled });
      reload();
    } catch { toast({ title: "Failed to toggle", variant: "destructive" }); }
  };

  const remove = async (cmd) => {
    try {
      await api.entities.ServerCommand.delete(cmd.id);
      reload();
      toast({ title: "Command deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Custom Slash Commands</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Create text or embed responses. No code execution — responses are static or templated.</p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Command Name
            <input value={form.command_name} onChange={(e) => setForm({ ...form, command_name: e.target.value })} placeholder="mycommand" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Description
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this command does" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
        </div>
        <label className="mt-3 block text-[11px] font-semibold uppercase text-muted-foreground">
          Response Type
          <select value={form.response_type} onChange={(e) => setForm({ ...form, response_type: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground">
            <option value="text">Text</option>
            <option value="embed">Embed</option>
            <option value="template">Template</option>
          </select>
        </label>
        {form.response_type === "text" || form.response_type === "template" ? (
          <label className="mt-3 block text-[11px] font-semibold uppercase text-muted-foreground">
            {form.response_type === "template" ? "Template (use {user}, {server}, {channel})" : "Content"}
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground" placeholder="Hello {user}!" />
          </label>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
              Embed Title
              <input value={form.embed_title} onChange={(e) => setForm({ ...form, embed_title: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
            </label>
            <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
              Embed Description
              <textarea value={form.embed_description} onChange={(e) => setForm({ ...form, embed_description: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground" />
            </label>
            <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
              Embed Color (hex)
              <input value={form.embed_color} onChange={(e) => setForm({ ...form, embed_color: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
            </label>
            <label className="block text-[11px] font-semibold uppercase text-muted-foreground">
              Embed Footer
              <input value={form.embed_footer} onChange={(e) => setForm({ ...form, embed_footer: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
            </label>
          </div>
        )}
        <button onClick={create} disabled={saving} className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {saving ? "Creating..." : "Create Command"}
        </button>
      </div>

      <div className="space-y-2">
        {commands.length === 0 && <p className="text-[12px] text-muted-foreground">No custom commands yet.</p>}
        {commands.map((cmd) => (
          <div key={cmd.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground">/{cmd.command_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{cmd.description || cmd.content?.slice(0, 60)}</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">{cmd.response_type}</span>
            <button onClick={() => toggle(cmd)} className="text-muted-foreground transition hover:text-foreground" title={cmd.enabled ? "Enabled" : "Disabled"}>
              {cmd.enabled ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
            <button onClick={() => remove(cmd)} className="text-muted-foreground transition hover:text-danger" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}