import React from "react";
import { Gamepad2, Swords, Coins } from "lucide-react";

// Rich game invite card shown in chat when someone sends a game invite
export default function GameInviteCard({ invite, onAccept, onDecline }) {
  if (!invite) return null;
  const { game_name, from_username, prize, expires_at } = invite;

  return (
    <div className="my-1 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-purple-600/10">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
          <Gamepad2 className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <Swords className="h-3.5 w-3.5 text-warning" />
            <p className="text-sm font-bold text-foreground">Game Challenge</p>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-primary">@{from_username}</span> challenged you to <span className="font-medium">{game_name}</span>
          </p>
          {prize > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
              <Coins className="h-3 w-3" /> {prize} coins on the line
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 border-t border-border px-3 py-2">
        <button
          onClick={onAccept}
          className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          Decline
        </button>
      </div>
    </div>
  );
}