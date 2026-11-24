import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { showNotification, getNotificationPermission } from "@/lib/notify";
import { playDing } from "@/lib/sound";
import { drawFaviconBadge } from "@/lib/faviconBadge";

const threadKey = (a, b) => [a, b].sort().join("_");

function isMentionForUser(data, userId, username) {
  if (!username) return false;
  const mentions = data.mentions || [];
  if (mentions.includes(username) || mentions.includes(userId)) return true;
  const content = data.content || "";
  if (content.includes(`@${username}`)) return true;
  if (content.includes("@everyone") || content.includes("@here")) return true;
  return false;
}

function isMuted(channelId, serverId, prefs) {
  if (!prefs) return false;
  const now = Date.now();
  const mutedChannels = prefs.muted_channels || {};
  const ch = mutedChannels[channelId];
  if (ch === "forever") return true;
  if (ch && new Date(ch).getTime() > now) return true;
  const mutedServers = prefs.muted_servers || {};
  const sv = mutedServers[serverId];
  if (sv === "forever") return true;
  if (sv && new Date(sv).getTime() > now) return true;
  return false;
}

function getNotifyLevel(channelId, serverId, prefs) {
  if (!prefs) return "all";
  const channels = prefs.channels || {};
  if (channels[channelId]) return channels[channelId];
  const servers = prefs.servers || {};
  if (servers[serverId]) return servers[serverId];
  return prefs.default || "all";
}

