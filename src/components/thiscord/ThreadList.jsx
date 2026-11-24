import React, { useState, useMemo } from "react";
import {
  X,
  Pin,
  Lock,
  GitBranch,
  Users,
  Plus,
  Archive,
  Clock,
} from "lucide-react";
import { isThreadArchived, getArchiveTimeRemaining, ARCHIVE_DURATIONS } from "@/lib/channelTypes";
import { cn } from "@/lib/utils";

function formatTimeRemaining(ms) {
  if (ms <= 0) return "archived";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

export default function ThreadList({
  open,
  onClose,
  parentChannel,
  threads = [],
  currentUserId,
  onSelectThread,
  onCreateThread,
  onJoinThread,
  onLeaveThread,
  onLockThread,
  onPinThread,
  onUpdateThreadNotif,
  isAdmin,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [threadName, setThreadName] = useState("");
  const [threadType, setThreadType] = useState("public");
  const [archiveDuration, setArchiveDuration] = useState(1440);

  const sorted = useMemo(() => {
    return [...threads].sort((a, b) => {
      // Pinned threads first
      if (a.pinned_message_ids?.length && !b.pinned_message_ids?.length) return -1;
      if (!a.pinned_message_ids?.length && b.pinned_message_ids?.length) return 1;
      // Then by last activity
      const aTime = new Date(a.last_activity_at || a.created_date).getTime();
      const bTime = new Date(b.last_activity_at || b.created_date).getTime();
      return bTime - aTime;
    });
  }, [threads]);

  if (!open) return null;

  const handleCreate = async () => {
    const name = threadName.trim();
    if (!name) return;
    await onCreateThread?.({
      name,
      parent_channel_id: parentChannel.id,
      thread_type: threadType,
      auto_archive_duration: archiveDuration,
    });
    setThreadName("");
    setShowCreate(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Threads — #{parentChannel?.name}</h3>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {showCreate ? (
            <div className="mb-3 rounded-xl border border-border bg-background p-3">
              <input
                value={threadName}
                onChange={(e) => setThreadName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Thread name"
                autoFocus
                className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
              />
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => setThreadType("public")}
                  className={cn("flex-1 rounded-lg border px-2 py-1.5 text-[12px]", threadType === "public" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  Public
                </button>
                <button
                  onClick={() => setThreadType("private")}
                  className={cn("flex-1 rounded-lg border px-2 py-1.5 text-[12px]", threadType === "private" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  Private
                </button>
              </div>
              <select
                value={archiveDuration}
                onChange={(e) => setArchiveDuration(Number(e.target.value))}
                className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground focus:outline-none"
              >
                {ARCHIVE_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>Auto-archive: {d.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={!threadName.trim()} className="flex-1 rounded-lg bg-primary py-2 text-[12px] font-semibold text-primary-foreground disabled:opacity-50">
                  Create
                </button>
                <button onClick={() => setShowCreate(false)} className="rounded-lg bg-muted px-3 py-2 text-[12px] text-muted-foreground">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Create Thread
            </button>
          )}

          {sorted.length === 0 ? (
            <div className="mt-6 text-center">
              <GitBranch className="mx-auto h-6 w-6 text-muted-foreground/50" />
              <p className="mt-2 text-[12px] text-muted-foreground">No threads yet. Start one from a message or create a standalone thread.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sorted.map((thread) => {
                const archived = isThreadArchived(thread);
                const isMember = thread.thread_member_ids?.includes(currentUserId);
                const remaining = getArchiveTimeRemaining(thread);
                const isPrivate = thread.thread_type === "private";
                const isLocked = thread.locked;

                return (
                  <div
                    key={thread.id}
                    className={cn(
                      "group rounded-lg border p-2.5 transition",
                      archived ? "border-border bg-muted/30 opacity-60" : "border-border bg-background hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-foreground">{thread.name}</span>
                          {isPrivate && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                          {isLocked && <Lock className="h-3 w-3 shrink-0 text-danger" />}
                          {thread.pinned_message_ids?.length > 0 && <Pin className="h-3 w-3 shrink-0 text-warning" />}
                          {archived && <Archive className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" />
                            {thread.thread_member_ids?.length || 0}
                          </span>
                          {!archived && remaining > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {formatTimeRemaining(remaining)}
                            </span>
                          )}
                          {archived && <span className="text-warning">Archived</span>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1">
                      <button
                        onClick={() => onSelectThread?.(thread)}
                        className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted/80"
                      >
                        Open
                      </button>
                      {!isMember && !archived && (
                        <button
                          onClick={() => onJoinThread?.(thread)}
                          className="rounded-md bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/25"
                        >
                          Join
                        </button>
                      )}
                      {isMember && !archived && (
                        <button
                          onClick={() => onLeaveThread?.(thread)}
                          className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          Leave
                        </button>
                      )}
                      {(isAdmin || isMember) && !archived && (
                        <button
                          onClick={() => onLockThread?.(thread)}
                          className={cn("rounded-md px-2 py-1 transition", isLocked ? "text-danger" : "text-muted-foreground hover:text-foreground")}
                          title={isLocked ? "Unlock" : "Lock"}
                        >
                          <Lock className="h-3 w-3" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => onPinThread?.(thread)}
                          className={cn("rounded-md px-2 py-1 transition", thread.pinned_message_ids?.length ? "text-warning" : "text-muted-foreground hover:text-foreground")}
                          title="Pin thread"
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}