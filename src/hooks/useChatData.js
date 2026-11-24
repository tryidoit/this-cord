import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { toast } from "@/components/ui/use-toast";

const threadKey = (a, b) => [a, b].sort().join("_");

export default function useChatData(profile, applyProfile) {
  const userId = profile?.user_id || profile?.created_by_id;
  const [servers, setServers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selection, setSelection] = useState({ type: "home" });
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [players, setPlayers] = useState({});
  const [channelReaders, setChannelReaders] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [typing, setTyping] = useState([]);
  const [pollVotes, setPollVotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  // Refs mirror state for use inside stable callbacks without re-creating them.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;
  const pollVotesRef = useRef(pollVotes);
  pollVotesRef.current = pollVotes;
  // Receipt writes are throttled so a fast conversation can't flood the API.
  const receiptRef = useRef({});
  const typingRef = useRef({});

  const loadPlayers = useCallback(async () => {
    const page = await api.entities.Profile.filter({}, { sort: "created_date", limit: 300 });
    const map = {};
    (page?.items || []).forEach((p) => {
      map[p.username] = p;
    });
    setPlayers(map);
  }, []);

  const loadServers = useCallback(async () => {
    const page = await api.entities.Server.filter({ member_user_ids: userId }, { sort: "created_date", limit: 50 });
    const list = page?.items || [];
    setServers(list);
    setActiveServerId((current) => current || list[0]?.id || null);
  }, [userId]);

  const loadChannels = useCallback(async (serverId) => {
    if (!serverId) {
      setChannels([]);
      setCategories([]);
      setThreads([]);
      return;
    }
    const page = await api.entities.Channel.filter({ server_id: serverId }, { sort: "position", limit: 100 });
    const all = page?.items || [];
    setChannels(all.filter((ch) => ch.type !== "thread" && !ch.parent_channel_id));
    setThreads(all.filter((ch) => ch.type === "thread" || ch.parent_channel_id));
    const catPage = await api.entities.ChannelCategory.filter({ server_id: serverId }, { sort: "position", limit: 50 });
    setCategories(catPage?.items || []);
  }, []);

  // Sync member_user_ids on Server, all Channels, and all ServerMembers when someone joins.

  // ————— read receipts —————
  const markDmRead = useCallback(
    async (peerId) => {
      if (!userId || !peerId) return;
      const ts = Date.now();
      if (ts - (receiptRef.current[`dm:${peerId}`] || 0) < 5000) return;
      receiptRef.current[`dm:${peerId}`] = ts;
      const page = await api.entities.DirectMessage.filter(
        { thread_key: threadKey(userId, peerId), to_user_id: userId },
        { sort: "-created_date", limit: 30 }
      );
      const unread = (page?.items || []).filter((m) => !m.read_at);
      if (!unread.length) return;
      const now = new Date().toISOString();
      await Promise.all(unread.map((m) => api.entities.DirectMessage.update(m.id, { read_at: now }).catch(() => {})));
    },
    [userId]
  );

  const markChannelRead = useCallback(
    async (channelId) => {
      if (!userId || !channelId || !profile?.username) return;
      const ts = Date.now();
      if (ts - (receiptRef.current[channelId] || 0) < 10000) return;
      receiptRef.current[channelId] = ts;
      const now = new Date().toISOString();
      try {
        const mine = await api.entities.ChannelRead.filter({ channel_id: channelId, user_id: userId }, { limit: 1 });
        const row = mine?.items?.[0];
        if (row) await api.entities.ChannelRead.update(row.id, { seen_at: now });
        else
          await api.entities.ChannelRead.create({
            channel_id: channelId,
            user_id: userId,
            username: profile.username,
            seen_at: now,
          });
      } catch {
        /* receipt unavailable */
      }
    },
    [userId, profile?.username]
  );

  const loadMessages = useCallback(async () => {
    const sel = selectionRef.current;
    if (!userId) return;
    const nowIso = new Date().toISOString();
    if (sel.type === "channel") {
      const page = await api.entities.ChannelMessage.filter(
        { channel_id: sel.channel.id },
        { sort: "-created_date", limit: 80 }
      );
      // Hide scheduled messages until their visible_at time
      const visible = (page?.items || []).filter((m) => !m.visible_at || m.visible_at <= nowIso);
      setMessages([...visible].reverse());
      markChannelRead(sel.channel.id);
    } else if (sel.type === "dm") {
      const page = await api.entities.DirectMessage.filter(
        { thread_key: threadKey(userId, sel.peer.user_id) },
        { sort: "-created_date", limit: 80 }
      );
      const visible = (page?.items || []).filter((m) => !m.visible_at || m.visible_at <= nowIso);
      setMessages([...visible].reverse());
      markDmRead(sel.peer.user_id);
    } else {
      setMessages([]);
      setChannelReaders([]);
    }
  }, [userId, markChannelRead, markDmRead]);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    const page = await api.entities.DirectMessage.filter(
      { $or: [{ from_user_id: userId }, { to_user_id: userId }] },
      { sort: "-created_date", limit: 200 }
    );
    const map = new Map();
    (page?.items || []).forEach((m) => {
      const isMine = m.from_user_id === userId;
      const peerUsername = isMine ? m.to_username : m.from_username;
      const peerUserId = isMine ? m.to_user_id : m.from_user_id;
      if (!peerUsername || map.has(peerUsername)) return;
      map.set(peerUsername, {
        peer_username: peerUsername,
        peer_user_id: peerUserId,
        last: m.content || (m.attachment_url ? "sent an attachment" : ""),
        at: m.created_date,
        unread: !isMine && !m.read_at,
      });
    });
    setConversations([...map.values()]);
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    loadPlayers();
    loadServers();
    loadConversations();
  }, [profile, loadPlayers, loadServers, loadConversations]);

  useEffect(() => {
    if (activeServerId) loadChannels(activeServerId);
  }, [activeServerId, loadChannels]);

  const loadReaders = useCallback(async (channelId) => {
    if (!channelId) return;
    const page = await api.entities.ChannelRead.filter({ channel_id: channelId }, { limit: 100 });
    setChannelReaders(page?.items || []);
  }, []);

  // Receipts: written once on entry and refreshed every minute — not on every message.
  useEffect(() => {
    if (selection.type !== "channel") return undefined;
    const channelId = selection.channel.id;
    markChannelRead(channelId);
    loadReaders(channelId).catch(() => {});
    const timer = setInterval(() => {
      markChannelRead(channelId);
      loadReaders(channelId).catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, [selection, markChannelRead, loadReaders]);

  // ─── reactions ───
  const loadReactions = useCallback(async () => {
    const sel = selectionRef.current;
    if (sel.type === "channel") {
      const page = await api.entities.Reaction.filter({ scope: sel.channel.id }, { limit: 200 });
      setReactions(page?.items || []);
    } else if (sel.type === "dm" && userId) {
      const page = await api.entities.Reaction.filter({ scope: threadKey(userId, sel.peer.user_id) }, { limit: 200 });
      setReactions(page?.items || []);
    } else {
      setReactions([]);
    }
  }, [userId]);

  const toggleReaction = useCallback(async (message, emoji, reactionType = "emoji") => {
    const existing = reactionsRef.current.find((r) => r.message_id === message.id && r.user_id === userId && r.emoji === emoji);
    if (existing) {
      await api.entities.Reaction.delete(existing.id).catch(() => {});
    } else {
      const sel = selectionRef.current;
      const scope = sel.type === "channel" ? sel.channel.id : (userId ? threadKey(userId, sel.peer.user_id) : "");
      const isDm = !!message.thread_key;
      await api.entities.Reaction.create({
        message_id: message.id,
        message_type: isDm ? "dm" : "channel",
        scope,
        user_id: userId,
        username: profile?.username,
        emoji,
        reaction_type: reactionType,
      }).catch(() => {});
    }
    await loadReactions();
  }, [userId, profile?.username, loadReactions]);

  const superReact = useCallback(async (message, emoji) => {
    if (!profile) return;
    const cost = 50;
    const fresh = await api.entities.Profile.get(profile.id).catch(() => profile);
    if ((fresh?.points || 0) < cost) {
      toast({ title: "Not enough coins", description: "Super reactions cost 50 coins.", variant: "destructive" });
      return;
    }
    // Deduct coins
    const updated = await api.entities.Profile.update(fresh.id, { points: (fresh.points || 0) - cost }).catch(() => fresh);
    applyProfile?.(updated);
    const sel = selectionRef.current;
    const scope = sel.type === "channel" ? sel.channel.id : (userId ? threadKey(userId, sel.peer.user_id) : "");
    const isDm = !!message.thread_key;
    await api.entities.Reaction.create({
      message_id: message.id,
      message_type: isDm ? "dm" : "channel",
      scope,
      user_id: userId,
      username: profile.username,
      emoji,
      reaction_type: "super",
    }).catch(() => {});
    await loadReactions();
  }, [profile, userId, applyProfile, loadReactions]);

  const sendVoiceMessage = useCallback(async (assetRef, durationSec) => {
    if (!profile || !assetRef) return;
    const sel = selectionRef.current;
    if (sel.type === "channel") {
      const server = servers.find((s) => s.id === sel.channel.server_id);
      await api.entities.ChannelMessage.create({
        channel_id: sel.channel.id,
        server_id: sel.channel.server_id,
        author_username: profile.username,
        author_name: profile.display_name || profile.username,
        author_avatar: profile.avatar_id,
        content: "",
        attachment_url: assetRef,
        attachment_type: "voice",
        member_user_ids: server?.member_user_ids || [userId],
      });
      if (sel.channel.type === "thread" || sel.channel.parent_channel_id) {
        api.entities.Channel.update(sel.channel.id, { last_activity_at: new Date().toISOString() }).catch(() => {});
      }
    } else if (sel.type === "dm") {
      await api.entities.DirectMessage.create({
        thread_key: threadKey(userId, sel.peer.user_id),
        from_user_id: userId,
        to_user_id: sel.peer.user_id,
        from_username: profile.username,
        to_username: sel.peer.username,
        content: "",
        attachment_url: assetRef,
        attachment_type: "voice",
      });
    }
    await loadMessages();
    await loadConversations();
  }, [profile, userId, servers, loadMessages, loadConversations]);

  const addTextReaction = useCallback(async (message, text) => {
    // Limit 3 text reactions per user per message
    const userTextReactions = reactionsRef.current.filter(
      (r) => r.message_id === message.id && r.user_id === userId && r.reaction_type === "text"
    );
    if (userTextReactions.length >= 3) {
      toast({ title: "Limit reached", description: "Maximum 3 text reactions per message.", variant: "destructive" });
      return;
    }
    const existing = reactionsRef.current.find((r) => r.message_id === message.id && r.user_id === userId && r.emoji === text);
    if (existing) return;
    const sel = selectionRef.current;
    const scope = sel.type === "channel" ? sel.channel.id : (userId ? threadKey(userId, sel.peer.user_id) : "");
    const isDm = !!message.thread_key;
    await api.entities.Reaction.create({
      message_id: message.id,
      message_type: isDm ? "dm" : "channel",
      scope,
      user_id: userId,
      username: profile?.username,
      emoji: text,
      reaction_type: "text",
    }).catch(() => {});
    await loadReactions();
  }, [userId, profile?.username, loadReactions]);

  // ─── typing indicators ───
  const loadTyping = useCallback(async () => {
    const sel = selectionRef.current;
    let scope;
    if (sel.type === "channel") scope = sel.channel.id;
    else if (sel.type === "dm" && userId) scope = threadKey(userId, sel.peer.user_id);
    else { setTyping([]); return; }
    const page = await api.entities.TypingIndicator.filter({ scope }, { limit: 50 });
    const now = Date.now();
    setTyping((page?.items || []).filter((t) => new Date(t.expires_at).getTime() > now));
  }, [userId]);

  const setTypingIndicator = useCallback(async () => {
    const sel = selectionRef.current;
    if (!userId || !profile?.username) return;
    let scope;
    if (sel.type === "channel") scope = sel.channel.id;
    else if (sel.type === "dm") scope = threadKey(userId, sel.peer.user_id);
    else return;
    const now = Date.now();
    if (now - (typingRef.current[scope] || 0) < 4000) return;
    typingRef.current[scope] = now;
    const expires = new Date(now + 6000).toISOString();
    // Delete old typing record and create new one
    try {
      const existing = await api.entities.TypingIndicator.filter({ scope, user_id: userId }, { limit: 1 });
      if (existing?.items?.[0]) {
        await api.entities.TypingIndicator.update(existing.items[0].id, { expires_at: expires });
      } else {
        await api.entities.TypingIndicator.create({ scope, user_id: userId, username: profile.username, expires_at: expires });
      }
    } catch { /* ignore */ }
  }, [userId, profile?.username]);

  // Typing indicators expire on their own; drop stale ones without refetching.
  useEffect(() => {
    if (!typing.length) return undefined;
    const t = setInterval(() => {
      const now = Date.now();
      setTyping((list) => { const next = list.filter((x) => new Date(x.expires_at).getTime() > now); return next.length === list.length ? list : next; });
    }, 2000);
    return () => clearInterval(t);
  }, [typing.length]);

  // ─── polls ───
  const loadPollVotes = useCallback(async () => {
    const sel = selectionRef.current;
    const pollMessages = messagesRef.current.filter((m) => m.poll_data);
    if (pollMessages.length === 0) { setPollVotes([]); return; }
    const ids = pollMessages.map((m) => m.id);
    try {
      const page = await api.entities.PollVote.filter({ message_id: { $in: ids } }, { limit: 500 });
      setPollVotes(page?.items || []);
    } catch { setPollVotes([]); }
  }, []);

  useEffect(() => {
    loadMessages();
    loadReactions();
    loadTyping();
    loadPollVotes();
  }, [selection, loadMessages, loadReactions, loadTyping, loadPollVotes]);

  const votePoll = useCallback(async (message, optionIndices) => {
    if (!userId) return;
    // Remove existing votes by this user on this message
    const existing = pollVotesRef.current.filter((v) => v.message_id === message.id && v.user_id === userId);
    await Promise.all(existing.map((v) => api.entities.PollVote.delete(v.id).catch(() => {})));
    // Add new votes
    const isDm = !!message.thread_key;
    await Promise.all(optionIndices.map((idx) =>
      api.entities.PollVote.create({
        message_id: message.id,
        message_type: isDm ? "dm" : "channel",
        option_index: idx,
        user_id: userId,
        username: profile?.username,
      }).catch(() => {})
    ));
    await loadPollVotes();
  }, [userId, profile?.username, loadPollVotes]);

  const endPoll = useCallback(async (message) => {
    const isDm = !!message.thread_key;
    const updated = { ...message.poll_data, end_time: new Date().toISOString() };
    if (isDm) {
      await api.entities.DirectMessage.update(message.id, { poll_data: updated });
    } else {
      await api.entities.ChannelMessage.update(message.id, { poll_data: updated });
    }
    await loadMessages();
  }, [loadMessages]);

  // ─── pinning ───
  const togglePin = useCallback(async (message) => {
    const isDm = !!message.thread_key;
    const newPinned = !message.pinned;
    if (isDm) {
      await api.entities.DirectMessage.update(message.id, { pinned: newPinned });
    } else {
      await api.entities.ChannelMessage.update(message.id, { pinned: newPinned });
    }
    await loadMessages();
    toast({ title: newPinned ? "Message pinned" : "Message unpinned" });
  }, [loadMessages]);

  // ─── bookmarks ───
  const addBookmark = useCallback(async (message) => {
    const isDm = !!message.thread_key;
    await api.entities.MessageBookmark.create({
      message_id: message.id,
      message_type: isDm ? "dm" : "channel",
      content_snapshot: (message.content || "").slice(0, 500),
      channel_id: message.channel_id,
      server_id: message.server_id,
    }).catch(() => {});
    toast({ title: "Message bookmarked" });
  }, []);

  // ─── mark unread ───
  const markUnread = useCallback(async (message) => {
    const sel = selectionRef.current;
    if (sel.type !== "channel" || !userId || !profile?.username) return;
    const msgTime = new Date(message.created_date).toISOString();
    try {
      const mine = await api.entities.ChannelRead.filter({ channel_id: sel.channel.id, user_id: userId }, { limit: 1 });
      const row = mine?.items?.[0];
      if (row) {
        // Set seen_at to just before this message
        const before = new Date(new Date(message.created_date).getTime() - 1000).toISOString();
        await api.entities.ChannelRead.update(row.id, { seen_at: before });
      }
    } catch { /* ignore */ }
  }, [userId, profile?.username]);

  const forwardMessage = useCallback(async (message, targetPeer) => {
    if (!profile || !targetPeer) return;
    await api.entities.DirectMessage.create({
      thread_key: threadKey(userId, targetPeer.user_id),
      from_user_id: userId,
      to_user_id: targetPeer.user_id,
      from_username: profile.username,
      to_username: targetPeer.username,
      content: message.content || "",
      attachment_url: message.attachment_url || "",
      attachment_type: message.attachment_type || "",
    });
    toast({ title: "Message forwarded" });
  }, [userId, profile]);

  // Live updates: bursts of events collapse into a single reload, and only the
  // conversation you actually have open is refetched.
  // Apply a live event straight to a list instead of refetching the whole page.
  const upsertById = (list, evt, cap = 300) => {
    if (evt.type === "delete") return list.filter((x) => x.id !== evt.id);
    const rec = { ...(evt.data || {}), id: evt.id };
    const i = list.findIndex((x) => x.id === evt.id);
    if (i >= 0) { const next = list.slice(); next[i] = { ...list[i], ...rec }; return next; }
    const next = [...list, rec];
    return next.length > cap ? next.slice(next.length - cap) : next;
  };

  useEffect(() => {
    if (!userId) return undefined;
    const timers = {};
    const later = (key, fn, ms) => {
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        delete timers[key];
        fn().catch(() => {});
      }, ms);
    };

    const unsubDm = api.entities.DirectMessage.subscribe((event) => {
      const data = event?.data || {};
      if (data.from_user_id !== userId && data.to_user_id !== userId) return;
      if (data.created_by_id && data.created_by_id === userId) return;
      later("conversations", loadConversations, 900);
      const sel = selectionRef.current;
      if (sel.type === "dm" && (data.from_user_id === sel.peer.user_id || data.to_user_id === sel.peer.user_id)) {
        if (event.id && event.type !== "delete" && data.visible_at && data.visible_at > new Date().toISOString()) return;
        setMessages((list) => upsertById(list, event));
        if (event.type === "create") markDmRead(sel.peer.user_id);
      }
    });
    const unsubChannel = api.entities.ChannelMessage.subscribe((event) => {
      const data = event?.data || {};
      const sel = selectionRef.current;
      if (sel.type !== "channel" || data.channel_id !== sel.channel.id) return;
      if (data.created_by_id && data.created_by_id === userId) return;
      if (event.type !== "delete" && data.visible_at && data.visible_at > new Date().toISOString()) return;
      setMessages((list) => upsertById(list, event));
    });
    const unsubReads = api.entities.ChannelRead.subscribe(() => {
      const sel = selectionRef.current;
      if (sel.type !== "channel") return;
      later("readers", () => loadReaders(sel.channel.id), 1500);
    });
    const scopeNow = () => {
      const sel = selectionRef.current;
      return sel.type === "channel" ? sel.channel.id : sel.type === "dm" ? threadKey(userId, sel.peer.user_id) : null;
    };
    const unsubReactions = api.entities.Reaction.subscribe((event) => {
      if (event.type !== "delete" && event.data?.scope !== scopeNow()) return;
      setReactions((list) => upsertById(list, event, 2000));
    });
    const unsubTyping = api.entities.TypingIndicator.subscribe((event) => {
      if (event.type !== "delete" && event.data?.scope !== scopeNow()) return;
      if (event.data?.user_id === userId) return;
      setTyping((list) => upsertById(list, event, 50));
    });
    const unsubVotes = api.entities.PollVote.subscribe(() => {
      later("votes", loadPollVotes, 500);
    });

    return () => {
      unsubDm?.();
      unsubChannel?.();
      unsubReads?.();
      unsubReactions?.();
      unsubTyping?.();
      unsubVotes?.();
      Object.values(timers).forEach(clearTimeout);
    };
  }, [userId, loadConversations, loadReaders, loadPollVotes, markDmRead]);

  const selectDm = (peer) => {
    setSelection({ type: "dm", peer });
  };

  const openServer = async (serverId) => {
    // Paid servers charge once, the first time you walk in.
    try {
      const server = servers.find((s) => s.id === serverId) || (await api.entities.Server.get(serverId));

      const isMember = server?.owner_username === profile?.username || (server?.member_user_ids || []).includes(userId);
      const needsCode = server?.invite_only && !isMember;
      const cost = Number(server?.join_cost) || 0;
      if (!isMember && (needsCode || cost > 0)) {
        const member = await api.entities.ServerMember.filter({ server_id: serverId, user_id: userId }, { limit: 1 });
        if (!(member?.items?.length > 0)) {
          let code;
          if (needsCode) {
            code = window.prompt(`"${server.name}" is invite-only. Enter the invite code:`);
            if (!code) return;
          }
          if (cost > 0 && !window.confirm(`${server.name} costs ${cost} coins to enter. Join for ${cost} coins?`)) return;
          try {
            await api.servers.join(serverId, code);
            const fresh = await api.entities.Profile.get(profile.id);
            applyProfile?.(fresh);
            toast({ title: `Joined ${server.name}`, description: cost > 0 ? `-${cost} coins` : undefined });
          } catch (err) {
            toast({ title: "Couldn't join", description: err?.message, variant: "destructive" });
            return;
          }
        }
      }
    } catch {
      /* pricing is best effort — never block a server on it */
    }
    setActiveServerId(serverId);
    const page = await api.entities.Channel.filter({ server_id: serverId }, { sort: "position", limit: 100 });
    const all = page?.items || [];
    setChannels(all.filter((ch) => ch.type !== "thread" && !ch.parent_channel_id));
    setThreads(all.filter((ch) => ch.type === "thread" || ch.parent_channel_id));
    const catPage = await api.entities.ChannelCategory.filter({ server_id: serverId }, { sort: "position", limit: 50 });
    setCategories(catPage?.items || []);
    const firstRegular = all.find((ch) => ch.type !== "thread" && !ch.parent_channel_id);
    if (firstRegular) setSelection({ type: "channel", channel: firstRegular, serverId });
  };

  const joinInviteServer = async (code) => {
    const trimmed = (code || "").trim().toUpperCase();
    if (!trimmed) return false;
    try {
      const { server } = await api.servers.join((await api.servers.lookup(trimmed)).id, trimmed);
      await loadServers();
      await openServer(server.id);
      return true;
    } catch {
      return false;
    }
  };

  const leaveServer = async (serverId) => {
    if (!userId) return;
    try {
      await api.servers.leave(serverId);
    } catch (err) {
      toast({ title: "Couldn't leave server", description: err?.message, variant: "destructive" });
      return;
    }
    await loadServers();
    const remaining = servers.filter((s) => s.id !== serverId);
    if (activeServerId === serverId) {
      setActiveServerId(remaining[0]?.id || null);
      setSelection({ type: "home" });
    }
  };

  const editMessage = async (message, newContent) => {
    const text = (newContent || "").trim().slice(0, 2000);
    if (!text) return;
    const isDm = !!message.thread_key;
    if (isDm) {
      await api.entities.DirectMessage.update(message.id, { content: text, edited: true });
    } else {
      await api.entities.ChannelMessage.update(message.id, { content: text, edited: true });
    }
    await loadMessages();
  };

  const deleteMessage = async (message) => {
    const isDm = !!message.thread_key;
    if (isDm) {
      await api.entities.DirectMessage.delete(message.id);
    } else {
      await api.entities.ChannelMessage.delete(message.id);
    }
    await loadMessages();
  };

  const reportMessage = async (message, reason, details) => {
    const isDm = !!message.thread_key;
    await api.entities.MessageReport.create({
      message_id: message.id,
      message_type: isDm ? "dm" : "channel",
      channel_id: message.channel_id,
      server_id: message.server_id,
      author_username: message.from_username || message.author_username,
      reporter_username: profile.username,
      reporter_user_id: userId,
      reason,
      details,
      content_snapshot: (message.content || "").slice(0, 500),
      status: "pending",
    });
  };

  const selectChannel = (channel, serverId) => {
    setSelection({ type: "channel", channel, serverId: serverId || channel.server_id });
  };

  const send = async (content, attachment, replyData, scheduleAt) => {
    const text = (content || "").trim();
    if ((!text && !attachment?.url && !attachment?.poll) || !profile) return;
    const sel = selectionRef.current;
    const media = attachment?.url
      ? { attachment_url: attachment.url, attachment_type: attachment.type || "image" }
      : {};
    const replyFields = replyData ? {
      reply_to_id: replyData.id,
      reply_to_username: replyData.username,
      reply_to_name: replyData.name,
      reply_to_content: (replyData.content || "").slice(0, 100),
    } : {};
    const pollFields = attachment?.poll ? { poll_data: attachment.poll } : {};
    const scheduleFields = scheduleAt ? { visible_at: scheduleAt } : {};
    if (sel.type === "channel") {
      const server = servers.find((s) => s.id === sel.channel.server_id);
      await api.entities.ChannelMessage.create({
        channel_id: sel.channel.id,
        server_id: sel.channel.server_id,
        author_username: profile.username,
        author_name: profile.display_name || profile.username,
        author_avatar: profile.avatar_id,
        content: text.slice(0, 2000),
        member_user_ids: server?.member_user_ids || [userId],
        ...media,
        ...replyFields,
        ...pollFields,
        ...scheduleFields,
      });
      // Update last activity for threads (for auto-archive computation)
      if (sel.channel.type === "thread" || sel.channel.parent_channel_id) {
        api.entities.Channel.update(sel.channel.id, { last_activity_at: new Date().toISOString() }).catch(() => {});
      }
    } else if (sel.type === "dm") {
      await api.entities.DirectMessage.create({
        thread_key: threadKey(userId, sel.peer.user_id),
        from_user_id: userId,
        to_user_id: sel.peer.user_id,
        from_username: profile.username,
        to_username: sel.peer.username,
        content: text.slice(0, 2000),
        ...media,
        ...replyFields,
        ...pollFields,
        ...scheduleFields,
      });
    }
    await loadMessages();
    await loadConversations();
  };

  const createServer = async ({ name, icon, color, description, join_cost, invite_only, invite_code, discoverable }) => {
    const server = await api.entities.Server.create({
      name,
      icon: icon || "🛰️",
      color: color || "#8B5CF6",
      description: description || "",
      owner_username: profile.username,
      join_cost: Math.max(0, Math.round(Number(join_cost) || 0)),
      invite_only: !!invite_only,
      invite_code: invite_code || undefined,
      discoverable: !!discoverable,
      member_user_ids: [userId],
    });
    await api.entities.ServerMember.create({ server_id: server.id, user_id: userId, username: profile.username, paid: 0, server_member_user_ids: [userId] }).catch(() => {});
    const starter = await api.entities.Channel.create({
      server_id: server.id,
      name: "general",
      topic: "the first channel",
      type: "text",
      position: 0,
      member_user_ids: [userId],
    });
    await loadServers();
    setActiveServerId(server.id);
    await loadChannels(server.id);
    setSelection({ type: "channel", channel: starter, serverId: server.id });
    return server;
  };

  const createChannel = async (opts) => {
    if (!activeServerId) return;
    const name = (typeof opts === "string" ? opts : opts?.name || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!name) return;
    const server = servers.find((s) => s.id === activeServerId);
    const channel = await api.entities.Channel.create({
      server_id: activeServerId,
      name,
      type: opts?.type || "text",
      topic: opts?.topic,
      category_id: opts?.category_id,
      slowmode: opts?.slowmode || 0,
      nsfw: opts?.nsfw || false,
      is_private: opts?.is_private || false,
      guidelines: opts?.guidelines,
      position: channels.length,
      member_user_ids: opts?.is_private ? [userId] : (server?.member_user_ids || [userId]),
    });
    await loadChannels(activeServerId);
    setSelection({ type: "channel", channel, serverId: activeServerId });
  };

  const createCategory = async (name) => {
    if (!activeServerId || !name?.trim()) return;
    await api.entities.ChannelCategory.create({
      server_id: activeServerId,
      name: name.trim(),
      position: categories.length,
    });
    await loadChannels(activeServerId);
  };

  const updateChannel = async (channelId, updates) => {
    await api.entities.Channel.update(channelId, updates);
    await loadChannels(activeServerId);
  };

  const deleteChannel = async (channelId) => {
    await api.entities.Channel.delete(channelId);
    // Also delete threads under this channel
    const childThreads = threads.filter((t) => t.parent_channel_id === channelId);
    await Promise.all(childThreads.map((t) => api.entities.Channel.delete(t.id).catch(() => {})));
    await loadChannels(activeServerId);
    if (selection.type === "channel" && selection.channel?.id === channelId) {
      setSelection({ type: "home" });
    }
  };

  const cloneChannel = async (channelId) => {
    const original = channels.find((c) => c.id === channelId);
    if (!original) return;
    const server = servers.find((s) => s.id === activeServerId);
    const cloned = await api.entities.Channel.create({
      server_id: activeServerId,
      name: `${original.name}-clone`,
      type: original.type,
      topic: original.topic,
      category_id: original.category_id,
      slowmode: original.slowmode,
      nsfw: original.nsfw,
      is_private: original.is_private,
      guidelines: original.guidelines,
      position: channels.length,
      member_user_ids: original.is_private ? [userId] : (server?.member_user_ids || [userId]),
    });
    await loadChannels(activeServerId);
    setSelection({ type: "channel", channel: cloned, serverId: activeServerId });
    toast({ title: "Channel cloned", description: `Created #${cloned.name}` });
  };

  const reorderChannels = async (updates) => {
    if (!updates?.length) return;
    await Promise.all(updates.map((u) =>
      api.entities.Channel.update(u.id, { position: u.position, category_id: u.category_id }).catch(() => {})
    ));
    await loadChannels(activeServerId);
  };

  const reorderCategories = async (updates) => {
    if (!updates?.length) return;
    await Promise.all(updates.map((u) =>
      api.entities.ChannelCategory.update(u.id, { position: u.position }).catch(() => {})
    ));
    await loadChannels(activeServerId);
  };

  const inviteToChannel = async (channelId, member) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel || !member?.user_id) return;
    const ids = [...new Set([...(channel.member_user_ids || []), member.user_id])];
    await api.entities.Channel.update(channelId, { member_user_ids: ids });
    await loadChannels(activeServerId);
    toast({ title: `Added @${member.username} to #${channel.name}` });
  };

  // ─── threads ───
  const createThread = async (opts) => {
    if (!activeServerId || !opts?.name?.trim() || !opts?.parent_channel_id) return;
    const parent = channels.find((c) => c.id === opts.parent_channel_id);
    const server = servers.find((s) => s.id === activeServerId);
    const thread = await api.entities.Channel.create({
      server_id: activeServerId,
      name: opts.name.trim().slice(0, 100),
      type: "thread",
      parent_channel_id: opts.parent_channel_id,
      thread_type: opts.thread_type || "public",
      auto_archive_duration: opts.auto_archive_duration || 1440,
      position: 0,
      last_activity_at: new Date().toISOString(),
      member_user_ids: server?.member_user_ids || [userId],
      thread_member_ids: [userId],
    });
    await loadChannels(activeServerId);
    setSelection({ type: "channel", channel: thread, serverId: activeServerId });
    return thread;
  };

  const createThreadFromMessage = async (message, threadName) => {
    const sel = selectionRef.current;
    if (sel.type !== "channel") return;
    const name = (threadName || message.content?.slice(0, 50) || "Thread").trim().slice(0, 100);
    const thread = await createThread({
      name,
      parent_channel_id: sel.channel.id,
      thread_type: "public",
      auto_archive_duration: 1440,
    });
    return thread;
  };

  const joinThread = async (thread) => {
    if (!userId) return;
    const ids = [...new Set([...(thread.thread_member_ids || []), userId])];
    await api.entities.Channel.update(thread.id, { thread_member_ids: ids, last_activity_at: new Date().toISOString() });
    await loadChannels(activeServerId);
  };

  const leaveThread = async (thread) => {
    if (!userId) return;
    const ids = (thread.thread_member_ids || []).filter((id) => id !== userId);
    await api.entities.Channel.update(thread.id, { thread_member_ids: ids });
    await loadChannels(activeServerId);
    if (selection.type === "channel" && selection.channel?.id === thread.id) {
      setSelection({ type: "home" });
    }
  };

  const lockThread = async (thread) => {
    await api.entities.Channel.update(thread.id, { locked: !thread.locked });
    await loadChannels(activeServerId);
    toast({ title: thread.locked ? "Thread unlocked" : "Thread locked" });
  };

  const pinThread = async (thread) => {
    const pinned = thread.pinned_message_ids || [];
    const next = pinned.length > 0 ? [] : ["pinned"];
    await api.entities.Channel.update(thread.id, { pinned_message_ids: next });
    await loadChannels(activeServerId);
  };

  const updateThreadNotification = async (thread, level) => {
    await api.entities.Channel.update(thread.id, { notification_level: level });
    await loadChannels(activeServerId);
  };

  const selectThread = (thread) => {
    setSelection({ type: "channel", channel: thread, serverId: activeServerId });
  };

  const threadsForChannel = useCallback((parentChannelId) => {
    return threads.filter((t) => t.parent_channel_id === parentChannelId);
  }, [threads]);

  return {
    servers,
    channels,
    categories,
    threads,
    selection,
    messages,
    conversations,
    players,
    loadServers,
    channelReaders,
    activeServerId,
    reactions,
    typing,
    pollVotes,
    bookmarks,
    setSelection,
    setActiveServerId,
    selectDm,
    selectChannel,
    openServer,
    send,
    createServer,
    createChannel,
    createCategory,
    updateChannel,
    deleteChannel,
    cloneChannel,
    reorderChannels,
    reorderCategories,
    inviteToChannel,
    createThread,
    createThreadFromMessage,
    joinThread,
    leaveThread,
    lockThread,
    pinThread,
    updateThreadNotification,
    selectThread,
    threadsForChannel,
    joinInviteServer,
    leaveServer,
    editMessage,
    deleteMessage,
    reportMessage,
    loadConversations,
    loadPlayers,
    loadReactions,
    markChannelRead,
    markDmRead,
    toggleReaction,
    addTextReaction,
    superReact,
    sendVoiceMessage,
    setTypingIndicator,
    loadTyping,
    votePoll,
    endPoll,
    togglePin,
    addBookmark,
    markUnread,
    forwardMessage,
    playersList: Object.values(players),
    toggleMuteDm: async (peer) => {
      if (!profile?.id || !peer?.user_id) return;
      const key = [userId, peer.user_id].sort().join("_");
      const muted = profile.muted_dms || [];
      const next = muted.includes(key) ? muted.filter((k) => k !== key) : [...muted, key];
      const updated = await api.entities.Profile.update(profile.id, { muted_dms: next });
      applyProfile(updated);
    },
    closeDm: async (peer) => {
      if (!profile?.id || !peer?.user_id) return;
      const key = [userId, peer.user_id].sort().join("_");
      const closed = profile.closed_dms || [];
      const next = closed.includes(key) ? closed.filter((k) => k !== key) : [...closed, key];
      const updated = await api.entities.Profile.update(profile.id, { closed_dms: next });
      applyProfile(updated);
    },
    saveUserNote: async (peer, note) => {
      if (!userId || !peer?.user_id) return;
      const existing = await api.entities.UserNote.filter({ target_user_id: peer.user_id, created_by_id: userId }, { limit: 1 });
      const existingItem = existing?.items?.[0];
      if (existingItem) {
        if (note?.trim()) await api.entities.UserNote.update(existingItem.id, { note, target_username: peer.username });
        else await api.entities.UserNote.delete(existingItem.id);
      } else if (note?.trim()) {
        await api.entities.UserNote.create({ target_user_id: peer.user_id, target_username: peer.username, note });
      }
    },
    isDmMuted: (peer) => {
      if (!userId || !peer?.user_id) return false;
      const key = [userId, peer.user_id].sort().join("_");
      return (profile.muted_dms || []).includes(key);
    },
  };
}