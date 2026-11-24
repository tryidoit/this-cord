import React, { useEffect } from "react";
import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], desc: "Quick switcher" },
  { keys: ["Ctrl", "/"], desc: "Show keyboard shortcuts" },
  { keys: ["Alt", "↑"], desc: "Previous channel" },
  { keys: ["Alt", "↓"], desc: "Next channel" },
  { keys: ["Alt", "Shift", "↑"], desc: "Previous unread channel" },
  { keys: ["Alt", "Shift", "↓"], desc: "Next unread channel" },
  { keys: ["Esc"], desc: "Mark current channel as read" },
  { keys: ["Ctrl", "Shift", "I"], desc: "Open inbox" },
  { keys: ["Ctrl", "F"], desc: "Search messages" },
];

export default function KeyboardShortcuts({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-display text-[14px] font-bold text-foreground">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1 p-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted">
              <span className="text-[13px] text-foreground">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Global keyboard shortcut handler. Returns null (renders nothing).
 * Manages Alt+Up/Down (channel navigation), Alt+Shift+Up/Down (unread navigation),
 * Esc (mark read), Ctrl+K (quick switcher), Ctrl+/ (shortcuts), Ctrl+Shift+I (inbox), Ctrl+F (search).
 */
export function useKeyboardShortcuts({
  channels,
  selection,
  onSelectChannel,
  onMarkRead,
  onOpenQuickSwitcher,
  onOpenShortcuts,
  onOpenInbox,
  onOpenSearch,
  unreadChannelIds,
}) {
  useEffect(() => {
    const handler = (e) => {
      // Ctrl/Cmd+K — Quick switcher
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenQuickSwitcher();
        return;
      }
      // Ctrl/Cmd+/ — Shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        onOpenShortcuts();
        return;
      }
      // Ctrl+Shift+I — Inbox
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        onOpenInbox();
        return;
      }
      // Ctrl+F — Search (only when not in an input)
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          onOpenSearch();
        }
        return;
      }
      // Esc — mark current channel as read
      if (e.key === "Escape" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          if (selection?.type === "channel") {
            onMarkRead(selection.channel.id);
          }
          return;
        }
      }
      // Alt+Up/Down — channel navigation
      if (e.altKey && !e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        if (selection?.type !== "channel" || channels.length === 0) return;
        const currentIdx = channels.findIndex((c) => c.id === selection.channel?.id);
        if (currentIdx === -1) return;
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx = (currentIdx + dir + channels.length) % channels.length;
        const next = channels[nextIdx];
        if (next) onSelectChannel(next, next.server_id);
        return;
      }
      // Alt+Shift+Up/Down — unread navigation
      if (e.altKey && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        if (!unreadChannelIds?.length || channels.length === 0) return;
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const currentIdx = channels.findIndex((c) => c.id === selection?.channel?.id);
        // Find next unread after current position
        const sorted = [...channels];
        let foundIdx = -1;
        for (let i = 1; i <= sorted.length; i++) {
          const idx = (currentIdx + dir * i + sorted.length) % sorted.length;
          if (unreadChannelIds.includes(sorted[idx].id)) {
            foundIdx = idx;
            break;
          }
        }
        if (foundIdx >= 0) onSelectChannel(sorted[foundIdx], sorted[foundIdx].server_id);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [channels, selection, onSelectChannel, onMarkRead, onOpenQuickSwitcher, onOpenShortcuts, onOpenInbox, onOpenSearch, unreadChannelIds]);
}