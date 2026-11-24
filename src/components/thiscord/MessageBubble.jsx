import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import AssetImage from "@/components/thiscord/AssetImage";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";
import MessageToolbar from "@/components/thiscord/MessageToolbar";
import ReactionBar from "@/components/thiscord/ReactionBar";
import LinkEmbed from "@/components/thiscord/LinkEmbed";
import Poll from "@/components/thiscord/Poll";
import Lightbox from "@/components/thiscord/Lightbox";
import VoiceMessagePlayer from "@/components/thiscord/VoiceMessagePlayer";

const timeOf = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

export function DayDivider({ label }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function NewDivider() {
  return (
    <div className="relative my-2 flex items-center px-3">
      <div className="flex-1 border-t border-danger" />
      <span className="mx-2 text-[10px] font-bold uppercase tracking-wider text-danger">New</span>
      <div className="flex-1 border-t border-danger" />
    </div>
  );
}

export function SystemMessage({ message, name, avatarId }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      {avatarId && <ProfileAvatar avatarId={avatarId} size={20} />}
      <span className="text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">{name}</span> {message.content}
      </span>
      <span className="text-[10px] text-muted-foreground/60">{timeOf(message.created_date)}</span>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  avatarId,
  name,
  username,
  nameFont,
  showHeader,
  showAvatar,
  onOpenProfile,
  receipt,
  viewers,
  canDelete,
  canEdit,
  onReport,
  onDelete,
  onEdit,
  onContextMenu,
  onReply,
  onReact,
  onTextReact,
  onSuperReact,
  onJumpToMessage,
  onPin,
  onBookmark,
  onForward,
  onCreateThread,
  onCopyText,
  onCopyId,
  onMarkUnread,
  onVote,
  onEndPoll,
  pollVotes = [],
  reactions = [],
  currentUserId,
  canSuperReact,
  forceEdit,
  highlighted,
}) {
  const attachment = message.attachment_url;
  const isGif = message.attachment_type === "gif";
  const isVoice = message.attachment_type === "voice";
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || "");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (forceEdit) {
      setEditText(message.content || "");
      setEditing(true);
    }
  }, [forceEdit]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    onContextMenu?.(message, e.clientX, rect.top, mine);
  };

  const startEdit = () => {
    setEditText(message.content || "");
    setEditing(true);
  };

  const saveEdit = () => {
    const text = editText.trim();
    if (text && text !== message.content) {
      onEdit?.(message, text);
    }
    setEditing(false);
  };

  // Swipe right to reply on touch devices
  const touchStartX = useRef(0);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - touchStartX.current;
    if (diff > 60) onReply?.(message);
  };

  const isSystem = message.is_system;
  if (isSystem) {
    return <SystemMessage message={message} name={name} avatarId={avatarId} />;
  }

  const hasPoll = !!message.poll_data;
  const urlInContent = message.content?.match(/(https?:\/\/[^\s<]+)/i)?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "group relative flex w-full items-end gap-2 px-3 transition-colors",
        mine ? "justify-end" : "justify-start",
        showHeader ? "mt-3" : "mt-0.5",
        highlighted && "bg-primary/10 ring-1 ring-primary/30"
      )}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={(e) => {
        if (e.shiftKey) return;
        if (canEdit) startEdit();
      }}
    >
      {!mine && (
        <button
          type="button"
          onClick={() => onOpenProfile?.(username)}
          className="w-7 shrink-0 transition hover:scale-105"
          title={`View @${username}`}
        >
          {showAvatar && <ProfileAvatar avatarId={avatarId} size={28} glow={false} />}
        </button>
      )}

      <div className={cn("max-w-[78%] sm:max-w-[68%]", mine ? "items-end" : "items-start")}>
        {/* Reply preview */}
        {message.reply_to_id && (
          <button
            onClick={() => onJumpToMessage?.(message.reply_to_id)}
            className={cn(
              "mb-1 flex items-center gap-1.5 rounded-lg border-l-2 border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted/50",
              mine ? "ml-auto" : ""
            )}
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{message.reply_deleted ? "Original message was deleted" : (message.reply_to_name || message.reply_to_username || "Unknown")}</p>
              {!message.reply_deleted && message.reply_to_content && (
                <p className="truncate">{message.reply_to_content}</p>
              )}
            </div>
          </button>
        )}

        {showHeader && (
          <p className={cn("mb-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground", mine ? "justify-end" : "justify-start")}>
            <button
              type="button"
              onClick={() => !mine && onOpenProfile?.(username)}
              className={cn("transition hover:text-foreground", nameFont === "glitch" ? "font-glitch" : "font-medium", mine && "hover:text-foreground")}
            >
              {mine ? "You" : name}
            </button>
            <span className="opacity-60">· {timeOf(message.created_date)}</span>
          </p>
        )}

        {attachment && isVoice ? (
          <div className={cn("mb-1", mine ? "ml-auto" : "")}>
            <VoiceMessagePlayer attachmentUrl={attachment} mine={mine} />
          </div>
        ) : attachment ? (
          <div className={cn("mb-1 overflow-hidden rounded-2xl border border-border bg-muted/40", mine ? "ml-auto" : "")}>
            <button onClick={() => setLightbox(attachment)}>
              <AssetImage
                src={attachment}
                alt={isGif ? "GIF" : "attachment"}
                className="max-h-64 w-auto max-w-full cursor-zoom-in object-contain"
                placeholderClassName="h-32 w-48"
              />
            </button>
          </div>
        ) : null}

        {editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={2}
              maxLength={2000}
              className="w-full resize-none rounded-2xl border border-primary/50 bg-card px-3.5 py-2 text-[14px] text-foreground focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">Save</button>
              <button onClick={() => setEditing(false)} className="rounded-lg bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">Cancel</button>
              <span className="ml-auto self-center text-[10px] text-muted-foreground">{editText.length}/2000</span>
            </div>
          </div>
        ) : hasPoll ? (
          <Poll
            poll={message.poll_data}
            votes={pollVotes}
            currentUserId={currentUserId}
            onVote={(indices) => onVote?.(message, indices)}
            onEnd={() => onEndPoll?.(message)}
            canEnd={mine}
          />
        ) : message.content ? (
          <div
            className={cn(
              "whitespace-pre-wrap break-words px-3.5 py-2 text-[14px] leading-snug shadow-sm",
              mine
                ? "rounded-[19px] rounded-br-[6px] bg-info text-foreground"
                : "rounded-[19px] rounded-bl-[6px] bg-secondary text-foreground"
            )}
          >
            {renderMarkdown(message.content, onOpenProfile)}
            {message.edited && <span className="ml-1 text-[10px] opacity-60">(edited)</span>}
          </div>
        ) : null}

        {/* Link embed */}
        {urlInContent && !editing && !hasPoll && (
          <div className={cn("max-w-full", mine ? "ml-auto" : "")}>
            <LinkEmbed url={urlInContent} />
          </div>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className={cn("mt-1", mine ? "justify-end" : "justify-start")}>
            <ReactionBar
              reactions={reactions}
              currentUserId={currentUserId}
              onReact={(emoji, type) => onReact?.(message, emoji, type)}
              onTextReact={(text) => onTextReact?.(message, text)}
              onSuperReact={(emoji) => onSuperReact?.(message, emoji)}
              canSuperReact={canSuperReact}
            />
          </div>
        )}

        {(receipt || (viewers && viewers.length > 0)) && (
          <p className={cn("mt-0.5 px-1 text-[10px] text-muted-foreground", mine ? "text-right" : "text-left")}>
            {receipt}
            {viewers?.length > 0 && (
              <span className={receipt ? "ml-1" : ""}>Seen by {viewers.slice(0, 4).join(", ")}{viewers.length > 4 ? ` +${viewers.length - 4}` : ""}</span>
            )}
          </p>
        )}
      </div>

      {/* Hover toolbar */}
      {!editing && (
        <MessageToolbar
          onReply={() => onReply?.(message)}
          onReact={(emoji, type) => onReact?.(message, emoji, type)}
          onEdit={canEdit ? startEdit : undefined}
          onMore={() => onContextMenu?.(message, 0, 0, mine)}
          onCreateThread={onCreateThread ? () => onCreateThread?.(message) : undefined}
          canEdit={canEdit}
          messageContent={message.content}
        />
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </motion.div>
  );
}

export default React.memo(MessageBubble);