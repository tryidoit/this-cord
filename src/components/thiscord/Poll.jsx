import React, { useState } from "react";
import { BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Poll({ poll, votes = [], currentUserId, onVote, onEnd, canEnd }) {
  const [selectedOptions, setSelectedOptions] = useState(
    votes.filter((v) => v.user_id === currentUserId).map((v) => v.option_index)
  );
  const [multi, setMulti] = useState(poll.multi_select || false);

  const endTime = poll.end_time ? new Date(poll.end_time).getTime() : 0;
  const isEnded = endTime > 0 && Date.now() > endTime;
  const totalVotes = votes.length;

  const voteCounts = poll.options.map((_, i) => votes.filter((v) => v.option_index === i).length);
  const maxCount = Math.max(...voteCounts, 1);

  const toggleOption = (idx) => {
    if (isEnded) return;
    if (multi) {
      setSelectedOptions((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    } else {
      setSelectedOptions([idx]);
    }
  };

  const submitVotes = () => {
    onVote?.(selectedOptions);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <BarChart3 className="h-4 w-4 text-info" />
        <span className="text-[13px] font-semibold text-foreground">{poll.question}</span>
        {isEnded && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">Ended</span>}
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const count = voteCounts[i];
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = selectedOptions.includes(i);
          const isWinner = isEnded && count === maxCount && count > 0;
          return (
            <button
              key={i}
              onClick={() => toggleOption(i)}
              disabled={isEnded}
              className={cn(
                "relative flex w-full items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-muted/50",
                isEnded && "cursor-default",
                isWinner && "ring-1 ring-success"
              )}
            >
              <div
                className="absolute left-0 top-0 h-full bg-primary/10 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className={cn("relative z-10 grid h-4 w-4 shrink-0 place-items-center rounded-full border", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                {isSelected && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className="relative z-10 flex-1 text-foreground">{opt.text}</span>
              <span className="relative z-10 text-[11px] font-medium text-muted-foreground">{pct}%</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {endTime > 0 && !isEnded && ` · ends ${new Date(endTime).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
        </span>
        <div className="flex items-center gap-1.5">
          {canEnd && !isEnded && (
            <button onClick={onEnd} className="rounded-lg bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground">
              End poll
            </button>
          )}
          {!isEnded && selectedOptions.length > 0 && (
            <button onClick={submitVotes} className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
              Vote
            </button>
          )}
        </div>
      </div>
    </div>
  );
}