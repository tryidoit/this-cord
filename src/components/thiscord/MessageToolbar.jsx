import React, { useState } from "react";
import { Reply, SmilePlus, Pencil, MoreHorizontal, GitBranch } from "lucide-react";
import { QUICK_REACTIONS } from "@/lib/emojiData";
import TranslateButton from "@/components/productivity/TranslateButton";

export default function MessageToolbar({ onReply, onReact, onEdit, onMore, canEdit, onCreateThread, messageContent }) {
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  return (
    <div className="absolute -top-4 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-popover opacity-0 shadow-lg transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <div className="relative">
        <button
          onMouseEnter={() => setShowQuickReactions(true)}
          onMouseLeave={() => setShowQuickReactions(false)}
          onClick={() => setShowQuickReactions((v) => !v)}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:text-foreground"
          title="React"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
        {showQuickReactions && (
          <div
            onMouseEnter={() => setShowQuickReactions(true)}
            onMouseLeave={() => setShowQuickReactions(false)}
            className="absolute bottom-9 left-0 flex gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-xl"
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact?.(emoji, "emoji"); setShowQuickReactions(false); }}
                className="grid h-7 w-7 place-items-center rounded text-base transition hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onReply}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:text-foreground"
        title="Reply (R)"
      >
        <Reply className="h-3.5 w-3.5" />
      </button>
      {onCreateThread && (
        <button
          onClick={onCreateThread}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:text-foreground"
          title="Create Thread"
        >
          <GitBranch className="h-3.5 w-3.5" />
        </button>
      )}
      {canEdit && (
        <button
          onClick={onEdit}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:text-foreground"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {messageContent && (
        <div className="flex items-center px-0.5">
          <TranslateButton text={messageContent} />
        </div>
      )}
      <button
        onClick={onMore}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:text-foreground"
        title="More"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}