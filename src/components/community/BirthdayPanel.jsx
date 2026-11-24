import React, { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Cake, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function BirthdayPanel({ server, community, currentUserId, profile }) {
  const { birthdays, reload } = community;
  const [birthDate, setBirthDate] = useState("");
  const [displayYear, setDisplayYear] = useState(false);
  const [todayBirthdays, setTodayBirthdays] = useState([]);

  useEffect(() => {
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setTodayBirthdays(birthdays.filter((b) => b.birth_date?.slice(5) === mmdd));
  }, [birthdays]);

  const save = async () => {
    if (!birthDate) { toast({ title: "Select your birthday", variant: "destructive" }); return; }
    try {
      const existing = birthdays.find((b) => b.user_id === currentUserId);
      if (existing) {
        await api.entities.Birthday.update(existing.id, { birth_date: birthDate, display_year: displayYear });
      } else {
        await api.entities.Birthday.create({
          server_id: server.id,
          user_id: currentUserId,
          username: profile?.username || "user",
          birth_date: birthDate,
          display_year: displayYear,
        });
      }
      reload();
      toast({ title: "Birthday saved!" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
  };

  const remove = async (b) => {
    try { await api.entities.Birthday.delete(b.id); reload(); toast({ title: "Removed" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const myBirthday = birthdays.find((b) => b.user_id === currentUserId);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground">Birthday Reminders</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Members add their birthday. Everyone sees whose birthday it is today.</p>
      </div>

      {todayBirthdays.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-warning" />
            <h4 className="text-[14px] font-bold text-foreground">Today's Birthdays!</h4>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {todayBirthdays.map((b) => (
              <span key={b.id} className="rounded-full bg-warning/20 px-3 py-1 text-[12px] font-semibold text-warning">🎂 @{b.username}</span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-background/50 p-4">
        <h4 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Your Birthday</h4>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-semibold uppercase text-muted-foreground">
            Date
            <input type="date" value={birthDate || myBirthday?.birth_date || ""} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 h-9 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground" />
          </label>
          <label className="flex items-center gap-2 text-[12px] text-foreground">
            <input type="checkbox" checked={displayYear || myBirthday?.display_year} onChange={(e) => setDisplayYear(e.target.checked)} className="h-4 w-4 accent-primary" />
            Show year
          </label>
          <button onClick={save} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">All Birthdays</h4>
        {birthdays.length === 0 && <p className="text-[12px] text-muted-foreground">No birthdays registered.</p>}
        <div className="grid grid-cols-2 gap-2">
          {birthdays.map((b) => {
            const date = new Date(b.birth_date);
            const isToday = new Date().toDateString().includes(date.toDateString().slice(4));
            return (
              <div key={b.id} className={`flex items-center gap-2 rounded-lg border p-2 ${isToday ? "border-warning bg-warning/10" : "border-border bg-background/50"}`}>
                <Cake className={`h-4 w-4 ${isToday ? "text-warning" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-foreground">@{b.username}</p>
                  <p className="text-[10px] text-muted-foreground">{date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}{b.display_year ? `, ${date.getFullYear()}` : ""}</p>
                </div>
                {b.user_id === currentUserId && <button onClick={() => remove(b)} className="text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}