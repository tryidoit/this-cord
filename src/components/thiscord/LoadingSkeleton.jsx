import React from "react";
import { cn } from "@/lib/utils";

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-2">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-40 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function SkeletonChannel() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5">
      <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-muted" />
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function SkeletonMessage() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-10 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ type = "messages", count = 8, className }) {
  if (type === "channels") {
    return (
      <div className={cn("space-y-0.5", className)}>
        {Array.from({ length: count }).map((_, i) => <SkeletonChannel key={i} />)}
      </div>
    );
  }
  if (type === "conversations") {
    return (
      <div className={cn("space-y-0.5", className)}>
        {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }
  return (
    <div className={cn("space-y-1", className)}>
      {Array.from({ length: count }).map((_, i) => <SkeletonMessage key={i} />)}
    </div>
  );
}