import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Hash,
  Volume2,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings2,
  Bell,
  BellOff,
  BellRing,
  Lock,
  Pin,
  AlertTriangle,
} from "lucide-react";
// (imports resolved)
import { getChannelType, isThreadArchived } from "@/lib/channelTypes";
import { cn } from "@/lib/utils";

const CATEGORY_COLLAPSE_KEY = "tc_cat_collapsed";

function loadCollapsed() {
  try {
    return JSON.parse(localStorage.getItem(CATEGORY_COLLAPSE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCollapsed(state) {
  localStorage.setItem(CATEGORY_COLLAPSE_KEY, JSON.stringify(state));
}

function ChannelIcon({ type, className }) {
  const Icon = getChannelType(type).icon;
  return <Icon className={className} />;
}

function ChannelRow({ channel, selection, onSelect, onSettings, notificationLevel, isThread, voiceChannelId, onJoinVoice, unread, onMarkRead, onOpenNotifSettings }) {
  const active = selection.type === "channel" && selection.channel?.id === channel.id;
  const archived = isThread && isThreadArchived(channel);
  const isPrivate = channel.is_private || channel.thread_type === "private";
  const isVoiceChannel = channel.type === "voice" || channel.type === "stage";
  const inVoice = isVoiceChannel && voiceChannelId === channel.id;
  const [ctxMenu, setCtxMenu] = useState(null);

  const BellIcon = notificationLevel === "none" ? BellOff : notificationLevel === "mentions" ? BellRing : Bell;

  const closeCtx = () => setCtxMenu(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const onClick = () => setCtxMenu(null);
    const onEsc = (e) => { if (e.key === "Escape") setCtxMenu(null); };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [ctxMenu]);

  return (
    <>
      <div
        onClick={() => onSelect(channel)}
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 220) });
        }}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition",
          active ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          archived && "opacity-50",
          inVoice && "bg-success/10 text-foreground",
          unread?.count > 0 && !active && "text-foreground"
        )}
      >
        <ChannelIcon type={channel.type || "text"} className={cn("h-4 w-4 opacity-60 shrink-0", inVoice && "text-success", unread?.count > 0 && !active && "opacity-100")} />
        <span className="min-w-0 flex-1 truncate">{channel.name}</span>
        {isPrivate && <Lock className="h-3 w-3 shrink-0 opacity-50" />}
        {archived && <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />}
        {channel.pinned_message_ids?.length > 0 && <Pin className="h-3 w-3 shrink-0 opacity-50" />}
        {isVoiceChannel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoinVoice?.(channel);
            }}
            className={cn(
              "grid h-5 w-5 shrink-0 place-items-center rounded transition",
              inVoice ? "text-success opacity-100" : "opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-50"
            )}
            title={inVoice ? "Connected" : "Join voice"}
          >
            <Volume2 className={cn("h-3.5 w-3.5", inVoice && "animate-pulse")} />
          </button>
        )}
        {unread?.count > 0 && !isVoiceChannel && (
          <span className={cn(
            "shrink-0 rounded-full px-1.5 text-[9px] font-bold text-foreground",
            unread.mention ? "bg-danger" : "bg-primary"
          )}>
            {unread.count > 99 ? "99+" : unread.count}
          </span>
        )}
        {!isVoiceChannel && !unread?.count && <BellIcon className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50" />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSettings?.(channel);
          }}
          className="grid h-5 w-5 shrink-0 place-items-center rounded opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
          title="Edit channel"
          aria-label={`Edit channel ${channel.name}`}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onSelect(channel); closeCtx(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-foreground transition hover:bg-muted"
          >
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            Open channel
          </button>
          <button
            onClick={() => { onMarkRead?.(channel.id); closeCtx(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-foreground transition hover:bg-muted"
          >
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            Mark as read
          </button>
          <button
            onClick={() => { onOpenNotifSettings?.(channel); closeCtx(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-foreground transition hover:bg-muted"
          >
            <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
            Notification settings
          </button>
          <button
            onClick={() => { onSettings?.(channel); closeCtx(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-foreground transition hover:bg-muted"
          >
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            Edit channel
          </button>
        </div>
      )}
    </>
  );
}

function CategoryHeader({ category, collapsed, onToggle, onAddChannel, isAdmin }) {
  return (
    <div className="group mt-3 flex items-center gap-1 px-1">
      <button
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
        <span className="truncate">{category?.name || "Uncategorized"}</span>
      </button>
      {isAdmin && (
        <button
          onClick={onAddChannel}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
          title="Create channel"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function ChannelList({
  channels,
  categories,
  selection,
  serverId,
  isAdmin,
  onSelectChannel,
  onCreateChannel,
  onCreateCategory,
  onEditChannel,
  onReorderChannels,
  onReorderCategories,
  onToggleCategoryCollapse,
  voiceChannelId,
  onJoinVoice,
  unreadChannels,
  onMarkRead,
  onOpenNotifSettings,
}) {
  const [collapsedState, setCollapsedState] = useState(loadCollapsed);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    setCollapsedState(loadCollapsed());
  }, [serverId]);

  const toggleCollapse = useCallback(
    (categoryId) => {
      const next = { ...collapsedState, [categoryId || "uncat"]: !collapsedState[categoryId || "uncat"] };
      setCollapsedState(next);
      saveCollapsed(next);
      onToggleCategoryCollapse?.(categoryId);
    },
    [collapsedState, onToggleCategoryCollapse]
  );

  // Group channels by category
  const grouped = useMemo(() => {
    const map = new Map();
    const sortedCategories = [...(categories || [])].sort((a, b) => (a.position || 0) - (b.position || 0));

    // Non-thread channels only — threads are shown in ThreadList
    const regularChannels = (channels || [])
      .filter((ch) => ch.type !== "thread" && !ch.parent_channel_id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    sortedCategories.forEach((cat) => {
      map.set(cat.id, { category: cat, channels: [] });
    });
    map.set(null, { category: null, channels: [] });

    regularChannels.forEach((ch) => {
      const key = ch.category_id || null;
      if (!map.has(key)) map.set(key, { category: null, channels: [] });
      map.get(key).channels.push(ch);
    });

    return [...map.values()];
  }, [channels, categories]);

  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) return;
      const { source, destination, type } = result;

      if (type === "category") {
        const reordered = [...(categories || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
        const [moved] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, moved);
        const updates = reordered.map((cat, i) => ({ id: cat.id, position: i }));
        onReorderCategories?.(updates);
      } else if (type === "channel") {
        const sourceCatId = source.droppableId === "uncat" ? null : source.droppableId;
        const destCatId = destination.droppableId === "uncat" ? null : destination.droppableId;
        const sourceGroup = grouped.find((g) => (g.category?.id || null) === sourceCatId);
        const destGroup = grouped.find((g) => (g.category?.id || null) === destCatId);
        if (!sourceGroup || !destGroup) return;

        const sourceChannels = [...sourceGroup.channels];
        const [moved] = sourceChannels.splice(source.index, 1);
        const destChannels = destCatId === sourceCatId ? sourceChannels : [...destGroup.channels];
        destChannels.splice(destination.index, 0, moved);

        const updates = destChannels.map((ch, i) => ({
          id: ch.id,
          position: i,
          category_id: destCatId,
        }));
        onReorderChannels?.(updates);
      }
    },
    [categories, grouped, onReorderChannels, onReorderCategories]
  );

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-3">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories" type="category">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {grouped.map((group, catIndex) => {
                const catKey = group.category?.id || "uncat";
                const isCollapsed = collapsedState[catKey];
                const droppableId = group.category?.id || "uncat";

                return (
                  <Draggable
                    key={catKey}
                    draggableId={catKey}
                    index={catIndex}
                    isDragDisabled={!isAdmin}
                  >
                    {(catProvided) => (
                      <div ref={catProvided.innerRef} {...catProvided.draggableProps}>
                        <div {...catProvided.dragHandleProps}>
                          <CategoryHeader
                            category={group.category}
                            collapsed={isCollapsed}
                            onToggle={() => toggleCollapse(group.category?.id)}
                            onAddChannel={() => onCreateChannel?.(group.category?.id)}
                            isAdmin={isAdmin}
                          />
                        </div>
                        {!isCollapsed && (
                          <Droppable droppableId={droppableId} type="channel">
                            {(dropProvided) => (
                              <div
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                                className="mt-0.5 space-y-0.5"
                              >
                                {group.channels.map((channel, chIndex) => (
                                  <Draggable
                                    key={channel.id}
                                    draggableId={channel.id}
                                    index={chIndex}
                                    isDragDisabled={!isAdmin}
                                  >
                                    {(chProvided) => (
                                      <div ref={chProvided.innerRef} {...chProvided.draggableProps} {...chProvided.dragHandleProps}>
                                        <ChannelRow
                                          channel={channel}
                                          selection={selection}
                                          onSelect={onSelectChannel}
                                          onSettings={onEditChannel}
                                          voiceChannelId={voiceChannelId}
                                          onJoinVoice={onJoinVoice}
                                          unread={unreadChannels?.[channel.id]}
                                          onMarkRead={onMarkRead}
                                          onOpenNotifSettings={onOpenNotifSettings}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {dropProvided.placeholder}
                                {group.channels.length === 0 && isAdmin && (
                                  <p className="px-2 py-1 text-[11px] text-muted-foreground/60">No channels</p>
                                )}
                              </div>
                            )}
                          </Droppable>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {isAdmin && (
        <button
          onClick={() => onCreateCategory?.()}
          className="mt-3 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Category
        </button>
      )}

      {channels.length === 0 && !isAdmin && (
        <p className="px-3 pt-4 text-[12px] text-muted-foreground">No channels in this server yet.</p>
      )}
    </div>
  );
}