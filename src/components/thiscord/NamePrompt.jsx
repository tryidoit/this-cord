import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { api } from "@/api/client";
import { Loader2, Sparkles } from "lucide-react";

// First-run screen: every account picks a display name before entering This-Cord.
export default function NamePrompt({ profile, onDone }) {
  const [name, setName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const clean = name.trim().slice(0, 24);
    if (clean.length < 2) {
      setError("Pick a name with at least 2 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await api.entities.Profile.update(profile.id, {
        display_name: clean,
        needs_name: false,
      });
      onDone?.(updated);
    } catch (err) {
      setError(err?.message || "Could not save your name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/95 px-5 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[0_30px_120px_-20px_hsl(var(--primary)/0.5)]"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <ProfileAvatar avatarId={profile?.avatar_id} size={84} />
          <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-primary/80">
            <Sparkles className="h-3 w-3" /> welcome to this-cord
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Choose your name</h2>
          <p className="mt-1 text-sm text-foreground/50">
            This is how everyone sees you. You can change it any time in your profile.
          </p>
        </div>

        <Input
          autoFocus
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={profile?.username || "your name"}
          className="h-12 border-border bg-foreground/5 text-center text-lg text-foreground placeholder:text-foreground/25"
        />
        {error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}

        <Button
          onClick={save}
          disabled={saving}
          className="mt-4 h-12 w-full bg-gradient-to-r from-violet-500 to-teal-400 font-semibold text-black hover:opacity-90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter This-Cord"}
        </Button>
        <p className="mt-3 text-center text-[11px] text-foreground/30">your handle stays @{profile?.username}</p>
      </motion.div>
    </div>
  );
}