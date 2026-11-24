import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Shield, Bell, Palette, Eye, Keyboard, Globe,
  Monitor, Code, Activity, Smartphone, HardDrive, Download, Trash2,
  Mic, Image, ChevronRight
} from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";
import { api } from "@/api/client";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const SECTIONS = [
  { id: "account", label: "My Account", icon: User },
  { id: "profile", label: "Profiles", icon: User },
  { id: "privacy", label: "Privacy & Safety", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette, link: "/appearance" },
  { id: "accessibility", label: "Accessibility", icon: Eye },
  { id: "keybinds", label: "Keybinds", icon: Keyboard },
  { id: "language", label: "Language", icon: Globe },
  { id: "streamer", label: "Streamer Mode", icon: Monitor },
  { id: "voice", label: "Voice & Video", icon: Mic },
  { id: "text", label: "Text & Images", icon: Image },
  { id: "advanced", label: "Advanced", icon: Code },
  { id: "activity", label: "Activity Privacy", icon: Activity },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "export", label: "Data Export", icon: Download },
  { id: "delete", label: "Delete Account", icon: Trash2, danger: true },
];

export default function UserSettings() {
  const { profile, setProfile, isAdmin } = useProfile();
  const navigate = useNavigate();
  const [section, setSection] = useState("account");

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Settings sidebar */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <button onClick={() => navigate("/")} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-[15px] font-bold text-foreground">User Settings</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User Settings</p>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => s.link ? navigate(s.link) : setSection(s.id)}
              className={cn(
                "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                section === s.id && !s.link ? "bg-primary/15 text-primary" : "",
                s.danger ? "text-danger hover:bg-danger/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{s.label}</span>
              {s.link && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
            </button>
          ))}
        </div>
      </div>

      {/* Settings content */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-6">
          {section === "account" && <AccountSection profile={profile} setProfile={setProfile} />}
          {section === "profile" && <ProfileSection profile={profile} setProfile={setProfile} />}
          {section === "privacy" && <PrivacySection profile={profile} setProfile={setProfile} />}
          {section === "notifications" && <NotificationsSection profile={profile} setProfile={setProfile} />}
          {section === "accessibility" && <AccessibilitySection profile={profile} setProfile={setProfile} />}
          {section === "keybinds" && <KeybindsSection />}
          {section === "language" && <LanguageSection profile={profile} setProfile={setProfile} />}
          {section === "streamer" && <StreamerSection profile={profile} setProfile={setProfile} />}
          {section === "voice" && <VoiceSection />}
          {section === "text" && <TextImagesSection />}
          {section === "advanced" && <AdvancedSection profile={profile} setProfile={setProfile} />}
          {section === "activity" && <ActivitySection profile={profile} setProfile={setProfile} />}
          {section === "devices" && <DevicesSection />}
          {section === "storage" && <StorageSection />}
          {section === "export" && <ExportSection profile={profile} />}
          {section === "delete" && <DeleteSection profile={profile} />}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, desc }) {
  return (
    <div className="mb-6 border-b border-border pb-4">
      <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
      {desc && <p className="mt-1 text-[12px] text-muted-foreground">{desc}</p>}
    </div>
  );
}

