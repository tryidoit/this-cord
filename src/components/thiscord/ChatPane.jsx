import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

const EMPTY_ARRAY = [];
import { Phone, Video, ArrowUp, ArrowLeft, Coins, Gamepad2, Store, Trophy, ImagePlus, Film, Loader2, X, MicOff, Smile, Pin, Mic, GitBranch, Settings2, AlertTriangle, Bell, BellOff, Search, XCircle, StickyNote, Zap, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ProfileAvatar from "@/components/thiscord/ProfileAvatar";
import MessageBubble, { DayDivider, NewDivider } from "@/components/thiscord/MessageBubble";
import MessageContextMenu from "@/components/thiscord/MessageContextMenu";
import GifPicker from "@/components/thiscord/GifPicker";
import EmojiPicker from "@/components/thiscord/EmojiPicker";
import ReplyBar from "@/components/thiscord/ReplyBar";
import TypingIndicator from "@/components/thiscord/TypingIndicator";
import SlashCommandPopup from "@/components/thiscord/SlashCommandPopup";
import PinnedMessages from "@/components/thiscord/PinnedMessages";
import MentionAutocomplete from "@/components/thiscord/MentionAutocomplete";
import VoiceRecorder from "@/components/thiscord/VoiceRecorder";
import ForwardDialog from "@/components/thiscord/ForwardDialog";
import ThreadList from "@/components/thiscord/ThreadList";
import ChannelSettingsDialog from "@/components/thiscord/ChannelSettingsDialog";
import { getChannelType } from "@/lib/channelTypes";
import { AVATAR_COUNT, ANIMATED_COUNT } from "@/lib/avatars";
import { isOnline } from "@/lib/economy";
import { playDing, playSend } from "@/lib/sound";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { processSlashCommand, parsePollArgs, parseTipArgs, SLASH_COMMANDS } from "@/lib/slashCommands";
import { api } from "@/api/client";
import WatchTogether from "@/components/shared/WatchTogether";
import Whiteboard from "@/components/shared/Whiteboard";
import KanbanBoard from "@/components/shared/KanbanBoard";
import FocusRoom from "@/components/shared/FocusRoom";
import Library from "@/components/shared/Library";
import CatchMeUp from "@/components/productivity/CatchMeUp";
import ProductivityPanel from "@/components/productivity/ProductivityPanel";
import { getDraft, saveDraft, exportMessages as exportChannelMessages, createUndoableSend } from "@/lib/productivity";

function Welcome({ profile }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <ProfileAvatar avatarId={profile?.avatar_id} size={92} />
      <h1 className="mt-5 font-display text-2xl font-bold text-foreground">Hey {profile?.display_name || profile?.username}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Pick a conversation on the left, or tap any name in chat to open their profile.
      </p>
      <div className="mt-7 grid w-full max-w-lg gap-3 sm:grid-cols-3">
        <Link to="/shop" className="rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50">
          <Store className="h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-semibold text-foreground">Avatar shop</p>
          <p className="text-[11px] text-muted-foreground">{AVATAR_COUNT.toLocaleString()} avatars · {ANIMATED_COUNT.toLocaleString()} live</p>
        </Link>
        <Link to="/games" className="rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50">
          <Gamepad2 className="h-5 w-5 text-success" />
          <p className="mt-2 text-sm font-semibold text-foreground">Arcade</p>
          <p className="text-[11px] text-muted-foreground">8 coins per win</p>
        </Link>
        <Link to="/leaderboard" className="rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50">
          <Trophy className="h-5 w-5 text-warning" />
          <p className="mt-2 text-sm font-semibold text-foreground">Leaderboard</p>
          <p className="text-[11px] text-muted-foreground">Who's richest this week</p>
        </Link>
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Coins className="h-3 w-3" /> +15 coins every 5 minutes online
      </p>
    </div>
  );
}

