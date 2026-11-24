import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Save, Loader2, Store, Flame, Trophy, Shirt, ImagePlus, Music, Trash2, Sparkles, AtSign, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import PreCallTest from "@/components/thiscord/PreCallTest";
import { api } from "@/api/client";
import { formatCoins, isInfinite, PFP_UPLOAD_COST } from "@/lib/economy";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const FONTS = [
  { id: "default", label: "Default" },
  { id: "glitch", label: "Glitch" },
  { id: "mono", label: "Terminal" },
];

export default function ProfileSheet({ profile, onClose, onSaved }) {
  const [name, setName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [font, setFont] = useState(profile?.name_font || "default");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [avatar, setAvatar] = useState(profile?.avatar_id);
  const [ringtone, setRingtone] = useState(profile?.ringtone_uri || "");
  const [showTest, setShowTest] = useState(false);
  const pfpRef = useRef(null);
  const toneRef = useRef(null);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.entities.Profile.update(profile.id, {
        display_name: name.trim().slice(0, 24) || profile.username,
        bio: bio.trim().slice(0, 160),
        name_font: font,
        avatar_id: avatar,
        ringtone_uri: ringtone,
        needs_name: false,
      });
      onSaved?.(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const uploadPfp = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const balance = profile?.points || 0;
    if (!isInfinite(profile) && balance < PFP_UPLOAD_COST) {
      toast({
        title: "Not enough coins",
        description: `Custom profile pictures cost ${PFP_UPLOAD_COST.toLocaleString()} coins.`,
        variant: "destructive",
      });
      return;
    }
    setBusy("pfp");
    try {
      const { compressImage, saveAsset } = await import("@/lib/assets");
      const { dataUrl, width, height } = await compressImage(file, 512, 0.8);
      if (!dataUrl) throw new Error("compress failed");
      const ref = await saveAsset(dataUrl, "pfp", file.type, dataUrl.length, width, height);
      setAvatar(ref);
      const updated = await api.entities.Profile.update(profile.id, {
        avatar_id: ref,
        points: isInfinite(profile) ? balance : balance - PFP_UPLOAD_COST,
      });
      onSaved?.(updated);
      toast({ title: "Profile picture updated", description: `-${PFP_UPLOAD_COST.toLocaleString()} coins` });
    } catch {
      toast({ title: "Upload failed", description: "Try a smaller image.", variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  const uploadRingtone = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("tone");
    try {
      const { compressAudio, saveAsset } = await import("@/lib/assets");
      const { dataUrl, tooLarge } = await compressAudio(file);
      if (!dataUrl) throw new Error(tooLarge ? "too large" : "no file");
      const ref = await saveAsset(dataUrl, "ringtone", file.type, dataUrl.length);
      setRingtone(ref);
      const updated = await api.entities.Profile.update(profile.id, { ringtone_uri: ref });
      onSaved?.(updated);
      toast({ title: "Ringtone saved", description: "Your calls ring with your own sound." });
    } catch {
      toast({ title: "Upload failed", description: "Use an mp3, wav or m4a file under 200 KB.", variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-border bg-card"
      >
        <div className="relative h-24 bg-gradient-to-br from-violet-600/60 via-fuchsia-500/30 to-teal-400/40">
          <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/40 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="-mt-9 px-5 pb-5">
          <button type="button" onClick={() => pfpRef.current?.click()} className="group relative" title="Upload your own picture">
            <ProfileAvatar avatarId={avatar} size={72} className="ring-4 ring-card" />
            <span className="absolute inset-0 grid place-items-center rounded-[28%] bg-background/55 opacity-0 transition group-hover:opacity-100">
              {busy === "pfp" ? <Loader2 className="h-5 w-5 animate-spin text-foreground" /> : <ImagePlus className="h-5 w-5 text-foreground" />}
            </span>
          </button>
          <input ref={pfpRef} type="file" accept="image/*" className="hidden" onChange={uploadPfp} />

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className={cn("font-display text-lg font-bold text-foreground", font === "glitch" && "font-glitch", font === "mono" && "font-mono-tag")}>
                {name || profile?.display_name || profile?.username}
              </p>
              <p className="text-[11px] text-muted-foreground">@{profile?.username}</p>
            </div>
            <span className="rounded-lg bg-warning/10 px-2 py-1 text-xs font-bold text-warning">{formatCoins(profile)} coins</span>
          </div>

          <p className="mt-2 text-[10.5px] text-muted-foreground">
            Custom picture: <span className="font-semibold text-warning">{PFP_UPLOAD_COST.toLocaleString()} coins</span> per upload
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: Flame, label: "streak", value: profile?.daily_streak || 0 },
              { icon: Trophy, label: "wins", value: profile?.games_won || 0 },
              { icon: Shirt, label: "avatars", value: (profile?.owned_avatars || []).length },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-muted/40 py-2">
                <s.icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                <p className="mt-1 text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Display name</label>
              <Input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} className="mt-1 h-10" />
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-2">
              <AtSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-[12px] text-foreground">@{profile?.username}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Ask an admin to change</span>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Bio</label>
              <Input value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} placeholder="say something cool" className="mt-1 h-10" />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Name font
              </label>
              <div className="mt-1.5 flex gap-1.5">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFont(f.id)}
                    className={cn(
                      "flex-1 rounded-lg border py-2 text-[11px] font-semibold transition",
                      font === f.id ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className={cn(f.id === "glitch" && "font-glitch", f.id === "mono" && "font-mono-tag")}>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Music className="h-3 w-3" /> Ringtone
              </span>
              {ringtone && (
                <button
                  type="button"
                  onClick={async () => {
                    setRingtone("");
                    const updated = await api.entities.Profile.update(profile.id, { ringtone_uri: "" });
                    onSaved?.(updated);
                  }}
                  className="flex items-center gap-1 text-[10px] text-danger hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" /> remove
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => toneRef.current?.click()}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-[11.5px] text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              {busy === "tone" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Music className="h-3.5 w-3.5" />}
              {ringtone ? "Replace your ringtone" : "Upload your own ringtone"}
            </button>
            <input ref={toneRef} type="file" accept="audio/*" className="hidden" onChange={uploadRingtone} />
          </div>

          <Button onClick={save} disabled={saving} className="mt-4 h-10 w-full font-semibold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save changes</>}
          </Button>
          <button
            type="button"
            onClick={() => setShowTest(true)}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm text-muted-foreground transition hover:bg-muted"
          >
            <Mic className="h-4 w-4" /> Test mic, camera & speakers
          </button>
          {showTest && <PreCallTest onClose={() => setShowTest(false)} />}
          <Link to="/shop" className="mt-2 flex h-10 items-center justify-center gap-2 rounded-xl border border-border text-sm text-muted-foreground transition hover:bg-muted">
            <Store className="h-4 w-4" /> Change avatar
          </Link>
        </div>
      </motion.div>
    </div>
  );
}