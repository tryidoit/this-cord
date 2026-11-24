import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { Plus, Search, Link as LinkIcon, FileText, Trash2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Library({ channelId, serverId, username }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", url: "", description: "", tags: "", type: "link" });

  const load = useCallback(async () => {
    const page = await api.entities.LibraryItem.filter({ channel_id: channelId }, { sort: "-created_date", limit: 200 });
    setItems(page?.items || []);
  }, [channelId]);

  useEffect(() => {
    load();
    const unsub = api.entities.LibraryItem.subscribe(() => load());
    return unsub;
  }, [load]);

  const addItem = async () => {
    if (!newItem.title.trim()) return;
    await api.entities.LibraryItem.create({
      channel_id: channelId,
      server_id: serverId,
      title: newItem.title.trim(),
      url: newItem.url.trim(),
      description: newItem.description.trim(),
      type: newItem.type,
      tags: newItem.tags.split(",").map((t) => t.trim()).filter(Boolean),
      added_by_username: username,
    });
    setNewItem({ title: "", url: "", description: "", tags: "", type: "link" });
    setShowAdd(false);
    await load();
  };

  const deleteItem = async (id) => {
    await api.entities.LibraryItem.delete(id);
    await load();
  };

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.tags?.some((t) => t.toLowerCase().includes(q));
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library..."
            className="w-full rounded-lg border border-border bg-input py-1.5 pl-8 pr-3 text-sm text-foreground"
          />
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showAdd && (
        <div className="border-b border-border bg-card p-3">
          <div className="mb-2 flex gap-2">
            <button
              onClick={() => setNewItem({ ...newItem, type: "link" })}
              className={cn("rounded-lg px-3 py-1 text-xs", newItem.type === "link" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
            >
              Link
            </button>
            <button
              onClick={() => setNewItem({ ...newItem, type: "note" })}
              className={cn("rounded-lg px-3 py-1 text-xs", newItem.type === "note" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
            >
              Note
            </button>
          </div>
          <input
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="Title"
            className="mb-2 w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          />
          {newItem.type === "link" && (
            <input
              value={newItem.url}
              onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
              placeholder="URL"
              className="mb-2 w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
            />
          )}
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Description"
            rows={2}
            className="mb-2 w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          />
          <input
            value={newItem.tags}
            onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
            placeholder="Tags (comma separated)"
            className="mb-2 w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          />
          <button onClick={addItem} className="rounded-lg bg-primary px-4 py-1.5 text-xs text-primary-foreground">Add to library</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((item) => (
            <div key={item.id} className="group rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  {item.type === "link" ? <LinkIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-warning" />}
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground hover:text-primary">
                      {item.title}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                  )}
                </div>
                <button onClick={() => deleteItem(item.id)} className="opacity-0 transition group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
              {item.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
              {item.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((t, i) => (
                    <span key={i} className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      <Tag className="h-2 w-2" />{t}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground/60">by @{item.added_by_username}</p>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No items yet. Add links and notes to your library.</p>
          </div>
        )}
      </div>
    </div>
  );
}