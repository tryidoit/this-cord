import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { ShoppingBag, Plus, Trash2, Check, Coins } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatCoins } from "@/lib/economy";

export default function RoleShop({ serverId, profile, applyProfile, isAdmin, roles }) {
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ role_id: "", role_name: "", price: 100, description: "" });

  const load = useCallback(async () => {
    const page = await api.entities.RoleShopItem.filter({ server_id: serverId, enabled: true }, { sort: "created_date", limit: 50 });
    setItems(page?.items || []);
  }, [serverId]);

  useEffect(() => { load(); }, [load]);

  const addItem = async () => {
    if (!newItem.role_id || !newItem.role_name) {
      toast({ title: "Missing fields", description: "Select a role", variant: "destructive" });
      return;
    }
    await api.entities.RoleShopItem.create({
      server_id: serverId,
      role_id: newItem.role_id,
      role_name: newItem.role_name,
      role_color: roles?.find((r) => r.id === newItem.role_id)?.color || "#6366f1",
      price: newItem.price,
      description: newItem.description,
    });
    setNewItem({ role_id: "", role_name: "", price: 100, description: "" });
    setShowAdd(false);
    await load();
  };

  const purchase = async (item) => {
    if (!profile?.id) return;
    if ((profile.points || 0) < item.price) {
      toast({ title: "Not enough coins", description: `You need ${item.price - (profile.points || 0)} more coins`, variant: "destructive" });
      return;
    }
    // Deduct coins
    const updated = await api.entities.Profile.update(profile.id, { points: (profile.points || 0) - item.price });
    applyProfile(updated);
    // Record purchase
    await api.entities.RoleShopItem.update(item.id, { purchaser_user_ids: [...(item.purchaser_user_ids || []), profile.created_by_id] });
    toast({ title: "Role purchased!", description: `You bought the @${item.role_name} role for ${item.price} coins` });
    await load();
  };

  const deleteItem = async (id) => {
    await api.entities.RoleShopItem.update(id, { enabled: false });
    await load();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
          <ShoppingBag className="h-4 w-4 text-primary" /> Role Shop
        </h3>
        {isAdmin && (
          <button onClick={() => setShowAdd(!showAdd)} className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isAdmin && showAdd && (
        <div className="border-b border-border bg-card p-3 space-y-2">
          <select
            value={newItem.role_id}
            onChange={(e) => setNewItem({ ...newItem, role_id: e.target.value, role_name: roles?.find((r) => r.id === e.target.value)?.name || "" })}
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          >
            <option value="">Select a role...</option>
            {(roles || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input
            type="number"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
            placeholder="Price in coins"
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          />
          <input
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Description"
            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-foreground"
          />
          <button onClick={addItem} className="rounded-lg bg-primary px-4 py-1.5 text-xs text-primary-foreground">Add to shop</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {items.map((item) => {
            const purchased = (item.purchaser_user_ids || []).includes(profile?.created_by_id);
            return (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 rounded-full" style={{ backgroundColor: item.role_color }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.role_name}</p>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning"><Coins className="h-3 w-3" /> {formatCoins({ points: item.price })}</p>
                  </div>
                </div>
                {isAdmin ? (
                  <button onClick={() => deleteItem(item.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : purchased ? (
                  <span className="flex items-center gap-1 text-xs text-success"><Check className="h-3 w-3" /> Owned</span>
                ) : (
                  <button onClick={() => purchase(item)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    Buy
                  </button>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No roles for sale yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}