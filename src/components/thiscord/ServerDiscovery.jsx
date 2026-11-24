import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Search, Compass, Users, Coins, Lock, Globe } from "lucide-react";
import { api } from "@/api/client";

export default function ServerDiscovery({ userId, profile, onClose, onJoined }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [joining, setJoining] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const page = await api.entities.Server.filter(
        { discoverable: true },
        { sort: "-created_date", limit: 60 }
      );
      const list = (page?.items || []).filter((s) => !(s.member_user_ids || []).includes(userId));
      setServers(list);
    } catch {
      setError("Could not load servers. Try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const filtered = servers.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
  });

  const join = async (target) => {
    let server = target;
    setJoining(server.id);
    setError("");
    try {
      const { server: joined } = await api.servers.join(server.id);
      server = joined;
      if (onJoined) await onJoined(server);
      onClose();
    } catch (err) {
      setError(err?.message || `Could not join "${target.name}". Try again.`);
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card"
      >
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" /> Discover Servers
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Find and join public community servers.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search servers by name or description"
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <Globe className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                {query.trim() ? "No servers match your search." : "No discoverable servers right now."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((server) => (
                <div key={server.id} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3 transition hover:border-primary/40">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl"
                    style={{ backgroundColor: server.color || "#8B5CF6" }}
                  >
                    {server.icon || "🛰️"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{server.name}</h3>
                      {server.invite_only ? (
                        <span className="flex items-center gap-1 text-[10px] text-warning"><Lock className="h-3 w-3" /> Invite</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-success"><Globe className="h-3 w-3" /> Public</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{server.description || "No description provided."}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(server.member_user_ids || []).length} members</span>
                      {server.join_cost > 0 ? (
                        <span className="flex items-center gap-1 text-warning"><Coins className="h-3 w-3" /> {server.join_cost} coins</span>
                      ) : (
                        <span className="text-success">Free to join</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => join(server)}
                    disabled={joining === server.id}
                    className="shrink-0"
                  >
                    {joining === server.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-3 text-center text-xs text-danger">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}