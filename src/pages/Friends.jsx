import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, UserPlus, Clock, Ban, Check, X, Search, MessageSquare, ArrowLeft } from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";
import useFriends from "@/hooks/useFriends";
import { isOnline } from "@/lib/economy";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import { cn } from "@/lib/utils";
import { api } from "@/api/client";

export default function Friends() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const friends = useFriends(profile);
  const [tab, setTab] = useState("online");
  const [addOpen, setAddOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [search, setSearch] = useState("");

  const allProfiles = useAllProfiles();

  const tabConfig = [
    { id: "online", label: "Online", icon: Users, count: 0 },
    { id: "all", label: "All", icon: Users, count: friends.accepted.length },
    { id: "pending", label: "Pending", icon: Clock, count: friends.pendingIncoming.length },
    { id: "blocked", label: "Blocked", icon: Ban, count: friends.blocked.length },
  ];

  const getFriendProfile = (f) => {
    const targetId = f.requester_user_id === profile.created_by_id ? f.recipient_user_id : f.requester_user_id;
    return allProfiles.find((p) => p.created_by_id === targetId);
  };

  const onlineFriends = friends.accepted.filter((f) => {
    const p = getFriendProfile(f);
    return p && isOnline(p.last_seen) && p.presence_status !== "invisible";
  });

  const displayed = tab === "online" ? onlineFriends : tab === "all" ? friends.accepted : tab === "pending" ? friends.pendingIncoming : friends.blocked;

  const sendRequest = async () => {
    await friends.sendRequest(addUsername);
    setAddUsername("");
    setAddOpen(false);
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <button onClick={() => navigate("/")} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-[15px] font-bold text-foreground">Friends</h2>
        </div>
        <div className="px-3">
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <UserPlus className="h-4 w-4" /> Add Friend
          </button>
        </div>
        {addOpen && (
          <div className="px-3 pt-2">
            <input
              autoFocus
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendRequest()}
              placeholder="Enter username"
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">You can add friends by their username.</p>
          </div>
        )}
        <div className="mt-2 flex-1 overflow-y-auto px-2">
          {tabConfig.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition",
                tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{t.label}</span>
              {t.count > 0 && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">{tabConfig.find((t) => t.id === tab)?.label}</h1>
            <p className="text-[11px] text-muted-foreground">
              {tab === "pending" ? `${friends.pendingIncoming.length} pending request(s)` : tab === "blocked" ? `${friends.blocked.length} blocked user(s)` : `${displayed.length} friend(s)`}
            </p>
          </div>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg border border-border bg-muted/50 py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {tab === "pending" ? (
            friends.pendingIncoming.length === 0 ? (
              <EmptyState icon={Clock} text="No pending friend requests" />
            ) : (
              friends.pendingIncoming
                .filter((f) => {
                  const p = getFriendProfile(f);
                  if (!p) return false;
                  return search ? p.username.includes(search) || (p.display_name || "").includes(search) : true;
                })
                .map((f) => {
                  const p = getFriendProfile(f);
                  if (!p) return null;
                  return (
                    <FriendRow key={f.id} player={p} search={search}>
                      <button onClick={() => friends.acceptRequest(f.id)} className="grid h-8 w-8 place-items-center rounded-full bg-success/15 text-success transition hover:bg-success/25">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => friends.ignoreRequest(f.id)} className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </FriendRow>
                  );
                })
            )
          ) : tab === "blocked" ? (
            friends.blocked.length === 0 ? (
              <EmptyState icon={Ban} text="No blocked users" />
            ) : (
              friends.blocked.map((f) => (
                <FriendRow key={f.id} player={{ username: f.recipient_username, display_name: "" }} search={search}>
                  <button onClick={() => friends.unblock(f.id)} className="rounded-lg bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground">
                    Unblock
                  </button>
                </FriendRow>
              ))
            )
          ) : displayed.length === 0 ? (
            <EmptyState icon={Users} text={tab === "online" ? "No friends online" : "No friends yet"} />
          ) : (
            displayed
              .filter((f) => {
                const p = getFriendProfile(f);
                if (!p) return false;
                return search ? p.username.includes(search) || (p.display_name || "").includes(search) : true;
              })
              .map((f) => {
                const p = getFriendProfile(f);
                if (!p) return null;
                const online = isOnline(p.last_seen) && p.presence_status !== "invisible";
                return (
                  <FriendRow key={f.id} player={p} search={search} online={online}>
                    <button
                      onClick={() => navigate(`/?dm=${p.username}`)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => friends.removeFriend(f.id)}
                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-danger"
                    >
                      Remove
                    </button>
                  </FriendRow>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

function FriendRow({ player, search, online, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/50"
    >
      <div className="relative">
        <ProfileAvatar avatarId={player.avatar_id} size={36} />
        {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-online ring-2 ring-background" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">
          {player.display_name || player.username}
          <span className="ml-1.5 text-[11px] text-muted-foreground">@{player.username}</span>
        </p>
        {player.custom_status && <p className="truncate text-[11px] text-muted-foreground">{player.custom_status}</p>}
      </div>
      <div className="flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">{children}</div>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-40" />
      <p className="text-[13px]">{text}</p>
    </div>
  );
}

// Helper hook to load all profiles (for friend lookups)
function useAllProfiles() {
  const [profiles, setProfiles] = useState([]);
  React.useEffect(() => {
    (async () => {
      try {
        const page = await api.entities.Profile.filter({}, { sort: "created_date", limit: 300 });
        setProfiles(page?.items || []);
      } catch { /* ignore */ }
    })();
  }, []);
  return profiles;
}