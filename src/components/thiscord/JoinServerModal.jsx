import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, KeyRound, Link2, Users, Coins, Lock } from "lucide-react";
import { api } from "@/api/client";

export default function JoinServerModal({ userId, profile, onClose, onJoined }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState(null);

  const search = async () => {
    setError("");
    setFound(null);
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      let server;
      try {
        server = await api.servers.lookup(trimmed);
      } catch {
        const page = await api.entities.Server.filter({ name: trimmed, discoverable: true }, { limit: 1 });
        server = page?.items?.[0];
      }
      if (!server) {
        setError("No server found with that invite code or name.");
        setLoading(false);
        return;
      }
      if ((server.member_user_ids || []).includes(userId)) {
        setError(`You are already a member of "${server.name}".`);
        setLoading(false);
        return;
      }
      setFound(server);
    } catch {
      setError("Could not search for servers. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    if (!found) return;
    setLoading(true);
    setError("");
    try {
      const { server } = await api.servers.join(found.id, code.trim());
      if (onJoined) await onJoined(server);
      onClose();
    } catch (err) {
      setError(err?.message || `Could not join "${found.name}". Try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Join a Server
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Enter an invite code or server name to join.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Enter invite code or server name"
              className="pl-9 font-mono tracking-wide"
            />
          </div>
          <Button onClick={search} disabled={loading || !code.trim()} variant="secondary" className="mt-2 h-10 w-full">
            {loading && !found ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {found && (
          <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: found.color || "#8B5CF6" }}>
                {found.icon || "🛰️"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-foreground">{found.name}</h3>
                <p className="truncate text-xs text-muted-foreground">{found.description || "No description."}</p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(found.member_user_ids || []).length} members</span>
                  {found.invite_only && <span className="flex items-center gap-1 text-warning"><Lock className="h-3 w-3" /> Invite only</span>}
                  {found.join_cost > 0 ? (
                    <span className="flex items-center gap-1 text-warning"><Coins className="h-3 w-3" /> {found.join_cost} coins</span>
                  ) : (
                    <span className="text-success">Free</span>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={join} disabled={loading} className="mt-3 h-10 w-full font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Join "${found.name}"`}
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-center text-xs text-danger">{error}</p>}
      </motion.div>
    </div>
  );
}