export default function useNotifications(profile, chat, applyProfile) {
  const userId = profile?.created_by_id;
  const username = profile?.username;
  const [unreadChannels, setUnreadChannels] = useState({});
  const [mentionMessages, setMentionMessages] = useState([]);
  const [replyMessages, setReplyMessages] = useState([]);
  const selectionRef = useRef(chat.selection);
  selectionRef.current = chat.selection;
  const prefsRef = useRef(profile?.notification_prefs || {});
  prefsRef.current = profile?.notification_prefs || {};
  const channelsRef = useRef(chat.channels);
  channelsRef.current = chat.channels;
  const selectChannelRef = useRef(chat.selectChannel);
  selectChannelRef.current = chat.selectChannel;

  // Clear unread for the active channel
  useEffect(() => {
    if (chat.selection.type === "channel") {
      const cid = chat.selection.channel.id;
      setUnreadChannels((prev) => {
        if (!prev[cid]) return prev;
        const next = { ...prev };
        delete next[cid];
        return next;
      });
    }
  }, [chat.selection]);

  // ChannelMessage subscription
  useEffect(() => {
    if (!userId || !username) return undefined;
    const unsub = api.entities.ChannelMessage.subscribe((event) => {
      if (event?.type !== "create") return;
      const data = event.data || {};
      if (data.created_by_id === userId) return;
      const sel = selectionRef.current;
      const isActive = sel.type === "channel" && sel.channel?.id === data.channel_id;
      const mentioned = isMentionForUser(data, userId, username);
      const serverId = data.server_id;

      if (!isActive) {
        setUnreadChannels((prev) => {
          const cur = prev[data.channel_id] || { count: 0, mention: false, serverId };
          return {
            ...prev,
            [data.channel_id]: {
              count: cur.count + 1,
              mention: cur.mention || mentioned,
              serverId,
            },
          };
        });
      }

      if (mentioned) {
        setMentionMessages((prev) => [{ ...data, _type: "channel" }, ...prev].slice(0, 50));
      }
      if (data.reply_to_id) {
        setReplyMessages((prev) => [{ ...data, _type: "channel" }, ...prev].slice(0, 50));
      }

      // Desktop notification
      const prefs = prefsRef.current;
      const dnd = prefs.dnd || false;
      const suppressEveryone = prefs.suppress_everyone || false;
      const isEveryone = (data.content || "").includes("@everyone") || (data.content || "").includes("@here");
      const level = getNotifyLevel(data.channel_id, serverId, prefs);
      const muted = isMuted(data.channel_id, serverId, prefs);

      if (muted || level === "none") return;
      if (level === "mentions" && !mentioned) return;
      if (dnd && !mentioned) return;
      if (suppressEveryone && isEveryone && !mentioned) return;

      playDing();
      if (getNotificationPermission() === "granted") {
        const author = data.author_name || data.author_username || "Someone";
        const preview = data.content || (data.attachment_url ? "Sent an attachment" : "");
        showNotification(`#${data.channel_id} — ${author}`, {
          body: preview.slice(0, 100),
          tag: `channel:${data.channel_id}`,
          onClick: () => {
            const ch = channelsRef.current.find((c) => c.id === data.channel_id);
            if (ch) selectChannelRef.current(ch, serverId);
          },
        });
      }
    });
    return () => unsub?.();
  }, [userId, username]);

  // DirectMessage subscription for mentions/replies tracking
  useEffect(() => {
    if (!userId || !username) return undefined;
    const unsub = api.entities.DirectMessage.subscribe((event) => {
      if (event?.type !== "create") return;
      const data = event.data || {};
      if (data.to_user_id !== userId) return;
      if (data.created_by_id === userId) return;
      const mentioned = isMentionForUser(data, userId, username);
      if (mentioned) {
        setMentionMessages((prev) => [{ ...data, _type: "dm" }, ...prev].slice(0, 50));
      }
      if (data.reply_to_id) {
        setReplyMessages((prev) => [{ ...data, _type: "dm" }, ...prev].slice(0, 50));
      }
    });
    return () => unsub?.();
  }, [userId, username]);

  // Compute totals
  const totalChannelUnread = Object.values(unreadChannels).reduce((s, c) => s + c.count, 0);
  const totalChannelMentions = Object.values(unreadChannels).filter((c) => c.mention).length;
  const totalDmUnread = (chat.conversations || []).filter((c) => c.unread).length;
  const totalUnread = totalChannelUnread + totalDmUnread;
  const totalMentions = totalChannelMentions + mentionMessages.filter((m) => m._type === "dm").length;

  // Server-level aggregation
  const serverUnread = {};
  for (const [cid, info] of Object.entries(unreadChannels)) {
    const sid = info.serverId;
    if (!sid) continue;
    if (!serverUnread[sid]) serverUnread[sid] = { count: 0, mention: false };
    serverUnread[sid].count += info.count;
    if (info.mention) serverUnread[sid].mention = true;
  }

  // Favicon + title
  useEffect(() => {
    const total = totalUnread;
    const mentions = totalMentions;
    if (total > 0) {
      document.title = `(${total}) This-Cord`;
    } else {
      document.title = "This-Cord";
    }
    drawFaviconBadge(total, mentions);
  }, [totalUnread, totalMentions]);

  const clearChannelUnread = useCallback((channelId) => {
    setUnreadChannels((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadChannels({});
    setMentionMessages([]);
    setReplyMessages([]);
    chat.loadConversations();
  }, [chat]);

  const markServerRead = useCallback((serverId) => {
    setUnreadChannels((prev) => {
      const next = {};
      for (const [cid, info] of Object.entries(prev)) {
        if (info.serverId !== serverId) next[cid] = info;
      }
      return next;
    });
  }, []);

  const updateNotificationPrefs = useCallback(async (updates) => {
    if (!profile?.id) return;
    const current = profile.notification_prefs || {};
    const next = { ...current, ...updates };
    const updated = await api.entities.Profile.update(profile.id, { notification_prefs: next });
    applyProfile?.(updated);
  }, [profile?.id, applyProfile]);

  return {
    unreadChannels,
    mentionMessages,
    replyMessages,
    totalUnread,
    totalMentions,
    serverUnread,
    totalDmUnread,
    clearChannelUnread,
    markAllRead,
    markServerRead,
    updateNotificationPrefs,
    notificationPrefs: profile?.notification_prefs || {},
  };
}