function Field({ label, desc, children }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        {desc && <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function AccountSection({ profile, setProfile }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.entities.Profile.update(profile.id, {
        username, display_name: displayName, bio,
      });
      setProfile(updated);
      toast({ title: "Account updated" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader title="My Account" desc="Manage your account information." />
      <Field label="Username" desc="Your unique handle on This-Cord.">
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-48 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none" />
      </Field>
      <Field label="Display Name" desc="The name shown on your profile.">
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-48 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none" />
      </Field>
      <Field label="Bio" desc="A short description of yourself.">
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-48 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none" />
      </Field>
      <Button onClick={save} disabled={saving} className="mt-2">{saving ? "Saving..." : "Save Changes"}</Button>
    </div>
  );
}

function ProfileSection({ profile, setProfile }) {
  const [aboutMe, setAboutMe] = useState(profile?.about_me || "");
  const [pronouns, setPronouns] = useState(profile?.pronouns || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.entities.Profile.update(profile.id, { about_me: aboutMe, pronouns });
      setProfile(updated);
      toast({ title: "Profile updated" });
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader title="Profiles" desc="Customize your public profile." />
      <Field label="About Me" desc="Markdown-supported description shown on your profile card.">
        <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} rows={4} className="w-56 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none" />
      </Field>
      <Field label="Pronouns" desc="How should people refer to you?">
        <input value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="e.g. they/them" className="w-48 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground focus:border-primary focus:outline-none" />
      </Field>
      <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
    </div>
  );
}

function PrivacySection({ profile, setProfile }) {
  const update = async (field, value) => {
    const updated = await api.entities.Profile.update(profile.id, { [field]: value });
    setProfile(updated);
    toast({ title: "Privacy setting updated" });
  };
  return (
    <div>
      <SectionHeader title="Privacy & Safety" desc="Control who can contact you." />
      <Field label="Who can DM you" desc="Who can send you direct messages.">
        <Select value={profile?.privacy_dm || "everyone"} onValueChange={(v) => update("privacy_dm", v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="friends">Friends Only</SelectItem>
            <SelectItem value="server_members">Server Members</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Who can send friend requests" desc="Who can add you as a friend.">
        <Select value={profile?.privacy_friend_requests || "everyone"} onValueChange={(v) => update("privacy_friend_requests", v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="friends_of_friends">Friends of Friends</SelectItem>
            <SelectItem value="none">No one</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function NotificationsSection({ profile, setProfile }) {
  const prefs = profile?.notification_prefs || {};
  const update = async (key, value) => {
    const updated = await api.entities.Profile.update(profile.id, {
      notification_prefs: { ...prefs, [key]: value },
    });
    setProfile(updated);
  };
  return (
    <div>
      <SectionHeader title="Notifications" desc="Choose what you get notified about." />
      <Field label="Direct Messages" desc="Get notified for new DMs.">
        <Select value={prefs.dms || "all"} onValueChange={(v) => update("dms", v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="mentions">Mentions Only</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Friend Requests" desc="Get notified when someone adds you.">
        <Switch checked={prefs.friend_requests !== false} onCheckedChange={(v) => update("friend_requests", v)} />
      </Field>
      <Field label="Call Notifications" desc="Get notified for incoming calls.">
        <Switch checked={prefs.calls !== false} onCheckedChange={(v) => update("calls", v)} />
      </Field>
    </div>
  );
}

function AccessibilitySection({ profile, setProfile }) {
  const update = async (field, value) => {
    const updated = await api.entities.Profile.update(profile.id, { [field]: value });
    setProfile(updated);
  };
  return (
    <div>
      <SectionHeader title="Accessibility" desc="Make This-Cord work better for you." />
      <Field label="High Contrast" desc="Increases contrast for better readability.">
        <Switch checked={!!profile?.accessibility_high_contrast} onCheckedChange={(v) => update("accessibility_high_contrast", v)} />
      </Field>
      <Field label="Reduced Motion" desc="Minimizes animations and transitions.">
        <Switch checked={!!profile?.accessibility_reduced_motion} onCheckedChange={(v) => update("accessibility_reduced_motion", v)} />
      </Field>
      <Field label="Text-to-Speech" desc="Reads messages aloud using your browser's TTS.">
        <Switch checked={!!profile?.accessibility_tts} onCheckedChange={(v) => update("accessibility_tts", v)} />
      </Field>
    </div>
  );
}

function KeybindsSection() {
  const keybinds = [
    { action: "Open Quick Switcher", keys: "Ctrl + K" },
    { action: "Mark Channel as Read", keys: "Esc" },
    { action: "Toggle Mute", keys: "Ctrl + Shift + M" },
    { action: "Toggle Deafen", keys: "Ctrl + Shift + D" },
    { action: "Open Friends", keys: "Ctrl + Shift + F" },
  ];
  return (
    <div>
      <SectionHeader title="Keybinds" desc="Keyboard shortcuts for This-Cord." />
      {keybinds.map((k) => (
        <Field key={k.action} label={k.action}>
          <kbd className="rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{k.keys}</kbd>
        </Field>
      ))}
    </div>
  );
}

function LanguageSection({ profile, setProfile }) {
  const update = async (lang) => {
    const updated = await api.entities.Profile.update(profile.id, { language: lang });
    setProfile(updated);
    toast({ title: "Language updated" });
  };
  return (
    <div>
      <SectionHeader title="Language" desc="Choose your preferred language." />
      <Field label="App Language" desc="Currently supports English only.">
        <Select value={profile?.language || "en"} onValueChange={update}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function StreamerSection({ profile, setProfile }) {
  const update = async (value) => {
    const updated = await api.entities.Profile.update(profile.id, { streamer_mode: value });
    setProfile(updated);
  };
  return (
    <div>
      <SectionHeader title="Streamer Mode" desc="Hides sensitive info while streaming." />
      <Field label="Enable Streamer Mode" desc="Masks emails, tokens, and other sensitive data.">
        <Switch checked={!!profile?.streamer_mode} onCheckedChange={update} />
      </Field>
    </div>
  );
}

function VoiceSection() {
  return (
    <div>
      <SectionHeader title="Voice & Video" desc="Configure your microphone and camera." />
      <Field label="Input Device" desc="Microphone used for voice calls.">
        <Select defaultValue="default">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">System Default</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Output Device" desc="Speaker used for audio output.">
        <Select defaultValue="default">
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">System Default</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Input Volume" desc="Adjust your microphone sensitivity.">
        <div className="w-40"><Slider defaultValue={[80]} max={100} /></div>
      </Field>
      <Field label="Echo Cancellation" desc="Reduces echo during calls.">
        <Switch defaultChecked />
      </Field>
      <Field label="Noise Suppression" desc="Filters background noise.">
        <Switch defaultChecked />
      </Field>
    </div>
  );
}

function TextImagesSection() {
  return (
    <div>
      <SectionHeader title="Text & Images" desc="Customize how messages appear." />
      <Field label="Inline Link Previews" desc="Show previews for links in messages.">
        <Switch defaultChecked />
      </Field>
      <Field label="Show Image Previews" desc="Display images inline in chat.">
        <Switch defaultChecked />
      </Field>
      <Field label="Animated Emojis" desc="Play emoji animations.">
        <Switch defaultChecked />
      </Field>
      <Field label="Message Display" desc="How messages are compacted.">
        <Select defaultValue="cozy">
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cozy">Cozy</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function AdvancedSection({ profile, setProfile }) {
  const update = async (value) => {
    const updated = await api.entities.Profile.update(profile.id, { developer_mode: value });
    setProfile(updated);
    toast({ title: value ? "Developer mode enabled" : "Developer mode disabled" });
  };
  return (
    <div>
      <SectionHeader title="Advanced" desc="Developer and experimental features." />
      <Field label="Developer Mode" desc="Enables copy-ID buttons and debug info.">
        <Switch checked={!!profile?.developer_mode} onCheckedChange={update} />
      </Field>
      {profile?.developer_mode && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[11px] font-semibold text-foreground">Your User ID</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 text-[11px] text-muted-foreground">{profile?.created_by_id}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(profile?.created_by_id || ""); toast({ title: "Copied!" }); }}
              className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-foreground">Your Profile ID</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 text-[11px] text-muted-foreground">{profile?.id}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(profile?.id || ""); toast({ title: "Copied!" }); }}
              className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivitySection({ profile, setProfile }) {
  return (
    <div>
      <SectionHeader title="Activity Privacy" desc="Control your activity status sharing." />
      <Field label="Display Current Activity" desc="Show what game you're playing.">
        <Switch defaultChecked />
      </Field>
      <Field label="Display Rich Presence" desc="Show detailed game status.">
        <Switch defaultChecked />
      </Field>
    </div>
  );
}

function DevicesSection() {
  return (
    <div>
      <SectionHeader title="Devices" desc="Devices currently signed in to your account." />
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-foreground">Current Browser</p>
            <p className="text-[11px] text-muted-foreground">{navigator.userAgent.split(" ").slice(-2).join(" ")} · This device</p>
          </div>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Active</span>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Other sessions will appear here when you sign in from different devices.</p>
    </div>
  );
}

function StorageSection() {
  return (
    <div>
      <SectionHeader title="Storage" desc="Your app storage usage." />
      <Field label="Cache Size" desc="Images and media cached on this device.">
        <p className="text-[12px] font-semibold text-muted-foreground">~{Math.round(((navigator.storage && navigator.storage.estimate) ? 0 : 0))} MB</p>
      </Field>
      <Field label="Clear Cache" desc="Free up space by clearing cached media.">
        <Button variant="outline" onClick={() => toast({ title: "Cache cleared" })}>Clear Cache</Button>
      </Field>
    </div>
  );
}

function ExportSection({ profile }) {
  const exportData = async () => {
    const data = {
      exported_at: new Date().toISOString(),
      profile: {
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        about_me: profile.about_me,
        pronouns: profile.pronouns,
        points: profile.points,
        games_won: profile.games_won,
        daily_streak: profile.daily_streak,
        created_date: profile.created_date,
        badges: profile.badges,
        links: profile.links,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thiscord-data-${profile.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported!" });
  };
  return (
    <div>
      <SectionHeader title="Data Export" desc="Download a copy of your data." />
      <p className="mb-4 text-[12px] text-muted-foreground">Export your profile data as a JSON file. This includes your account info, stats, and settings.</p>
      <Button onClick={exportData}><Download className="mr-2 h-4 w-4" /> Export My Data</Button>
    </div>
  );
}

function DeleteSection({ profile }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      <SectionHeader title="Delete Account" desc="Permanently delete your account and data." />
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-[12px] text-foreground">This action is irreversible. All your messages, profile data, and coins will be permanently removed.</p>
        {!confirm ? (
          <Button variant="destructive" className="mt-3" onClick={() => setConfirm(true)}>Delete My Account</Button>
        ) : (
          <div className="mt-3">
            <p className="mb-2 text-[12px] font-semibold text-danger">Are you absolutely sure? Type your username to confirm.</p>
            <Button variant="destructive" disabled>Delete Permanently</Button>
            <Button variant="ghost" className="ml-2" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
}