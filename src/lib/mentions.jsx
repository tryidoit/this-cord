import React from "react";

// Extracts @usernames from text (3-20 chars, alphanumeric + underscore)
export function extractMentions(text) {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_]{3,20})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

// Renders text with @mentions as clickable links
export function renderTextWithMentions(text, onMentionClick) {
  if (!text) return text;
  const parts = text.split(/(@[a-zA-Z0-9_]{3,20})/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      return (
        <span
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onMentionClick?.(username);
          }}
          className="cursor-pointer rounded bg-primary/20 px-0.5 font-medium text-primary hover:bg-primary/30"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}