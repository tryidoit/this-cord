import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { Bookmark, Folder, Plus, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookmarksPanel({ profile }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState(["default"]);
  const [activeFolder, setActiveFolder] = useState("default");
  const [newFolder, setNewFolder] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (!profile?.created_by_id) return;
    try {
      const page = await api.entities.MessageBookmark.filter(
        {},
        { sort: "-created_date", limit: 100 }
      );
      const items = page?.items || [];
      setBookmarks(items);
      const fset = new Set(["default"]);
      items.forEach((b) => { if (b.folder) fset.add(b.folder); });
      setFolders([...fset]);
    } catch { /* ignore */ }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const filtered = bookmarks
    .filter((b) => (activeFolder === "all" ? true : (b.folder || "default") === activeFolder))
    .filter((b) => !query || (b.content_snapshot || "").toLowerCase().includes(query.toLowerCase()));

  const addFolder = () => {
    if (!newFolder.trim() || folders.includes(newFolder.trim())) return;
    setFolders([...folders, newFolder.trim()]);
    setNewFolder("");
  };

  const removeBookmark = async (id) => {
    await api.entities.MessageBookmark.delete(id);
    await load();
  };

  const moveBookmark = async (id, folder) => {
    await api.entities.MessageBookmark.update(id, { folder });
    await load();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Bookmark className="h-4 w-4 text-primary" /> Bookmarks
        </h4>
      </div>

      <div className="flex gap-1 border-b border-border px-2 py-1.5">
        <button
          onClick={() => setActiveFolder("all")}
          className={cn("rounded-lg px-2 py-1 text-xs font-medium transition",
            activeFolder === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
        >
          All
        </button>
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFolder(f)}
            className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition",
              activeFolder === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            <Folder className="h-3 w-3" /> {f === "default" ? "General" : f}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 border-b border-border p-2">
        <input
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder="New folder..."
          className="flex-1 rounded-lg border border-border bg-input px-2 py-1 text-xs text-foreground"
        />
        <button onClick={addFolder} className="rounded-lg bg-primary p-1.5 text-primary-foreground">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full rounded-lg border border-border bg-input py-1 pl-7 pr-2 text-xs text-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1.5">
          {filtered.map((b) => (
            <div key={b.id} className="rounded-lg border border-border bg-card p-2.5">
              <p className="line-clamp-2 text-xs text-foreground">{b.content_snapshot || "(empty)"}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <select
                  value={b.folder || "default"}
                  onChange={(e) => moveBookmark(b.id, e.target.value)}
                  className="rounded border border-border bg-input px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {folders.map((f) => <option key={f} value={f}>{f === "default" ? "General" : f}</option>)}
                </select>
                <button
                  onClick={() => removeBookmark(b.id)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Bookmark className="h-6 w-6 text-muted-foreground/50" />
              <p className="mt-2 text-xs text-muted-foreground">No bookmarks yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}