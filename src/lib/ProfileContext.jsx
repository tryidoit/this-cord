import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { hardNavigate } from "@/lib/nav";
import { Outlet } from "react-router-dom";
import { api } from "@/api/client";
import { SESSION_REWARD_MINUTES, canClaimDaily } from "@/lib/economy";
import NamePrompt from "@/components/thiscord/NamePrompt";
import DailyReward from "@/components/thiscord/DailyReward";
import BrandLoader from "@/components/thiscord/BrandLoader";
import { toast } from "@/components/ui/use-toast";
import { Ban, LogOut, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UIProvider } from "@/lib/UIContext";
import { playCoin } from "@/lib/sound";
import { checkDeviceBan } from "@/lib/deviceBan";

const ProfileContext = createContext(null);

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDaily, setShowDaily] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [deviceBanned, setDeviceBanned] = useState(null);
  const profileRef = useRef(null);
  const configRef = useRef(null);

  const applyProfile = useCallback((next) => {
    profileRef.current = next;
    setProfile(next);
  }, []);

  const refresh = useCallback(async () => {
    const current = profileRef.current;
    if (!current) return null;
    const fresh = await api.entities.Profile.get(current.id);
    applyProfile(fresh);
    return fresh;
  }, [applyProfile]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.auth.me();
        if (!alive) return;
        setUser(me);

        // Check device ban before loading anything else
        const ban = await checkDeviceBan();
        if (ban && alive) {
          setDeviceBanned(ban);
          setLoading(false);
          return;
        }

        // The server creates the profile when the account is registered.
        const found = await api.entities.Profile.filter({ created_by_id: me.id }, { limit: 1 });
        const current = found?.items?.[0] || null;
        if (!current) throw new Error("Your profile could not be found. Please contact an admin.");
        if (!alive) return;
        applyProfile(current);

        // Migration: old users start on Discord style, old theme saved for one-click restore
        if (!current.ui_style_id) {
          try {
            const migratedFrom = current.theme_id;
            const updated = await api.entities.Profile.update(current.id, {
              ui_style_id: "discord",
              color_mode: "system",
              ui_custom: { migratedFrom, palette: migratedFrom, wallpaper: migratedFrom },
            });
            if (alive) applyProfile(updated);
          } catch (e) { /* ignore */ }
        }

        const existing = await api.entities.AppConfig.filter({ key: "global" }, { limit: 1 });
        let cfg = existing?.items?.[0] || null;
        if (!cfg && current.is_admin) {
          cfg = await api.entities.AppConfig.create({
            key: "global",
            double_points: false,
            owner_username: current.username,
            welcome_message: "Welcome to This-Cord — be kind, win coins, collect avatars.",
          }).catch(() => null);
        }
        if (!cfg) cfg = { key: "global", double_points: false };
        if (!alive) return;
        configRef.current = cfg;
        setConfig(cfg);
        setShowDaily(canClaimDaily(current) && !current.needs_name);
      } catch (err) {
        console.error(err);
        // If auth itself failed, send the user to login instead of rendering
        // the app with no profile (which loses their handle).
        if (err?.status === 401) {
          hardNavigate("/login");
          return;
        }
        if (err?.code === "device_banned") setDeviceBanned({ reason: err.data?.reason });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [applyProfile]);

  // Presence heartbeat — powers the online / away dots everywhere.
  useEffect(() => {
    if (!profile?.id) return undefined;
    const beat = () => {
      if (document.hidden) return;
      api.entities.Profile.update(profile.id, { last_seen: new Date().toISOString() }).catch(() => {});
    };
    beat();
    const timer = setInterval(beat, 45000);
    return () => clearInterval(timer);
  }, [profile?.id]);

  // Every 5 minutes of presence pays out coins.
  useEffect(() => {
    const timer = setInterval(async () => {
      const p = profileRef.current;
      if (!p || p.is_banned || p.needs_name) return;
      const last = p.last_session_claim ? new Date(p.last_session_claim).getTime() : 0;
      if (Date.now() - last < SESSION_REWARD_MINUTES * 60 * 1000) return;
      try {
        const { profile: updated, reward } = await api.economy.session();
        if (updated) {
          applyProfile(updated);
          toast({ title: `+${reward} coins`, description: "5 minutes on This-Cord" });
        }
      } catch (err) {
        console.error(err);
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [applyProfile]);

  // Gifts other players sent us land in our balance as soon as we're online.
  const giftUserId = profile?.user_id || profile?.created_by_id;
  useEffect(() => {
    if (!giftUserId) return undefined;
    let alive = true;
    const claim = async () => {
      try {
        const { profile: updated, gifts } = await api.economy.claimGifts();
        if (!gifts?.length || !alive) return;
        applyProfile(updated);
        playCoin();
        for (const gift of gifts) {
          toast({
            title: `+${gift.amount} coins`,
            description: `Gift from @${gift.from_username}${gift.note ? ` · ${gift.note}` : ""}`,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    claim();
    const tick = () => { if (!document.hidden) claim(); };
    const timer = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [giftUserId, applyProfile]);

  // Kicked by a moderator: leave this session.
  useEffect(() => {
    if (!profile?.kicked_at) return;
    const start = Number(sessionStorage.getItem("tc_session_start") || 0);
    if (start && new Date(profile.kicked_at).getTime() > start) setKicked(true);
  }, [profile?.kicked_at]);

  const setNickname = useCallback(
    async (username, nickname) => {
      const current = profileRef.current;
      if (!current || !username) return;
      const next = { ...(current.nicknames || {}) };
      const clean = (nickname || "").trim().slice(0, 32);
      if (clean) next[username] = clean;
      else delete next[username];
      const updated = await api.entities.Profile.update(current.id, { nicknames: next });
      applyProfile(updated);
    },
    [applyProfile]
  );

  const nicknameFor = useCallback(
    (username, fallback) => profile?.nicknames?.[username] || fallback || username,
    [profile?.nicknames]
  );

  const logout = async () => {
    await api.auth.logout();
    hardNavigate("/login");
  };

  if (loading) return <BrandLoader label="loading your profile" />;

  if (kicked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-warning/15 text-warning">
          <DoorOpen className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">You were kicked</h1>
        <p className="max-w-sm text-sm text-muted-foreground">A moderator removed you from this session. You can come back whenever you like.</p>
        <Button
          className="mt-2"
          onClick={() => {
            sessionStorage.setItem("tc_session_start", String(Date.now()));
            setKicked(false);
          }}
        >
          Rejoin
        </Button>
      </div>
    );
  }

  if (deviceBanned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-danger/15 text-danger">
          <Ban className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Device banned</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This device has been banned from accessing This-Cord.
          {deviceBanned.reason ? ` Reason: ${deviceBanned.reason}` : ""}
        </p>
        <Button variant="outline" onClick={logout} className="mt-2 border-border text-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>
    );
  }

  if (profile?.is_banned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-danger/15 text-danger">
          <Ban className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">You've been banned</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An admin removed your access to This-Cord. If you think this is a mistake, contact the owner.
        </p>
        <Button variant="outline" onClick={logout} className="mt-2 border-border text-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </div>
    );
  }

  const mutedUntil = profile?.muted_until ? new Date(profile.muted_until) : null;
  const isMuted = !!mutedUntil && mutedUntil.getTime() > Date.now();

  const value = {
    user,
    profile,
    config,
    setProfile: applyProfile,
    refresh,
    isAdmin: !!profile?.is_admin,
    isMod: !!(profile?.is_admin || profile?.moderator),
    isMuted,
    mutedUntil,
    nicknameFor,
    setNickname,
  };

  return (
    <ProfileContext.Provider value={value}>
      <UIProvider
        styleId={profile?.ui_style_id}
        colorMode={profile?.color_mode}
        paletteId={profile?.ui_custom?.palette}
        overrides={profile?.ui_custom?.overrides}
      >
        {children ?? <Outlet />}
      </UIProvider>
      {profile?.needs_name && (
        <NamePrompt
          profile={profile}
          onDone={(p) => {
            applyProfile(p);
            setShowDaily(canClaimDaily(p));
          }}
        />
      )}
      {!profile?.needs_name && showDaily && (
        <DailyReward
          profile={profile}
          config={config}
          onClaimed={async (updated, reward) => {
            setShowDaily(false);
            if (updated) {
              applyProfile(updated);
              if (reward) {
                playCoin();
                toast({ title: `+${reward} coins`, description: `${updated.daily_streak} day streak` });
              }
            }
          }}
        />
      )}
    </ProfileContext.Provider>
  );
}