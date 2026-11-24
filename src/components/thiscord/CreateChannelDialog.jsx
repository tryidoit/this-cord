import React, { useState } from "react";
import { X } from "lucide-react";
import { CHANNEL_TYPES, CHANNEL_TYPE_ORDER } from "@/lib/channelTypes";
import { cn } from "@/lib/utils";

export default function CreateChannelDialog({ open, onClose, onCreate, defaultCategoryId, serverHasCategories }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId || "");
  const [nsfw, setNsfw] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [slowmode, setSlowmode] = useState(0);
  const [guidelines, setGuidelines] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!trimmed) return;
    await onCreate?.({
      name: trimmed,
      type,
      topic: topic.trim() || undefined,
      category_id: categoryId || undefined,
      nsfw,
      is_private: isPrivate,
      slowmode,
      guidelines: type === "forum" ? guidelines.trim() || undefined : undefined,
    });
    setName("");
    setTopic("");
    setType("text");
    setNsfw(false);
    setIsPrivate(false);
    setSlowmode(0);
    setGuidelines("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-bold text-foreground">Create Channel</h3>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Channel Type</label>
            <div className="space-y-1">
              {CHANNEL_TYPE_ORDER.map((typeKey) => {
                const ct = CHANNEL_TYPES[typeKey];
                const Icon = ct.icon;
                return (
                  <button
                    key={typeKey}
                    onClick={() => setType(typeKey)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                      type === typeKey
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/60"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", ct.color)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-foreground">{ct.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{ct.description}</span>
                    </span>
                    <span className={cn("grid h-4 w-4 place-items-center rounded-full border", type === typeKey ? "border-primary bg-primary" : "border-border")}>
                      {type === typeKey && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Channel Name</label>
            <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-muted-foreground">
                {(() => {
                  const Icon = CHANNEL_TYPES[type].icon;
                  return <Icon className="h-4 w-4" />;
                })()}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="new-channel"
                autoFocus
                className="ml-2 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Topic (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What's this channel about?"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
          </div>

          {type === "forum" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Guidelines (optional)</label>
              <textarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                placeholder="Post guidelines for this forum channel…"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={nsfw}
                onChange={(e) => setNsfw(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-[13px] text-foreground">Age-Restricted Channel (NSFW)</span>
            </label>
            <label className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-[13px] text-foreground">Private Channel — limited to specific roles/members</span>
            </label>
          </div>

          {isPrivate && (
            <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
              You'll be able to add specific members in channel settings after creation.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="rounded-lg bg-muted px-4 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-muted/80">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="rounded-lg bg-primary px-5 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Create Channel
          </button>
        </div>
      </div>
    </div>
  );
}