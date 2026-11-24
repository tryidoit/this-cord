import React, { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Plus, X, Check, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getReminders,
  addReminder,
  dismissReminder,
  getDueReminders,
  snoozeNotifications,
  isSnoozed,
  clearSnooze,
  snoozeRemaining,
} from "@/lib/productivity";

export default function RemindersPanel({ profile }) {
  const [reminders, setReminders] = useState([]);
  const [due, setDue] = useState([]);
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [snoozed, setSnoozed] = useState(false);
  const [snoozeMins, setSnoozeMins] = useState(30);
  const [snoozeLeft, setSnoozeLeft] = useState(0);

  const refresh = () => {
    setReminders(getReminders());
    setDue(getDueReminders());
    setSnoozed(isSnoozed());
    setSnoozeLeft(snoozeRemaining());
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleAdd = () => {
    if (!text.trim() || !when) return;
    addReminder(text.trim(), new Date(when).toISOString());
    setText("");
    setWhen("");
    refresh();
  };

  const handleSnooze = () => {
    snoozeNotifications(snoozeMins);
    refresh();
  };

  const handleClearSnooze = () => {
    clearSnooze();
    refresh();
  };

  const handleDismiss = (id) => {
    dismissReminder(id);
    refresh();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {/* Due reminders */}
      {due.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
            <BellRing className="h-3.5 w-3.5 animate-pulse" /> Due Now ({due.length})
          </div>
          {due.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-2.5">
              <p className="text-sm text-foreground">{r.text}</p>
              <button
                onClick={() => handleDismiss(r.id)}
                className="rounded-lg bg-success p-1.5 text-white hover:bg-success/90"
                title="Done"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Snooze */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-1.5">
          {snoozed ? <BellOff className="h-4 w-4 text-muted-foreground" /> : <Bell className="h-4 w-4 text-primary" />}
          <h4 className="text-sm font-semibold text-foreground">Notification Snooze</h4>
        </div>
        {snoozed ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Snoozed for {snoozeLeft} more minute{snoozeLeft !== 1 ? "s" : ""}.</p>
            <button
              onClick={handleClearSnooze}
              className="w-full rounded-lg border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Resume notifications
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[15, 30, 60, 120].map((m) => (
                <button
                  key={m}
                  onClick={() => setSnoozeMins(m)}
                  className={cn("flex-1 rounded-lg py-1 text-xs font-medium transition",
                    snoozeMins === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                >
                  {m < 60 ? `${m}m` : `${m / 60}h`}
                </button>
              ))}
            </div>
            <button
              onClick={handleSnooze}
              className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Snooze for {snoozeMins < 60 ? `${snoozeMins} minutes` : `${snoozeMins / 60} hour(s)`}
            </button>
          </div>
        )}
      </div>

      {/* Add reminder */}
      <div className="mb-4 rounded-xl border border-border bg-card p-3">
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" /> Add Reminder
        </h4>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Remind me to..."
          className="mb-2 w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-sm text-foreground"
        />
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-input px-2.5 py-1.5 text-sm text-foreground"
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim() || !when}
            className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* All reminders */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Reminders</h4>
        <div className="space-y-1.5">
          {reminders.map((r) => {
            const isDue = due.some((d) => d.id === r.id);
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5">
                <div className="min-w-0">
                  <p className={cn("text-sm text-foreground", isDue && "font-medium")}>{r.text}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.when).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(r.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {reminders.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No reminders set.</p>
          )}
        </div>
      </div>
    </div>
  );
}