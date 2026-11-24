import React from "react";
import { Hash, Send } from "lucide-react";

export default function PreviewChat() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="text-[13px] font-semibold text-foreground">general</span>
        <span className="ml-auto h-2 w-2 rounded-full bg-online" />
      </div>

      {/* Messages */}
      <div className="space-y-3 p-3">
        <div className="flex items-start gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[12px] font-semibold text-foreground">Alex</span>
              <span className="text-[9px] text-muted-foreground">12:34</span>
            </div>
            <p className="text-[12px] text-foreground/90">
              Hey everyone! How's the new look? 🎨
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
            M
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[12px] font-semibold text-primary">Maya</span>
              <span className="text-[9px] text-muted-foreground">12:35</span>
            </div>
            <p className="text-[12px] text-foreground/90">
              Loving it! The fonts look amazing ✨
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success text-[11px] font-bold text-foreground">
            J
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[12px] font-semibold text-foreground">Jordan</span>
              <span className="text-[9px] text-muted-foreground">12:36</span>
            </div>
            <p className="rounded-md bg-mention/20 px-2 py-0.5 text-[12px] text-foreground">
              <span className="font-semibold text-primary">@Alex</span> great work on the overhaul!
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <div className="flex-1 rounded-md bg-background px-2.5 py-1.5 text-[12px] text-muted-foreground">
          Type a message...
        </div>
        <button className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}