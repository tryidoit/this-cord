import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { playDing } from "@/lib/sound";
import { useProfile } from "@/lib/ProfileContext";
import useChatData from "@/hooks/useChatData";
import useCall from "@/hooks/useCall";
import useNotifications from "@/hooks/useNotifications";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import ServerRail from "@/components/thiscord/ServerRail";
import ChatSidebar from "@/components/thiscord/ChatSidebar";
import ChatPane from "@/components/thiscord/ChatPane";
import UserPanel from "@/components/thiscord/UserPanel";
import ProfileSheet from "@/components/thiscord/ProfileSheet";
import CallOverlay from "@/components/thiscord/CallOverlay";
import IncomingCall from "@/components/thiscord/IncomingCall";
import ProfileCard from "@/components/thiscord/ProfileCard";
import InboxPopout from "@/components/thiscord/InboxPopout";
import QuickSwitcher from "@/components/thiscord/QuickSwitcher";
import KeyboardShortcuts, { useKeyboardShortcuts } from "@/components/thiscord/KeyboardShortcuts";
import StatusBanner from "@/components/thiscord/StatusBanner";
import { getWallpapers } from "@/lib/uiStyles";
import { showNotification, getNotificationPermission, requestNotificationPermission } from "@/lib/notify";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import useFriends from "@/hooks/useFriends";
import usePresence from "@/hooks/usePresence";
import useVoiceChannel from "@/hooks/useVoiceChannel";
import VoiceRoomView from "@/components/voice/VoiceRoomView";
import VoiceChannelPanel from "@/components/voice/VoiceChannelPanel";
import useCommunity from "@/hooks/useCommunity";
import ExtraFeaturesPanel from "@/components/ExtraFeaturesPanel";
import { lazyLoad } from "@/lib/lazyLoad";
const NewServerModal = lazyLoad(() => import("@/components/thiscord/NewServerModal"));
const JoinServerModal = lazyLoad(() => import("@/components/thiscord/JoinServerModal"));
const ServerDiscovery = lazyLoad(() => import("@/components/thiscord/ServerDiscovery"));
const GiftDialog = lazyLoad(() => import("@/components/thiscord/GiftDialog"));
const CreateChannelDialog = lazyLoad(() => import("@/components/thiscord/CreateChannelDialog"));
const ChannelSettingsDialog = lazyLoad(() => import("@/components/thiscord/ChannelSettingsDialog"));
const MessageSearch = lazyLoad(() => import("@/components/thiscord/MessageSearch"));
const NotificationSettings = lazyLoad(() => import("@/components/thiscord/NotificationSettings"));
const GroupDMCreateDialog = lazyLoad(() => import("@/components/thiscord/GroupDMCreateDialog"));
const CommunityPanel = lazyLoad(() => import("@/components/community/CommunityPanel"));
const VoiceSettingsPanel = lazyLoad(() => import("@/components/voice/VoiceSettingsPanel"));
const Soundboard = lazyLoad(() => import("@/components/voice/Soundboard"));
const LiveCaptions = lazyLoad(() => import("@/components/voice/LiveCaptions"));
const VoiceActivities = lazyLoad(() => import("@/components/voice/VoiceActivities"));
const StageChannelPanel = lazyLoad(() => import("@/components/voice/StageChannelPanel"));
const IntroOverlay = lazyLoad(() => import("@/components/thiscord/IntroOverlay"));


