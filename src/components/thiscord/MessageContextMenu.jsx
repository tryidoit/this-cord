import React, { useEffect, useRef } from "react";
import { Flag, Trash2, Pencil, Reply, Copy, Link2, Hash, Bookmark, Pin, Forward, Mail, GitBranch } from "lucide-react";

export default function MessageContextMenu({
  x, y, canDelete, canEdit, canPin, onClose,
  onReport, onDelete, onEdit, onReply, onCopyText, onCopyLink, onCopyId,
  onMarkUnread, onBookmark, onPin, onForward, onCreateThread,
}) {
  const ref = useRef(null);
  // Stable refs so listeners are subscribed once — prevents missed outside-clicks
  // and duplicate menus when the parent re-renders.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCloseRef.current();
    };
    const handleEsc = (e) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Keyboard shortcut: R to reply when menu is open
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        onReplyRef.current?.();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const style = {
    left: Math.min(x || 0, window.innerWidth - 210),
    top: Math.max(8, (y || 0) - 200),
  };

  const items = [
    onReply && { icon: Reply, label: "Reply", onClick: () => { onReply(); onClose(); }, color: "text-foreground" },
    onCreateThread && { icon: GitBranch, label: "Create Thread", onClick: () => { onCreateThread(); onClose(); }, color: "text-foreground" },
    onForward && { icon: Forward, label: "Forward", onClick: () => { onForward(); onClose(); }, color: "text-foreground" },
    onCopyText && { icon: Copy, label: "Copy text", onClick: () => { onCopyText(); onClose(); }, color: "text-foreground" },
    onCopyLink && { icon: Link2, label: "Copy message link", onClick: () => { onCopyLink(); onClose(); }, color: "text-foreground" },
    onCopyId && { icon: Hash, label: "Copy ID", onClick: () => { onCopyId(); onClose(); }, color: "text-foreground" },
    onMarkUnread && { icon: Mail, label: "Mark as unread", onClick: () => { onMarkUnread(); onClose(); }, color: "text-foreground" },
    onBookmark && { icon: Bookmark, label: "Bookmark", onClick: () => { onBookmark(); onClose(); }, color: "text-foreground" },
    canPin && onPin && { icon: Pin, label: "Pin message", onClick: () => { onPin(); onClose(); }, color: "text-foreground" },
    canEdit && { icon: Pencil, label: "Edit", onClick: () => { onEdit(); onClose(); }, color: "text-foreground" },
    canDelete && { icon: Trash2, label: "Delete", onClick: () => { onDelete(); onClose(); }, color: "text-danger" },
    onReport && { icon: Flag, label: "Report", onClick: () => { onReport(); onClose(); }, color: "text-warning" },
  ].filter(Boolean);

  return (
    <div
      ref={ref}
      style={style}
      className="fixed z-[90] w-48 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition hover:bg-muted ${item.color}`}
        >
          <item.icon className="h-3.5 w-3.5" /> {item.label}
        </button>
      ))}
    </div>
  );
}