export default function ChatPane({
  profile,
  selection,
  messages,
  players,
  channelReaders = [],
  reactions = [],
  typing = [],
  pollVotes = [],
  currentUserId,
  onSend,
  onCall,
  onBack,
  onOpenProfile,
  nicknameFor,
  isMuted,
  mutedUntil,
  onEditMessage,
  onDeleteMessage,
  onReportMessage,
  onReact,
  onTextReact,
  onSuperReact,
  onVote,
  onEndPoll,
  onPin,
  onBookmark,
  onForward,
  onMarkUnread,
  onJumpToMessage,
  onTogglePin,
  onSetTyping,
  onSendVoiceMessage,
  onNavigate,
  playersList = [],
  conversations = [],
  onCallPlayer,
  onOpenGiftDialog,
  onOpenProfileCard,
  onStartDm,
  // Phase 4: channels & threads
  threads = [],
  serverMembers = [],
  roles = [],
  onCreateThread,
  onCreateThreadFromMessage,
  onJoinThread,
  onLeaveThread,
  onLockThread,
  onPinThread,
  onUpdateThreadNotif,
  onEditChannel,
  onUpdateChannel,
  onDeleteChannel,
  onCloneChannel,
  onInviteToChannel,
  onCloseDm,
  onToggleMuteDm,
  isDmMuted,
  onSaveNote,
  applyProfile,
  channels = [],
  servers = [],
  onMarkAllRead,
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [pingEnabled, setPingEnabled] = useState(true);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [slowmodeRemaining, setSlowmodeRemaining] = useState(0);
  const [voiceMode, setVoiceMode] = useState(false);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [threadListOpen, setThreadListOpen] = useState(false);
  const [channelSettingsTarget, setChannelSettingsTarget] = useState(null);
  const [threadCreateMsg, setThreadCreateMsg] = useState(null);
  const [nsfwConfirmed, setNsfwConfirmed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tc_nsfw_confirmed") || "[]"); } catch { return []; }
  });
  const [searchInDm, setSearchInDm] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [showProductivity, setShowProductivity] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(null);
  const [undoState, setUndoState] = useState(null);

  // Load draft when selection changes
  useEffect(() => {
    const key = selection.type === "channel" ? `ch:${selection.channel?.id}` : selection.type === "dm" ? `dm:${selection.peer?.user_id}` : null;
    if (key) setDraft(getDraft(key));
    else setDraft("");
    setScheduleAt(null);
  }, [selection]);

  // Save draft on change
  useEffect(() => {
    const key = selection.type === "channel" ? `ch:${selection.channel?.id}` : selection.type === "dm" ? `dm:${selection.peer?.user_id}` : null;
    if (key) saveDraft(key, draft);
  }, [draft, selection]);

  const isNsfwChannel = selection.type === "channel" && selection.channel?.nsfw;
  const needsNsfwConfirm = isNsfwChannel && !nsfwConfirmed.includes(selection.channel.id);
  const confirmNsfw = () => {
    const next = [...nsfwConfirmed, selection.channel.id];
    setNsfwConfirmed(next);
    localStorage.setItem("tc_nsfw_confirmed", JSON.stringify(next));
  };
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const lastCountRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);

  const canDeleteAny = !!(profile?.is_admin || profile?.moderator || profile?.can_delete_messages);
  const canEditAny = !!profile?.can_edit_messages;
  const canPin = !!(profile?.is_admin || profile?.moderator);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distFromBottom < 100);
  }, []);

  // Auto-scroll to bottom when at bottom
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, atBottom]);

  // Ding when a message from someone else lands
  useEffect(() => {
    if (messages.length > lastCountRef.current) {
      const last = messages[messages.length - 1];
      const mine = last ? (last.from_user_id ? last.from_user_id === profile?.created_by_id : last.author_username === profile?.username) : true;
      if (!mine && lastCountRef.current > 0) playDing();
    }
    lastCountRef.current = messages.length;
  }, [messages, profile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if ((e.key === "r" || e.key === "R") && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        setReplyTarget(lastMsg);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [messages]);

  // Typing indicator
  useEffect(() => {
    if (draft.trim() && onSetTyping) {
      onSetTyping();
    }
  }, [draft, onSetTyping]);

  const handleSlashAction = async (action, payload) => {
    switch (action) {
      case "nick": {
        if (!payload?.nickname) return;
        toast({ title: "Nickname", description: `To change your nickname to "${payload.nickname}", open your profile settings.` });
        break;
      }
      case "remind": {
        const text = payload?.args || "";
        const match = text.match(/^(\d+)([smh])\s+(.+)/);
        if (!match) {
          toast({ title: "Usage: /remind <time> <message>", description: "e.g. /remind 5m Take a break", variant: "destructive" });
          return;
        }
        const num = parseInt(match[1]);
        const unit = match[2];
        const msg = match[3];
        const ms = num * (unit === "s" ? 1000 : unit === "m" ? 60000 : 3600000);
        toast({ title: `⏰ Reminder set`, description: `In ${num}${unit}: ${msg.slice(0, 80)}` });
        setTimeout(() => {
          toast({ title: "⏰ Reminder", description: msg.slice(0, 200) });
          if ("speechSynthesis" in window) {
            speechSynthesis.speak(new SpeechSynthesisUtterance(`Reminder: ${msg}`));
          }
        }, ms);
        break;
      }
      case "clear": {
        toast({ title: "Chat cleared (local only)" });
        break;
      }
      case "help": {
        const cmdList = SLASH_COMMANDS.map((c) => `${c.cmd} — ${c.desc}`).join("\n");
        toast({ title: "Available commands", description: "Check the slash menu as you type /" });
        break;
      }
      case "online": {
        const onlineCount = playersList.filter((p) => isOnline(p.last_seen)).length;
        toast({ title: "Online players", description: `${onlineCount} player(s) currently online.` });
        break;
      }
      case "tip": {
        const parsed = parseTipArgs(payload?.args || "");
        if (!parsed) {
          toast({ title: "Usage: /tip <@user> <amount> [note]", variant: "destructive" });
          return;
        }
        const player = playersList.find((p) => p.username === parsed.username);
        if (!player) {
          toast({ title: "Player not found", description: `@${parsed.username} is not online.`, variant: "destructive" });
          return;
        }
        onOpenGiftDialog?.(player, parsed.amount, parsed.note);
        break;
      }
      case "gift": {
        const player = playersList.find((p) => p.username === payload?.username);
        if (!player) {
          toast({ title: "Player not found", variant: "destructive" });
          return;
        }
        onOpenGiftDialog?.(player);
        break;
      }
      case "call": {
        const player = playersList.find((p) => p.username === payload?.username);
        if (!player) {
          toast({ title: "Player not found", variant: "destructive" });
          return;
        }
        onCallPlayer?.(player, payload?.mode || "voice");
        break;
      }
      case "profile": {
        onOpenProfileCard?.(payload?.username);
        break;
      }
      case "dm": {
        const player = playersList.find((p) => p.username === payload?.username);
        if (!player) {
          toast({ title: "Player not found", variant: "destructive" });
          return;
        }
        onStartDm?.(player);
        break;
      }
      case "navigate": {
        onNavigate?.(payload?.path);
        break;
      }
      case "modWarn": {
        const serverId = selection.type === "channel" ? selection.channel?.server_id : null;
        if (!serverId) { toast({ title: "Server commands only", variant: "destructive" }); return; }
        try {
          const me = await api.auth.me();
          await api.entities.ModerationAction.create({
            server_id: serverId,
            actor_username: me?.full_name || "admin",
            target_username: payload.username,
            action_type: "warn",
            reason: payload.reason || "No reason provided",
          });
          toast({ title: `⚠️ ${payload.username} has been warned` });
        } catch { toast({ title: "Failed to log warning", variant: "destructive" }); }
        break;
      }
      case "modTimeout": {
        const serverId = selection.type === "channel" ? selection.channel?.server_id : null;
        if (!serverId) { toast({ title: "Server commands only", variant: "destructive" }); return; }
        try {
          const me = await api.auth.me();
          await api.entities.ModerationAction.create({
            server_id: serverId,
            actor_username: me?.full_name || "admin",
            target_username: payload.username,
            action_type: "timeout",
            reason: payload.reason || "No reason provided",
            duration_minutes: payload.minutes || 10,
          });
          toast({ title: `🔇 ${payload.username} timed out for ${payload.minutes}m` });
        } catch { toast({ title: "Failed to log timeout", variant: "destructive" }); }
        break;
      }
      case "modPurge": {
        toast({ title: `🧹 Purged ${payload.count} messages (logged)` });
        const serverId = selection.type === "channel" ? selection.channel?.server_id : null;
        if (!serverId) return;
        try {
          const me = await api.auth.me();
          await api.entities.ModerationAction.create({
            server_id: serverId,
            actor_username: me?.full_name || "admin",
            target_username: "channel",
            action_type: "purge",
            reason: `Purged ${payload.count} messages`,
            message_count: payload.count,
            channel_id: selection.channel?.id,
          });
        } catch { /* ignore */ }
        break;
      }
      default:
        toast({ title: "Unknown action" });
    }
  };

  const submit = async () => {
    if (slowmodeRemaining > 0) return;
    const trimmed = draft.trim();
    if (!trimmed || sending) return;

    // Slash command processing
    if (trimmed.startsWith("/")) {
      const result = processSlashCommand(trimmed, profile, { players: playersList, conversations });
      if (result?.type === "noop") {
        // Check for custom server commands
        const spaceIdx = trimmed.indexOf(" ");
        const cmdName = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase().slice(1);
        const serverId = selection.type === "channel" ? selection.channel?.server_id : null;
        if (serverId) {
          try {
            const page = await api.entities.ServerCommand.filter({ server_id: serverId, command_name: cmdName, enabled: true }, { limit: 1 });
            const customCmd = (page.items || [])[0];
            if (customCmd) {
              setSending(true);
              setDraft("");
              try {
                let content = customCmd.content || "";
                const displayName = profile?.display_name || profile?.username || "User";
                const serverName = "the server";
                content = content.replace(/\{user\}/g, displayName).replace(/\{server\}/g, serverName).replace(/\{channel\}/g, selection.channel?.name || "channel");
                await onSend(content);
                playSend();
              } finally { setSending(false); }
              return;
            }
          } catch { /* ignore — fall through to noop toast */ }
        }
        toast(result.toast || { title: "Unknown command" });
        setDraft("");
        return;
      }
      if (result?.type === "action") {
        setDraft("");
        await handleSlashAction(result.action, result.payload);
        return;
      }
      if (result?.type === "poll") {
        const pollData = parsePollArgs(result.pollText);
        if (!pollData) {
          toast({ title: "Invalid poll format", description: "Use: /poll question | option1 | option2", variant: "destructive" });
          return;
        }
        setSending(true);
        setDraft("");
        try {
          await onSend("", { poll: pollData });
          playSend();
        } finally { setSending(false); }
        return;
      }
      if (result?.type === "system") {
        setSending(true);
        setDraft("");
        try {
          await onSend(result.content);
          playSend();
        } finally { setSending(false); }
        return;
      }
      if (result?.type === "message") {
        setSending(true);
        setDraft("");
        try {
          await onSend(result.content);
          playSend();
        } finally { setSending(false); }
        return;
      }
    }

    setSending(true);
    const text = draft;
    setDraft("");

    // Undo send: delay non-scheduled messages by 5s with an undo toast
    if (!scheduleAt) {
      const replyData = replyTarget ? {
        id: replyTarget.id,
        username: replyTarget.from_username || replyTarget.author_username,
        name: replyTarget.from_username || replyTarget.author_name || replyTarget.author_name,
        content: replyTarget.content,
      } : null;

      const { promise, cancel } = createUndoableSend(() => onSend(text, null, replyData), 5000);
      setUndoState({ text, cancel });

      const undoToast = {
        title: "Message sent",
        description: "Tap undo within 5s to unsend",
        duration: 5000,
        action: (
          <button
            onClick={() => { cancel(); }}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Undo
          </button>
        ),
      };
      toast(undoToast);

      try {
        await promise;
        setUndoState(null);
        setReplyTarget(null);
        playSend();
        const chSlowmode = selection.type === "channel" ? (selection.channel?.slowmode || 0) : 0;
        setSlowmodeRemaining(chSlowmode);
        const timer = setInterval(() => {
          setSlowmodeRemaining((s) => {
            if (s <= 1) { clearInterval(timer); return 0; }
            return s - 1;
          });
        }, 1000);
      } catch (e) {
        if (e?.message === "cancelled") {
          toast({ title: "Message unsent", description: "Your message was not sent." });
        }
        setUndoState(null);
      } finally {
        setSending(false);
      }
      return;
    }

    try {
      await onSend(text, null, replyTarget ? {
        id: replyTarget.id,
        username: replyTarget.from_username || replyTarget.author_username,
        name: replyTarget.from_username || replyTarget.author_name || replyTarget.author_name,
        content: replyTarget.content,
      } : null, scheduleAt);
      setReplyTarget(null);
      setScheduleAt(null);
      playSend();
      const chSlowmode = selection.type === "channel" ? (selection.channel?.slowmode || 0) : 0;
      setSlowmodeRemaining(chSlowmode);
      const timer = setInterval(() => {
        setSlowmodeRemaining((s) => {
          if (s <= 1) { clearInterval(timer); return 0; }
          return s - 1;
        });
      }, 1000);
    } finally {
      setSending(false);
    }
  };

  const pickFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      const { compressImage, saveAsset } = await import("@/lib/assets");
      for (const file of files.slice(0, 5)) {
        const { dataUrl, width, height } = await compressImage(file, 1280, 0.7);
        if (!dataUrl) continue;
        const ref = await saveAsset(dataUrl, "chat_image", file.type, dataUrl.length, width, height);
        const isGif = file.type === "image/gif";
        await onSend("", { url: ref, type: isGif ? "gif" : "image" });
      }
      playSend();
    } catch {
      toast({ title: "Upload failed", description: "Try smaller images.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const { compressImage, saveAsset } = await import("@/lib/assets");
      for (const file of files.slice(0, 5)) {
        if (!file.type.startsWith("image/")) continue;
        const { dataUrl, width, height } = await compressImage(file, 1280, 0.7);
        if (!dataUrl) continue;
        const ref = await saveAsset(dataUrl, "chat_image", file.type, dataUrl.length, width, height);
        const isGif = file.type === "image/gif";
        await onSend("", { url: ref, type: isGif ? "gif" : "image" });
      }
      playSend();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const sendGif = async (url) => {
    setGifOpen(false);
    await onSend("", { url, type: "gif" });
    playSend();
  };

  const insertEmoji = (emoji) => {
    setDraft((d) => d + emoji);
  };

  const handleJumpToMessage = (msgId) => {
    setHighlightedId(msgId);
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightedId(null), 3000);
  };

  const isDm = selection.type === "dm";
  const peerProfile = isDm ? players[selection.peer.username] : null;
  const peerOnline = isDm ? isOnline(peerProfile?.last_seen) : false;
  const nickOf = (username, fallback) => (nicknameFor ? nicknameFor(username, fallback) : fallback || username);
  const title = isDm
    ? nickOf(selection.peer.username, peerProfile?.display_name || selection.peer.display_name || selection.peer.username)
    : selection.type === "channel"
    ? selection.channel.name
    : "";

  const viewersFor = (message) => {
    if (!message?.created_date) return [];
    const at = new Date(message.created_date).getTime();
    return channelReaders
      .filter((r) => r.username !== profile?.username && r.seen_at && new Date(r.seen_at).getTime() >= at)
      .map((r) => nickOf(r.username, r.username));
  };

  const reactionsByMessage = useMemo(() => {
    const map = new Map();
    for (const r of reactions) {
      const arr = map.get(r.message_id);
      if (arr) arr.push(r);
      else map.set(r.message_id, [r]);
    }
    return map;
  }, [reactions]);
  const openContextMenu = useCallback((msg, x, y, mine) => setContextMenu({ msg, x, y, mine }), []);
  const reactionsForMessage = useCallback((msgId) => reactionsByMessage.get(msgId) || EMPTY_ARRAY, [reactionsByMessage]);

  const votesByMessage = useMemo(() => {
    const map = new Map();
    for (const v of pollVotes) {
      const arr = map.get(v.message_id);
      if (arr) arr.push(v);
      else map.set(v.message_id, [v]);
    }
    return map;
  }, [pollVotes]);
  const votesForMessage = useCallback((msgId) => votesByMessage.get(msgId) || EMPTY_ARRAY, [votesByMessage]);

  const rows = useMemo(() => {
    const list = [];
    const mineIndexes = [];
    const myUserId = profile?.created_by_id;
    const mySeenAt = !isDm ? channelReaders.find((r) => r.user_id === myUserId)?.seen_at : null;
    let firstUnreadIdx = -1;

    messages.forEach((message, i) => {
      const mine = message.from_user_id
        ? message.from_user_id === profile?.created_by_id
        : message.author_username === profile?.username;
      if (mine) mineIndexes.push(i);
      if (firstUnreadIdx === -1 && !mine) {
        if (isDm) {
          if (message.to_user_id === myUserId && !message.read_at) firstUnreadIdx = i;
        } else if (mySeenAt) {
          if (new Date(message.created_date).getTime() > new Date(mySeenAt).getTime()) firstUnreadIdx = i;
        }
      }
    });
    const lastOwn = mineIndexes.length ? mineIndexes[mineIndexes.length - 1] : -1;

    messages.forEach((message, i) => {
      const mine = message.from_user_id
        ? message.from_user_id === profile?.created_by_id
        : message.author_username === profile?.username;
      const current = message.from_user_id || message.author_username;
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const prevSender = prev ? prev.from_user_id || prev.author_username : null;
      const nextSender = next ? next.from_user_id || next.author_username : null;
      const gap = prev ? new Date(message.created_date) - new Date(prev.created_date) : Infinity;
      const newDay = !prev || new Date(message.created_date).toDateString() !== new Date(prev.created_date).toDateString();
      const sender = message.from_username || message.author_username;
      const player = players[sender];
      let receipt = "";
      if (mine && i === lastOwn) {
        if (isDm) receipt = message.read_at ? "Read" : "Delivered";
      }
      list.push({
        isNew: i === firstUnreadIdx,
        message,
        mine,
        newDay,
        showHeader: newDay || prevSender !== current || gap > 5 * 60 * 1000,
        showAvatar: nextSender !== current,
        username: sender,
        name: mine
          ? nickOf(profile?.username, profile?.display_name || profile?.username)
          : nickOf(sender, message.author_name || player?.display_name || message.from_username),
        nameFont: mine ? profile?.name_font : player?.name_font,
        avatar: mine ? profile?.avatar_id : message.author_avatar || player?.avatar_id,
        receipt,
        viewers: mine && !isDm && i === lastOwn ? viewersFor(message) : [],
      });
    });
    return list;
  }, [messages, profile, players, channelReaders, isDm, nicknameFor]);

  const showSlashPopup = draft.startsWith("/") && !draft.includes(" ");

  // ── Mention autocomplete ──
  const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0);
  const mentionInfo = useMemo(() => {
    if (!draft || showSlashPopup) return { matches: [], mentionStart: -1 };
    const before = draft.slice(0, cursorPos);
    const match = before.match(/@([a-zA-Z0-9_]*)$/);
    if (!match) return { matches: [], mentionStart: -1 };
    const charBefore = before[match.index - 1];
    if (charBefore && !/[\s\n]/.test(charBefore)) return { matches: [], mentionStart: -1 };
    const query = match[1].toLowerCase();
    const matches = Object.values(players)
      .filter((p) => p.username !== profile?.username)
      .filter((p) => p.username.toLowerCase().includes(query) || (p.display_name || "").toLowerCase().includes(query))
      .slice(0, 8);
    return { matches, mentionStart: match.index };
  }, [draft, cursorPos, players, profile?.username, showSlashPopup]);

  const mentionMatches = mentionInfo.matches;

  useEffect(() => { setMentionSelectedIdx(0); }, [mentionMatches.length]);

  const insertMention = useCallback((player) => {
    const mentionStart = mentionInfo.mentionStart;
    if (mentionStart < 0) return;
    const before = draft.slice(0, mentionStart);
    const after = draft.slice(cursorPos);
    const newText = `${before}@${player.username} ${after}`;
    setDraft(newText);
    const newPos = mentionStart + player.username.length + 2;
    setCursorPos(newPos);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  }, [draft, cursorPos, mentionInfo.mentionStart]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
      {selection.type !== "home" && (
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
          <button type="button" onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {isDm ? (
            <button type="button" onClick={() => onOpenProfile?.(selection.peer.username)} className="relative transition hover:scale-105">
              <ProfileAvatar avatarId={peerProfile?.avatar_id || selection.peer.avatar_id} size={30} />
              <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background", peerOnline ? "bg-online" : "bg-idle")} />
            </button>
          ) : (
            (() => {
              const ChannelIcon = getChannelType(selection.channel?.type || "text").icon;
              return <ChannelIcon className="h-5 w-5 text-muted-foreground" />;
            })()
          )}
          <button type="button" onClick={() => isDm && onOpenProfile?.(selection.peer.username)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {isDm && (
              <p className="truncate text-[11px] text-muted-foreground">
                @{selection.peer.username} · {peerOnline ? "online" : "offline"}
              </p>
            )}
            {!isDm && selection.type === "channel" && selection.channel.topic && (
              <p className="truncate text-[11px] text-muted-foreground">{selection.channel.topic}</p>
            )}
          </button>
          {selection.type === "channel" && (
            <>
              <button
                type="button"
                onClick={() => setThreadListOpen(true)}
                title="Threads"
                className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <GitBranch className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setChannelSettingsTarget(selection.channel)}
                title="Channel settings"
                className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPinnedOpen(true)}
                title="Pinned messages"
                className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <Pin className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowCatchUp(!showCatchUp)}
                title="Catch me up"
                className={cn("grid h-9 w-9 place-items-center rounded-xl bg-muted transition hover:bg-muted/80 hover:text-foreground", showCatchUp ? "text-primary" : "text-muted-foreground")}
              >
                <Zap className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowProductivity(!showProductivity)}
                title="Productivity"
                className={cn("grid h-9 w-9 place-items-center rounded-xl bg-muted transition hover:bg-muted/80 hover:text-foreground", showProductivity ? "text-primary" : "text-muted-foreground")}
              >
                <Clock className="h-4 w-4" />
              </button>
            </>
          )}
          {isDm && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchInDm(!searchInDm)}
                title="Search in DM"
                className={cn("grid h-9 w-9 place-items-center rounded-xl bg-muted transition hover:bg-muted/80 hover:text-foreground", searchInDm ? "text-primary" : "text-muted-foreground")}
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onToggleMuteDm?.(selection.peer)}
                title={isDmMuted ? "Unmute DM" : "Mute DM"}
                className={cn("grid h-9 w-9 place-items-center rounded-xl bg-muted transition hover:bg-muted/80 hover:text-foreground", isDmMuted ? "text-danger" : "text-muted-foreground")}
              >
                {isDmMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => onCloseDm?.(selection.peer)}
                title="Close DM"
                className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCall(selection.peer, "voice")}
                title="Voice call"
                className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-success transition hover:bg-success/15 active:scale-95"
              >
                <Phone className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onCall(selection.peer, "video")}
                title="Video call"
                className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-info transition hover:bg-info/15 active:scale-95"
              >
                <Video className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {searchInDm && isDm && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={dmSearchQuery}
            onChange={(e) => setDmSearchQuery(e.target.value)}
            placeholder="Search messages in this DM"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {dmSearchQuery && (
            <span className="text-[10px] text-muted-foreground">
              {messages.filter((m) => (m.content || "").toLowerCase().includes(dmSearchQuery.toLowerCase())).length} found
            </span>
          )}
          <button onClick={() => { setSearchInDm(false); setDmSearchQuery(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {noteTarget && isDm && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <StickyNote className="h-3.5 w-3.5 text-warning" />
          <input
            autoFocus
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={`Note about @${selection.peer.username}`}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => { onSaveNote?.(selection.peer, noteDraft); setNoteTarget(false); setNoteDraft(""); }}
            className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
          >
            Save
          </button>
          <button onClick={() => { setNoteTarget(false); setNoteDraft(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {selection.type === "home" ? (
        <Welcome profile={profile} />
      ) : selection.type === "channel" && ["whiteboard", "board", "library", "focus", "watch"].includes(selection.channel?.type) ? (
        <div className="flex-1 overflow-hidden">
          {selection.channel.type === "whiteboard" && (
            <Whiteboard
              channelId={selection.channel.id}
              serverId={selection.channel.server_id}
              userId={currentUserId}
              username={profile?.username}
            />
          )}
          {selection.channel.type === "board" && (
            <KanbanBoard
              channelId={selection.channel.id}
              serverId={selection.channel.server_id}
              username={profile?.username}
              serverMembers={serverMembers}
            />
          )}
          {selection.channel.type === "library" && (
            <Library
              channelId={selection.channel.id}
              serverId={selection.channel.server_id}
              username={profile?.username}
            />
          )}
          {selection.channel.type === "focus" && (
            <FocusRoom
              channelId={selection.channel.id}
              serverId={selection.channel.server_id}
              userId={currentUserId}
              username={profile?.username}
            />
          )}
          {selection.channel.type === "watch" && (
            <WatchTogether
              channelId={selection.channel.id}
              serverId={selection.channel.server_id}
              userId={currentUserId}
              username={profile?.username}
              isHost={true}
            />
          )}
        </div>
      ) : needsNsfwConfirm ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <AlertTriangle className="h-12 w-12 text-danger" />
          <h2 className="mt-4 font-display text-xl font-bold text-foreground">Age-Restricted Channel</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            This channel contains age-restricted (NSFW) content. You must be 18 or older to view it.
          </p>
          <button
            onClick={confirmNsfw}
            className="mt-6 rounded-xl bg-danger px-6 py-2.5 text-[13px] font-semibold text-primary-foreground transition hover:bg-danger/90"
          >
            I am 18 or older — Continue
          </button>
        </div>
      ) : (
        <>
          {showCatchUp && (
            <div className="border-b border-border bg-card">
              <CatchMeUp
                messages={messages}
                profile={profile}
                currentUserId={currentUserId}
                reactions={reactions}
                onJumpToMessage={(id) => { setHighlightedId(id); setShowCatchUp(false); }}
                onClose={() => setShowCatchUp(false)}
              />
            </div>
          )}
          {showProductivity && (
            <div className="border-b border-border bg-card">
              <ProductivityPanel
                profile={profile}
                applyProfile={applyProfile}
                channels={channels}
                servers={servers}
                onMarkAllRead={onMarkAllRead}
                selection={selection}
                onExportChannel={() => {
                  const name = selection.type === "channel" ? selection.channel.name : selection.type === "dm" ? selection.peer.username : "chat";
                  exportChannelMessages(messages, name);
                }}
              />
            </div>
          )}
          <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pb-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <ProfileAvatar avatarId={isDm ? peerProfile?.avatar_id || selection.peer.avatar_id : profile?.avatar_id} size={64} />
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {isDm ? `This is the start of your DM with @${selection.peer.username}` : `Welcome to #${title}`}
                </p>
                <p className="text-[12px] text-muted-foreground">Say something nice.</p>
              </div>
            ) : (
              rows.map((row) => (
                <React.Fragment key={row.message.id}>
                  {row.newDay && (
                    <DayDivider
                      label={new Date(row.message.created_date).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    />
                  )}
                  {row.isNew && <NewDivider />}
                  <div id={`msg-${row.message.id}`}>
                    <MessageBubble
                      message={row.message}
                      mine={row.mine}
                      avatarId={row.avatar}
                      name={row.name}
                      username={row.username}
                      nameFont={row.nameFont}
                      showHeader={row.showHeader}
                      showAvatar={row.showAvatar}
                      receipt={row.receipt}
                      viewers={row.viewers}
                      canDelete={row.mine || canDeleteAny}
                      canEdit={row.mine || canEditAny}
                      onOpenProfile={onOpenProfile}
                      onContextMenu={openContextMenu}
                      forceEdit={editingId === row.message.id}
                      highlighted={highlightedId === row.message.id}
                      onReply={setReplyTarget}
                      onReact={onReact}
                      onTextReact={onTextReact}
                      onSuperReact={onSuperReact}
                      onJumpToMessage={handleJumpToMessage}
                      onPin={onTogglePin}
                      onBookmark={onBookmark}
                      onForward={setForwardTarget}
                      onCreateThread={onCreateThreadFromMessage ? setThreadCreateMsg : undefined}
                      onMarkUnread={onMarkUnread}
                      onVote={onVote}
                      onEndPoll={onEndPoll}
                      reactions={reactionsForMessage(row.message.id)}
                      pollVotes={votesForMessage(row.message.id)}
                      currentUserId={currentUserId}
                      canSuperReact={!!onSuperReact && (profile?.points || 0) >= 50}
                    />
                  </div>
                </React.Fragment>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Typing indicator */}
          <TypingIndicator typers={typing} currentUsername={profile?.username} />

          {/* Jump to present */}
          {!atBottom && messages.length > 0 && (
            <button
              onClick={() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                setAtBottom(true);
              }}
              className="mx-auto mb-1 flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-foreground shadow-lg transition hover:bg-muted"
            >
              <ArrowUp className="h-3 w-3 rotate-180" /> Jump to present
            </button>
          )}

          <div className="border-t border-border p-3" onDragOver={handleDragOver} onDrop={handleDrop}>
            {isMuted ? (
              <div className="flex items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12px] font-medium text-danger">
                <MicOff className="h-3.5 w-3.5" />
                You're muted until {mutedUntil ? mutedUntil.toLocaleString() : "further notice"}
              </div>
            ) : voiceMode ? (
              <VoiceRecorder
                onComplete={(ref, duration) => {
                  setVoiceMode(false);
                  onSendVoiceMessage?.(ref, duration);
                  playSend();
                }}
                onClose={() => setVoiceMode(false)}
              />
            ) : (
              <>
                {gifOpen && <GifPicker onPick={sendGif} onClose={() => setGifOpen(false)} />}
                {emojiOpen && (
                  <div className="mb-2">
                    <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />
                  </div>
                )}

                {/* Reply bar */}
                {replyTarget && (
                  <ReplyBar
                    target={{
                      name: replyTarget.from_username || replyTarget.author_name || replyTarget.author_username,
                      username: replyTarget.from_username || replyTarget.author_username,
                      content: replyTarget.content,
                    }}
                    pingEnabled={pingEnabled}
                    onTogglePing={() => setPingEnabled((v) => !v)}
                    onCancel={() => setReplyTarget(null)}
                  />
                )}

                <div className="relative flex items-end gap-1.5 rounded-2xl border border-border bg-card px-2 py-1.5 transition focus-within:border-primary/60">
                  {/* Slash command popup */}
                  {showSlashPopup && (
                    <SlashCommandPopup
                      query={draft}
                      onPick={(cmd) => setDraft(cmd.cmd + " ")}
                      position={{ bottom: "100%", left: 0 }}
                      serverId={selection.type === "channel" ? selection.channel?.server_id : null}
                    />
                  )}
                  {/* Mention autocomplete */}
                  {!showSlashPopup && mentionMatches.length > 0 && (
                    <MentionAutocomplete
                      matches={mentionMatches}
                      selectedIndex={mentionSelectedIdx}
                      nicknameFor={nicknameFor}
                      onHover={setMentionSelectedIdx}
                      onPick={(player) => insertMention(player)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    title="Send an image"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGifOpen((v) => !v)}
                    title="Send a GIF"
                    className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition", gifOpen ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    <Film className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((v) => !v)}
                    title="Emoji"
                    className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition", emojiOpen ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceMode((v) => !v)}
                    title="Voice message"
                    className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition", voiceMode ? "text-danger" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <label
                    title="Schedule send"
                    className={cn("grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full transition", scheduleAt ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                  >
                    <Clock className="h-4 w-4" />
                    <input
                      type="datetime-local"
                      className="hidden"
                      value={scheduleAt ? scheduleAt.slice(0, 16) : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          setScheduleAt(new Date(e.target.value).toISOString());
                          toast({ title: "Scheduled", description: `Message will send at ${new Date(e.target.value).toLocaleString()}` });
                        } else {
                          setScheduleAt(null);
                        }
                      }}
                    />
                  </label>
                  {scheduleAt && (
                    <button
                      type="button"
                      onClick={() => setScheduleAt(null)}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(scheduleAt).toLocaleString()}
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pickFiles} />
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setCursorPos(e.target.selectionStart); }}
                    onKeyDown={(e) => {
                      // Mention autocomplete keyboard nav
                      if (mentionMatches.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setMentionSelectedIdx((i) => Math.min(i + 1, mentionMatches.length - 1));
                          return;
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setMentionSelectedIdx((i) => Math.max(i - 1, 0));
                          return;
                        }
                        if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
                          e.preventDefault();
                          insertMention(mentionMatches[mentionSelectedIdx]);
                          return;
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setCursorPos(-1);
                          return;
                        }
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    onKeyUp={(e) => setCursorPos(e.target.selectionStart)}
                    onClick={(e) => setCursorPos(e.target.selectionStart)}
                    rows={1}
                    maxLength={2000}
                    placeholder={isDm ? `Message @${selection.peer.username}` : `Message #${title}`}
                    className="max-h-32 min-h-[26px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <span className="self-center text-[10px] text-muted-foreground">{draft.length}/2000</span>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={(!draft.trim() && !replyTarget) || sending || slowmodeRemaining > 0}
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full transition active:scale-95",
                      draft.trim() && !sending && slowmodeRemaining === 0 ? "bg-info text-foreground" : "bg-muted text-muted-foreground"
                    )}
                    title={slowmodeRemaining > 0 ? `Slowmode: ${slowmodeRemaining}s` : "Send"}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
                {slowmodeRemaining > 0 && (
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">Slowmode: {slowmodeRemaining}s remaining</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          canDelete={contextMenu.mine || canDeleteAny}
          canEdit={contextMenu.mine || canEditAny}
          canPin={canPin}
          onClose={() => setContextMenu(null)}
          onReport={() => setReportTarget(contextMenu.msg)}
          onDelete={() => {
            if (confirm("Delete this message?")) onDeleteMessage(contextMenu.msg);
          }}
          onEdit={() => setEditingId(contextMenu.msg.id)}
          onReply={() => setReplyTarget(contextMenu.msg)}
          onCopyText={() => navigator.clipboard?.writeText(contextMenu.msg.content || "")}
          onCopyLink={() => {
            const url = `${window.location.origin}/?msg=${contextMenu.msg.id}`;
            navigator.clipboard?.writeText(url);
            toast({ title: "Message link copied" });
          }}
          onCopyId={() => {
            navigator.clipboard?.writeText(contextMenu.msg.id);
            toast({ title: "Message ID copied" });
          }}
          onMarkUnread={() => onMarkUnread?.(contextMenu.msg)}
          onBookmark={() => onBookmark?.(contextMenu.msg)}
          onPin={() => onTogglePin?.(contextMenu.msg)}
          onForward={() => setForwardTarget(contextMenu.msg)}
          onCreateThread={onCreateThreadFromMessage ? () => setThreadCreateMsg(contextMenu.msg) : undefined}
        />
      )}

      {reportTarget && (
        <div className="fixed inset-0 z-[88] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={() => setReportTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground">Report message</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Reports go to the admin team for review.</p>
            <div className="mt-3 space-y-2">
              {["Spam or scam", "Harassment or bullying", "Hate speech", "Inappropriate content", "Other"].map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition ${reportReason === r ? "bg-primary/20 text-primary" : "hover:bg-muted text-foreground"}`}
                >
                  <span className={`grid h-4 w-4 place-items-center rounded-full border ${reportReason === r ? "border-primary bg-primary" : "border-border"}`}>
                    {reportReason === r && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                  </span>
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Add details (optional)…"
              rows={3}
              className="mt-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  if (!reportReason) { toast({ title: "Select a reason", variant: "destructive" }); return; }
                  await onReportMessage(reportTarget, reportReason, reportDetails);
                  toast({ title: "Report sent", description: "An admin will review it shortly." });
                  setReportTarget(null);
                  setReportReason("");
                  setReportDetails("");
                }}
                className="flex-1 rounded-lg bg-primary py-2 text-[12px] font-semibold text-primary-foreground"
              >
                Send report
              </button>
              <button onClick={() => setReportTarget(null)} className="rounded-lg bg-muted px-4 py-2 text-[12px] text-muted-foreground">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selection.type === "channel" && (
        <PinnedMessages
          open={pinnedOpen}
          onClose={() => setPinnedOpen(false)}
          scope={selection.channel.id}
          isDm={false}
          onJumpTo={(msg) => { setPinnedOpen(false); handleJumpToMessage(msg.id); }}
        />
      )}

      {forwardTarget && (
        <ForwardDialog
          message={forwardTarget}
          conversations={conversations}
          players={players}
          nicknameFor={nicknameFor}
          onClose={() => setForwardTarget(null)}
          onForward={(conv) => {
            onForward?.(forwardTarget, conv);
            setForwardTarget(null);
          }}
        />
      )}

      {selection.type === "channel" && (
        <ThreadList
          open={threadListOpen}
          onClose={() => setThreadListOpen(false)}
          parentChannel={selection.channel}
          threads={threads.filter((t) => t.parent_channel_id === selection.channel.id)}
          currentUserId={currentUserId}
          onSelectThread={(thread) => {
            setThreadListOpen(false);
            onNavigate?.(`/thread/${thread.id}`);
          }}
          onCreateThread={onCreateThread}
          onJoinThread={onJoinThread}
          onLeaveThread={onLeaveThread}
          onLockThread={onLockThread}
          onPinThread={onPinThread}
          onUpdateThreadNotif={onUpdateThreadNotif}
          isAdmin={!!(profile?.is_admin || profile?.moderator)}
        />
      )}

      {channelSettingsTarget && (
        <ChannelSettingsDialog
          channel={channelSettingsTarget}
          members={serverMembers}
          roles={roles}
          onClose={() => setChannelSettingsTarget(null)}
          onUpdate={onUpdateChannel}
          onDelete={onDeleteChannel}
          onClone={onCloneChannel}
          onInvite={onInviteToChannel}
        />
      )}

      {threadCreateMsg && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={() => setThreadCreateMsg(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">Create Thread</h3>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">From message: "{(threadCreateMsg.content || "").slice(0, 80)}"</p>
            <input
              autoFocus
              placeholder="Thread name (optional)"
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:border-primary/60 focus:outline-none"
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const name = e.target.value.trim();
                  await onCreateThreadFromMessage?.(threadCreateMsg, name);
                  setThreadCreateMsg(null);
                }
              }}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await onCreateThreadFromMessage?.(threadCreateMsg, "");
                  setThreadCreateMsg(null);
                }}
                className="flex-1 rounded-lg bg-primary py-2 text-[12px] font-semibold text-primary-foreground"
              >
                Create
              </button>
              <button onClick={() => setThreadCreateMsg(null)} className="rounded-lg bg-muted px-4 py-2 text-[12px] text-muted-foreground">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}