export default function ThisCord() {
  const { profile, config, isAdmin, isMuted, mutedUntil, nicknameFor, setProfile } = useProfile();
  const chat = useChatData(profile, setProfile);
  const callApi = useCall(profile, config);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("tc_intro_seen"));
  const [showProfile, setShowProfile] = useState(false);
  const [showNewServer, setShowNewServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [cardUser, setCardUser] = useState(null);
  const [giftTarget, setGiftTarget] = useState(null);
  const [reportCount, setReportCount] = useState(0);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createChannelCategory, setCreateChannelCategory] = useState(null);
  const [editChannelTarget, setEditChannelTarget] = useState(null);
  const [serverMembers, setServerMembers] = useState([]);
  const [showGroupDM, setShowGroupDM] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [notifTarget, setNotifTarget] = useState(null);
  const navigate = useNavigate();
  const friends = useFriends(profile);
  const presence = usePresence(profile, setProfile);
  const voice = useVoiceChannel(profile, config);
  const [voicePanel, setVoicePanel] = useState(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const community = useCommunity(chat.activeServerId, isAdmin);
  const notifications = useNotifications(profile, chat, setProfile);
  const { online, wasOffline } = useOnlineStatus();

  // Birthday reminder on login
  useEffect(() => {
    if (!chat.activeServerId || !community.birthdays?.length) return;
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const todays = community.birthdays.filter((b) => b.birth_date?.slice(5) === mmdd);
    if (todays.length > 0) {
      toast({
        title: "🎂 Happy Birthday!",
        description: `Today's birthdays: ${todays.map((b) => `@${b.username}`).join(", ")}`,
      });
    }
  }, [chat.activeServerId, community.birthdays]);

  // Request notification permission on first load
  useEffect(() => {
    if (getNotificationPermission() === "default") {
      requestNotificationPermission();
    }
  }, []);

  // Load pending report count for admin badge
  useEffect(() => {
    if (!isAdmin) return;
    const loadCount = async () => {
      try {
        const count = await api.entities.MessageReport.count({ status: "pending" });
        setReportCount(count || 0);
      } catch { /* ignore */ }
    };
    loadCount();
    const timer = setInterval(() => { if (!document.hidden) loadCount(); }, 30000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  const { selection } = chat;
  const isChatOpen = selection.type === "dm" || selection.type === "channel";
  const serverMode = selection.type === "channel";
  const activeServer = chat.servers.find((s) => s.id === chat.activeServerId);
  const wallpapers = getWallpapers();
  const wallpaperId = profile?.ui_custom?.wallpaper;
  const skin = wallpaperId ? wallpapers.find((w) => w.id === wallpaperId)?.style : null;

  // Refs avoid re-creating the subscription on every players/selection change.
  const playersRef = useRef(null);
  playersRef.current = chat.players;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // Ding + system notification for a DM that lands while you're looking somewhere else.
  useEffect(() => {
    if (!profile?.created_by_id) return undefined;
    const unsub = api.entities.DirectMessage.subscribe((event) => {
      if (event?.type !== "create") return;
      const data = event.data || {};
      if (data.to_user_id !== profile.created_by_id) return;
      const sel = selectionRef.current;
      const openDm = sel.type === "dm" && sel.peer?.user_id === data.from_user_id;
      if (!openDm) {
        playDing();
        const prefs = profile?.notification_prefs || {};
        const dmPref = prefs.dms || "all";
        if (dmPref !== "none") {
          const senderName = data.from_username || "Someone";
          const preview = data.content || (data.attachment_url ? "Sent an attachment" : "");
          showNotification(`New message from @${senderName}`, {
            body: preview.slice(0, 100),
            tag: `dm:${data.from_user_id}`,
            onClick: () => {
              const player = playersRef.current?.[data.from_username];
              if (player) {
                chat.selectDm({
                  user_id: player.created_by_id,
                  username: player.username,
                  display_name: player.display_name,
                  avatar_id: player.avatar_id,
                });
              }
            },
          });
        }
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [profile?.created_by_id, profile?.notification_prefs]);

  const unreadChannelIds = Object.keys(notifications.unreadChannels);

  useKeyboardShortcuts({
    channels: chat.channels,
    selection: chat.selection,
    onSelectChannel: chat.selectChannel,
    onMarkRead: chat.markChannelRead,
    onOpenQuickSwitcher: () => setShowQuickSwitcher(true),
    onOpenShortcuts: () => setShowShortcuts(true),
    onOpenInbox: () => setShowInbox(true),
    onOpenSearch: () => setShowSearch(true),
    unreadChannelIds,
  });

  const handleCreateChannel = (categoryId) => {
    setCreateChannelCategory(categoryId || null);
    setCreateChannelOpen(true);
  };

  const handleCreateCategory = async () => {
    const name = window.prompt("Category name");
    if (name?.trim()) await chat.createCategory(name);
  };

  const handleEditChannel = (channel) => {
    setEditChannelTarget(channel);
  };

  useEffect(() => {
    if (!activeServer?.id) { setServerMembers([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const page = await api.entities.ServerMember.filter({ server_id: activeServer.id }, { limit: 200 });
        if (!cancelled) {
          setServerMembers((page?.items || []).map((m) => ({ id: m.id, user_id: m.user_id, username: m.username })));
        }
      } catch { if (!cancelled) setServerMembers([]); }
    })();
    return () => { cancelled = true; };
  }, [activeServer?.id]);

  // Stable identity (reads players via ref) so memoized message bubbles don't re-render on every update.
  const openProfile = useCallback((username) => {
    const player = playersRef.current[username];
    if (player) setCardUser(player);
  }, []);

  const startDmWith = (player) => {
    chat.selectDm({
      user_id: player.created_by_id,
      username: player.username,
      display_name: player.display_name,
      avatar_id: player.avatar_id,
    });
    setCardUser(null);
  };

  const callPlayer = (player, mode) => {
    callApi.startCall(
      {
        user_id: player.created_by_id,
        username: player.username,
        display_name: player.display_name,
        avatar_id: player.avatar_id,
      },
      mode
    );
    setCardUser(null);
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {profile?.ui_custom?.migratedFrom && (
        <div className="fixed left-0 right-0 top-0 z-50 flex items-center gap-2 border-b border-border bg-primary/10 px-4 py-1.5 backdrop-blur">
          <p className="flex-1 text-[11px] text-foreground">Switched to Discord style — want your old look back?</p>
          <button
            onClick={async () => {
              const updated = await api.entities.Profile.update(profile.id, {
                ui_style_id: "current",
                ui_custom: { ...profile.ui_custom, palette: profile.ui_custom.migratedFrom, wallpaper: profile.ui_custom.migratedFrom },
              });
              setProfile(updated);
            }}
            className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground"
          >
            Switch back
          </button>
        </div>
      )}
      {showIntro && (
        <IntroOverlay
          label="this-cord · live"
          onDone={() => {
            sessionStorage.setItem("tc_intro_seen", "1");
            setShowIntro(false);
          }}
        />
      )}

      <ServerRail
        servers={chat.servers}
        activeServerId={chat.activeServerId}
        isHome={!serverMode}
        onHome={() => chat.setSelection({ type: "home" })}
        onSelectServer={(server) => chat.openServer(server.id)}
        onAddServer={() => setShowNewServer(true)}
        onJoinServer={() => setShowJoinServer(true)}
        onDiscover={() => setShowDiscovery(true)}
        isAdmin={isAdmin}
        reportCount={reportCount}
        serverUnread={notifications.serverUnread}
        totalUnread={notifications.totalUnread}
        totalMentions={notifications.totalMentions}
        onOpenInbox={() => setShowInbox(true)}
      />

      <div className={`${isChatOpen ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border md:w-64`}>
        <div className="min-h-0 flex-1">
          <ChatSidebar
            mode={serverMode ? "server" : "home"}
            serverName={activeServer?.name || "This-Cord"}
            conversations={chat.conversations}
            channels={chat.channels}
            categories={chat.categories}
            selection={selection}
            players={chat.players}
            skin={skin}
            nicknameFor={nicknameFor}
            onOpenProfile={openProfile}
            onSelectDm={chat.selectDm}
            onStartDm={chat.selectDm}
            onSelectChannel={chat.selectChannel}
            onCreateChannel={handleCreateChannel}
            onCreateCategory={handleCreateCategory}
            onEditChannel={handleEditChannel}
            onReorderChannels={chat.reorderChannels}
            onReorderCategories={chat.reorderCategories}
            onLeaveServer={chat.leaveServer}
            activeServer={activeServer}
            isAdmin={isAdmin}
            voiceChannelId={voice.activeChannel?.id}
            onJoinVoice={voice.joinChannel}
            unreadChannels={notifications.unreadChannels}
            onMarkChannelRead={chat.markChannelRead}
            onOpenNotifSettings={(channel) => setNotifTarget({ type: "channel", target: channel })}
            onOpenSearch={() => setShowSearch(true)}
            onOpenCommunity={() => setShowCommunity(true)}
            onOpenExtra={() => setShowExtra(true)}
          />
        </div>
        <UserPanel profile={profile} onOpenProfile={() => setShowProfile(true)} />
      </div>

      <div className={`${isChatOpen ? "flex" : "hidden md:flex"} min-w-0 flex-1`}>
        <ChatPane
          profile={profile}
          selection={selection}
          messages={chat.messages}
          players={chat.players}
          channelReaders={chat.channelReaders}
          reactions={chat.reactions}
          typing={chat.typing}
          pollVotes={chat.pollVotes}
          currentUserId={profile?.created_by_id}
          nicknameFor={nicknameFor}
          isMuted={isMuted}
          mutedUntil={mutedUntil}
          onSend={chat.send}
          onCall={(peer, mode) => callApi.startCall(peer, mode)}
          onOpenProfile={openProfile}
          onBack={() => chat.setSelection({ type: "home" })}
          onEditMessage={chat.editMessage}
          onDeleteMessage={chat.deleteMessage}
          onReportMessage={chat.reportMessage}
          onReact={chat.toggleReaction}
          onTextReact={chat.addTextReaction}
          onVote={chat.votePoll}
          onEndPoll={chat.endPoll}
          onTogglePin={chat.togglePin}
          onBookmark={chat.addBookmark}
          onMarkUnread={chat.markUnread}
          onForward={chat.forwardMessage}
          onSetTyping={chat.setTypingIndicator}
          onSuperReact={chat.superReact}
          onSendVoiceMessage={chat.sendVoiceMessage}
          onNavigate={(path) => navigate(path)}
          playersList={chat.playersList}
          conversations={chat.conversations}
          onCallPlayer={callPlayer}
          onOpenGiftDialog={(player, presetAmount, note) => {
            setGiftTarget({ ...player, _presetAmount: presetAmount, _presetNote: note });
            setCardUser(null);
          }}
          onOpenProfileCard={openProfile}
          onStartDm={startDmWith}
          threads={chat.threads}
          serverMembers={serverMembers}
          roles={[]}
          onCreateThread={chat.createThread}
          onCreateThreadFromMessage={chat.createThreadFromMessage}
          onJoinThread={chat.joinThread}
          onLeaveThread={chat.leaveThread}
          onLockThread={chat.lockThread}
          onPinThread={chat.pinThread}
          onUpdateThreadNotif={chat.updateThreadNotification}
          onEditChannel={handleEditChannel}
          onUpdateChannel={chat.updateChannel}
          onDeleteChannel={chat.deleteChannel}
          onCloneChannel={chat.cloneChannel}
          onInviteToChannel={chat.inviteToChannel}
          onCloseDm={chat.closeDm}
          onToggleMuteDm={chat.toggleMuteDm}
          isDmMuted={selection.type === "dm" ? chat.isDmMuted(selection.peer) : false}
          onSaveNote={chat.saveUserNote}
          applyProfile={setProfile}
          channels={chat.channels}
          servers={chat.servers}
          onMarkAllRead={notifications.markAllRead}
        />
      </div>

      {showProfile && (
        <ProfileSheet profile={profile} onClose={() => setShowProfile(false)} onSaved={(updated) => setProfile(updated)} />
      )}

      {showNewServer && <NewServerModal onClose={() => setShowNewServer(false)} onCreate={chat.createServer} />}

      {showJoinServer && (
        <JoinServerModal
          userId={profile.created_by_id}
          profile={profile}
          onClose={() => setShowJoinServer(false)}
          onJoined={async (server) => { await chat.loadServers(); chat.openServer(server.id); }}
        />
      )}

      {showDiscovery && (
        <ServerDiscovery
          userId={profile.created_by_id}
          profile={profile}
          onClose={() => setShowDiscovery(false)}
          onJoined={async (server) => { await chat.loadServers(); chat.openServer(server.id); }}
        />
      )}

      {createChannelOpen && (
        <CreateChannelDialog
          open={createChannelOpen}
          defaultCategoryId={createChannelCategory}
          onClose={() => setCreateChannelOpen(false)}
          onCreate={async (opts) => {
            await chat.createChannel(opts);
            setCreateChannelOpen(false);
          }}
        />
      )}

      {editChannelTarget && (
        <ChannelSettingsDialog
          channel={editChannelTarget}
          server={activeServer}
          members={serverMembers}
          roles={[]}
          onClose={() => setEditChannelTarget(null)}
          onUpdate={chat.updateChannel}
          onDelete={chat.deleteChannel}
          onClone={chat.cloneChannel}
          onInvite={chat.inviteToChannel}
        />
      )}

      {cardUser && (
        <ProfileCard
          player={cardUser}
          onClose={() => setCardUser(null)}
          onDm={startDmWith}
          onCall={callPlayer}
          onGift={(player) => {
            setGiftTarget(player);
            setCardUser(null);
          }}
          onAddFriend={(username) => {
            friends.sendRequest(username);
            setCardUser(null);
          }}
          friendshipStatus={
            friends.isFriend(cardUser.created_by_id) ? "accepted" :
            friends.pendingOutgoing.some((f) => f.recipient_username === cardUser.username) ? "pending" :
            friends.isBlocked(cardUser.created_by_id) ? "blocked" : null
          }
        />
      )}

      {showGroupDM && (
        <GroupDMCreateDialog
          onClose={() => setShowGroupDM(false)}
          onCreated={(gdm) => {
            chat.selectDm({
              user_id: gdm.id,
              username: gdm.name,
              display_name: gdm.name,
              avatar_id: null,
              is_group: true,
              group_id: gdm.id,
              thread_key: gdm.thread_key,
            });
          }}
        />
      )}

      {giftTarget && <GiftDialog player={giftTarget} onClose={() => setGiftTarget(null)} />}

      {callApi.incoming && (
        <IncomingCall
          call={callApi.incoming}
          ringtoneUri={profile?.ringtone_uri}
          onAccept={() => callApi.acceptCall(callApi.incoming)}
          onDecline={() => callApi.declineCall(callApi.incoming)}
        />
      )}

      {callApi.call && (
        <CallOverlay
          call={callApi.call}
          localStream={callApi.localStream}
          remoteStream={callApi.remoteStream}
          connection={callApi.connection}
          muted={callApi.muted}
          camOff={callApi.camOff}
          remoteMuted={callApi.remoteMuted}
          remoteCamOff={callApi.remoteCamOff}
          error={callApi.error}
          fallbackMode={callApi.fallbackMode}
          fallbackFrame={callApi.fallbackFrame}
          stats={callApi.stats}
          connectedAt={callApi.connectedAt}
          onToggleMute={callApi.toggleMute}
          onToggleCam={callApi.toggleCam}
          onEnd={callApi.endCall}
          onUpgrade={callApi.upgradeToVideo}
          onDowngrade={callApi.downgradeToVoice}
          onToggleScreenShare={callApi.toggleScreenShare}
          screenSharing={callApi.screenSharing}
        />
      )}

      {config?.double_points && (
        <div className="pointer-events-none fixed bottom-4 right-4 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-warning">
          2× Coins event live
        </div>
      )}

      {/* Voice room overlay */}
      {voice.activeChannel && (
        <VoiceRoomView
          channel={voice.activeChannel}
          participants={voice.participants}
          localStream={voice.localStream}
          currentUserId={profile?.created_by_id}
          muted={voice.muted}
          deafened={voice.deafened}
          camOn={voice.camOn}
          screenSharing={voice.screenSharing}
          speaking={voice.speaking}
          error={voice.error}
          connectionQuality={voice.connectionQuality}
          perUserVolume={voice.perUserVolume}
          onToggleMute={voice.toggleMute}
          onToggleDeafen={voice.toggleDeafen}
          onToggleCamera={voice.toggleCamera}
          onToggleScreenShare={voice.toggleScreenShare}
          onLeave={voice.leaveChannel}
          onOpenSettings={() => setVoicePanel("settings")}
          onOpenSoundboard={() => setVoicePanel("soundboard")}
          onOpenActivities={() => setVoicePanel("activities")}
          onChangePerUserVolume={voice.changePerUserVolume}
        />
      )}

      {/* Voice channel panel in sidebar */}
      {voice.activeChannel && selection.type === "channel" && selection.channel?.id === voice.activeChannel.id && (
        <div className="absolute bottom-14 left-2 z-20 w-60">
          {voice.activeChannel.type === "stage" ? (
            <StageChannelPanel
              channel={voice.activeChannel}
              participants={voice.participants}
              currentUserId={profile?.created_by_id}
              isAdmin={isAdmin}
              isActive
              onRaiseHand={voice.raiseHand}
              onInviteToSpeak={voice.inviteToSpeak}
              onRemoveFromStage={voice.removeFromStage}
              onLeave={voice.leaveChannel}
            />
          ) : (
            <VoiceChannelPanel
              channel={voice.activeChannel}
              participants={voice.participants}
              currentUserId={profile?.created_by_id}
              isActive
              onLeave={voice.leaveChannel}
              onOpenSettings={() => setVoicePanel("settings")}
              onOpenSoundboard={() => setVoicePanel("soundboard")}
              onOpenActivities={() => setVoicePanel("activities")}
            />
          )}
        </div>
      )}

      {/* Voice panels */}
      {voicePanel === "settings" && (
        <VoiceSettingsPanel
          voiceEffect={voice.voiceEffect}
          pushToTalkKey={voice.pushToTalkKey}
          inputDevices={voice.inputDevices}
          outputDevices={voice.outputDevices}
          selectedInput={voice.selectedInput}
          selectedOutput={voice.selectedOutput}
          inputVolume={voice.inputVolume}
          isPrioritySpeaker={voice.isPrioritySpeaker}
          onChangeVoiceEffect={voice.changeVoiceEffect}
          onChangeInputDevice={voice.changeInputDevice}
          onChangeOutputDevice={voice.changeOutputDevice}
          onChangeInputVolume={voice.changeInputVolume}
          onSetPushToTalkKey={voice.setPushToTalkKey}
          onTogglePrioritySpeaker={voice.togglePrioritySpeaker}
          onClose={() => setVoicePanel(null)}
        />
      )}
      {voicePanel === "soundboard" && (
        <Soundboard
          onPlay={voice.playSoundboardSound}
          onClose={() => setVoicePanel(null)}
        />
      )}
      {voicePanel === "activities" && (
        <VoiceActivities
          participants={voice.participants}
          currentUserId={profile?.created_by_id}
          onClose={() => setVoicePanel(null)}
        />
      )}
      {voicePanel === "captions" && (
        <LiveCaptions onClose={() => setVoicePanel(null)} />
      )}

      {/* Phase 8: Notifications, Search, Navigation, Accessibility */}
      <StatusBanner online={online} wasOffline={wasOffline} />

      <InboxPopout
        open={showInbox}
        onClose={() => setShowInbox(false)}
        mentionMessages={notifications.mentionMessages}
        replyMessages={notifications.replyMessages}
        unreadChannels={notifications.unreadChannels}
        conversations={chat.conversations}
        players={chat.players}
        channels={chat.channels}
        servers={chat.servers}
        onSelectChannel={chat.selectChannel}
        onSelectDm={chat.selectDm}
        onMarkAllRead={notifications.markAllRead}
      />

      <MessageSearch
        open={showSearch}
        onClose={() => setShowSearch(false)}
        channels={chat.channels}
        servers={chat.servers}
        players={chat.players}
        userId={profile?.created_by_id}
        onJumpToChannel={chat.selectChannel}
      />

      <QuickSwitcher
        open={showQuickSwitcher}
        onClose={() => setShowQuickSwitcher(false)}
        servers={chat.servers}
        channels={chat.channels}
        conversations={chat.conversations}
        players={chat.players}
        selection={selection}
        onSelectChannel={chat.selectChannel}
        onSelectDm={chat.selectDm}
        onSelectServer={(server) => chat.openServer(server.id)}
      />

      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {showCommunity && (
        <CommunityPanel
          open={showCommunity}
          onClose={() => setShowCommunity(false)}
          server={activeServer}
          community={community}
          channels={chat.channels}
          isAdmin={isAdmin}
          currentUserId={profile?.created_by_id}
          profile={profile}
          serverMembers={serverMembers}
        />
      )}

      {notifTarget && (
        <NotificationSettings
          open={!!notifTarget}
          onClose={() => setNotifTarget(null)}
          target={notifTarget.target}
          targetType={notifTarget.type}
          currentPrefs={notifications.notificationPrefs}
          onUpdate={notifications.updateNotificationPrefs}
        />
      )}

      {showExtra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowExtra(false)}>
          <div className="h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <ExtraFeaturesPanel
              profile={profile}
              applyProfile={setProfile}
              config={config}
              activeServer={activeServer}
              serverMembers={serverMembers}
              roles={[]}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      )}
    </div>
  );
}