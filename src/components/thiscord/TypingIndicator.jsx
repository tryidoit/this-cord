import React from "react";

export default function TypingIndicator({ typers = [], currentUsername }) {
  const others = typers.filter((t) => t.username !== currentUsername);
  if (others.length === 0) return null;

  let text;
  if (others.length === 1) text = `${others[0].username} is typing…`;
  else if (others.length === 2) text = `${others[0].username} and ${others[1].username} are typing…`;
  else text = `${others[0].username} and ${others.length - 1} others are typing…`;

  return (
    <div className="flex items-center gap-1.5 px-4 py-1 text-[11px] text-muted-foreground">
      <div className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
      </div>
      <span>{text}</span>
    </div>
  );
}