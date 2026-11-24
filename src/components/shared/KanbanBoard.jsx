import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { Plus, X, Trash2, MessageSquare, Calendar, User } from "lucide-react";

const LABEL_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

export default function KanbanBoard({ channelId, serverId, username, serverMembers }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [newColName, setNewColName] = useState("");
  const [showNewCol, setShowNewCol] = useState(false);
  const [draggedCard, setDraggedCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  const load = useCallback(async () => {
    const [cols, crds] = await Promise.all([
      api.entities.BoardColumn.filter({ channel_id: channelId }, { sort: "position", limit: 50 }),
      api.entities.BoardCard.filter({ channel_id: channelId }, { sort: "position", limit: 500 }),
    ]);
    setColumns(cols?.items || []);
    setCards(crds?.items || []);
  }, [channelId]);

  useEffect(() => {
    load();
    const unsub = api.entities.BoardCard.subscribe(() => load());
    return unsub;
  }, [load]);

  const addColumn = async () => {
    if (!newColName.trim()) return;
    await api.entities.BoardColumn.create({
      channel_id: channelId,
      server_id: serverId,
      name: newColName.trim(),
      position: columns.length,
      color: LABEL_COLORS[columns.length % LABEL_COLORS.length],
    });
    setNewColName("");
    setShowNewCol(false);
    await load();
  };

  const addCard = async (columnId) => {
    const title = prompt("Card title:");
    if (!title?.trim()) return;
    const colCards = cards.filter((c) => c.column_id === columnId);
    await api.entities.BoardCard.create({
      channel_id: channelId,
      server_id: serverId,
      column_id: columnId,
      title: title.trim(),
      position: colCards.length,
    });
    await load();
  };

  const moveCard = async (cardId, targetColumnId) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.column_id === targetColumnId) return;
    const targetCards = cards.filter((c) => c.column_id === targetColumnId);
    await api.entities.BoardCard.update(cardId, {
      column_id: targetColumnId,
      position: targetCards.length,
    });
    await load();
  };

  const deleteCard = async (cardId) => {
    await api.entities.BoardCard.delete(cardId);
    setSelectedCard(null);
    await load();
  };

  const deleteColumn = async (colId) => {
    const colCards = cards.filter((c) => c.column_id === colId);
    await Promise.all(colCards.map((c) => api.entities.BoardCard.delete(c.id).catch(() => {})));
    await api.entities.BoardColumn.delete(colId);
    await load();
  };

  const updateCard = async (cardId, updates) => {
    await api.entities.BoardCard.update(cardId, updates);
    await load();
  };

  const addComment = async (cardId, text) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const comments = [...(card.comments || []), { username, text, at: new Date().toISOString() }];
    await updateCard(cardId, { comments });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <h3 className="font-display text-sm font-bold text-foreground">Kanban Board</h3>
        <span className="text-xs text-muted-foreground">{columns.length} columns · {cards.length} cards</span>
      </div>
      <div className="flex flex-1 gap-3 overflow-x-auto p-3">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-card"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (draggedCard) moveCard(draggedCard, col.id); setDraggedCard(null); }}
          >
            <div className="flex items-center justify-between px-3 py-2" style={{ borderTopColor: col.color, borderTopWidth: 3 }}>
              <span className="text-sm font-semibold text-foreground">{col.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{cards.filter((c) => c.column_id === col.id).length}</span>
                <button onClick={() => addCard(col.id)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteColumn(col.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {cards.filter((c) => c.column_id === col.id).sort((a, b) => a.position - b.position).map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => setDraggedCard(card.id)}
                  onClick={() => setSelectedCard(card)}
                  className="cursor-pointer rounded-lg border border-border bg-background p-2.5 transition hover:border-primary/50"
                >
                  <p className="text-sm font-medium text-foreground">{card.title}</p>
                  {card.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.description}</p>}
                  {card.labels?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {card.labels.map((lb, i) => (
                        <span key={i} className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ backgroundColor: lb }}>
                          label
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    {card.due_date && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{card.due_date}</span>}
                    {card.assignee_usernames?.length > 0 && <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{card.assignee_usernames.length}</span>}
                    {card.comments?.length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{card.comments.length}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="w-64 shrink-0">
          {showNewCol ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <input
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addColumn(); if (e.key === "Escape") setShowNewCol(false); }}
                placeholder="Column name"
                className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={addColumn} className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground">Add</button>
                <button onClick={() => setShowNewCol(false)} className="text-xs text-muted-foreground">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewCol(true)} className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
              <Plus className="h-4 w-4" /> Add column
            </button>
          )}
        </div>
      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedCard(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <input
                value={selectedCard.title}
                onChange={(e) => setSelectedCard({ ...selectedCard, title: e.target.value })}
                onBlur={(e) => updateCard(selectedCard.id, { title: e.target.value })}
                className="flex-1 bg-transparent text-lg font-bold text-foreground"
              />
              <button onClick={() => setSelectedCard(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <textarea
              value={selectedCard.description || ""}
              onChange={(e) => setSelectedCard({ ...selectedCard, description: e.target.value })}
              onBlur={(e) => updateCard(selectedCard.id, { description: e.target.value })}
              placeholder="Add description..."
              className="mb-3 w-full rounded-lg border border-border bg-input p-2 text-sm text-foreground"
              rows={3}
            />
            <div className="mb-3 flex gap-2">
              <input
                type="date"
                value={selectedCard.due_date || ""}
                onChange={(e) => { updateCard(selectedCard.id, { due_date: e.target.value }); setSelectedCard({ ...selectedCard, due_date: e.target.value }); }}
                className="rounded-lg border border-border bg-input px-2 py-1 text-xs text-foreground"
              />
              <select
                value={selectedCard.assignee_usernames?.[0] || ""}
                onChange={(e) => updateCard(selectedCard.id, { assignee_usernames: e.target.value ? [e.target.value] : [] })}
                className="rounded-lg border border-border bg-input px-2 py-1 text-xs text-foreground"
              >
                <option value="">Unassigned</option>
                {serverMembers.map((m) => <option key={m.user_id} value={m.username}>{m.username}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Comments</p>
              <div className="max-h-32 space-y-1.5 overflow-y-auto">
                {(selectedCard.comments || []).map((c, i) => (
                  <div key={i} className="rounded-lg bg-muted p-2">
                    <p className="text-xs text-foreground"><span className="font-medium">@{c.username}</span>: {c.text}</p>
                  </div>
                ))}
              </div>
              <input
                placeholder="Add a comment..."
                onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { addComment(selectedCard.id, e.target.value); e.target.value = ""; } }}
                className="mt-2 w-full rounded-lg border border-border bg-input px-2 py-1 text-xs text-foreground"
              />
            </div>
            <button onClick={() => deleteCard(selectedCard.id)} className="flex items-center gap-1 text-xs text-destructive hover:underline">
              <Trash2 className="h-3 w-3" /> Delete card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}