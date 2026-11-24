import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { toast } from "@/components/ui/use-toast";

export default function useFriends(profile) {
  const userId = profile?.created_by_id;
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFriendships = useCallback(async () => {
    if (!userId) return;
    try {
      const [sent, received] = await Promise.all([
        api.entities.Friendship.filter({ requester_user_id: userId }, { limit: 200 }),
        api.entities.Friendship.filter({ recipient_user_id: userId }, { limit: 200 }),
      ]);
      setFriendships([...(sent?.items || []), ...(received?.items || [])]);
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadFriendships(); }, [loadFriendships]);

  // Subscribe to new friendship events
  useEffect(() => {
    if (!userId) return;
    const unsub = api.entities.Friendship.subscribe(() => { loadFriendships(); });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [userId, loadFriendships]);

  const sendRequest = useCallback(async (recipientUsername) => {
    if (!userId || !recipientUsername) return;
    const clean = recipientUsername.trim().replace(/^@/, "");
    if (clean.toLowerCase() === profile?.username?.toLowerCase()) {
      toast({ title: "You can't friend yourself" });
      return;
    }
    const page = await api.entities.Profile.filter({ username: clean }, { limit: 1 });
    const target = page?.items?.[0];
    if (!target) { toast({ title: "User not found", variant: "destructive" }); return; }
    const existing = friendships.find(
      (f) => (f.requester_user_id === userId && f.recipient_user_id === target.created_by_id) ||
             (f.recipient_user_id === userId && f.requester_user_id === target.created_by_id)
    );
    if (existing) {
      toast({ title: existing.status === "accepted" ? "Already friends" : "Request already sent" });
      return;
    }
    await api.entities.Friendship.create({
      requester_user_id: userId,
      requester_username: profile.username,
      recipient_user_id: target.created_by_id,
      recipient_username: target.username,
      status: "pending",
    });
    toast({ title: `Friend request sent to @${clean}` });
    loadFriendships();
  }, [userId, profile, friendships, loadFriendships]);

  const acceptRequest = useCallback(async (friendshipId) => {
    await api.entities.Friendship.update(friendshipId, { status: "accepted" });
    loadFriendships();
  }, [loadFriendships]);

  const ignoreRequest = useCallback(async (friendshipId) => {
    await api.entities.Friendship.update(friendshipId, { status: "ignored" });
    loadFriendships();
  }, [loadFriendships]);

  const removeFriend = useCallback(async (friendshipId) => {
    await api.entities.Friendship.delete(friendshipId);
    loadFriendships();
  }, [loadFriendships]);

  const blockUser = useCallback(async (targetUserId, targetUsername) => {
    if (!userId) return;
    const existing = friendships.find(
      (f) => f.requester_user_id === userId && f.recipient_user_id === targetUserId
    );
    if (existing) {
      await api.entities.Friendship.update(existing.id, { status: "blocked" });
    } else {
      await api.entities.Friendship.create({
        requester_user_id: userId,
        requester_username: profile.username,
        recipient_user_id: targetUserId,
        recipient_username: targetUsername,
        status: "blocked",
      });
    }
    toast({ title: `Blocked @${targetUsername}` });
    loadFriendships();
  }, [userId, profile, friendships, loadFriendships]);

  const unblock = useCallback(async (friendshipId) => {
    await api.entities.Friendship.delete(friendshipId);
    loadFriendships();
  }, [loadFriendships]);

  const isFriend = useCallback((targetUserId) => {
    return friendships.some(
      (f) => f.status === "accepted" &&
        ((f.requester_user_id === userId && f.recipient_user_id === targetUserId) ||
         (f.recipient_user_id === userId && f.requester_user_id === targetUserId))
    );
  }, [friendships, userId]);

  const isBlocked = useCallback((targetUserId) => {
    return friendships.some(
      (f) => f.status === "blocked" && f.requester_user_id === userId && f.recipient_user_id === targetUserId
    );
  }, [friendships, userId]);

  const pendingIncoming = friendships.filter((f) => f.recipient_user_id === userId && f.status === "pending");
  const pendingOutgoing = friendships.filter((f) => f.requester_user_id === userId && f.status === "pending");
  const accepted = friendships.filter((f) => f.status === "accepted");
  const blocked = friendships.filter((f) => f.status === "blocked" && f.requester_user_id === userId);

  const friendUserIds = accepted.map((f) =>
    f.requester_user_id === userId ? f.recipient_user_id : f.requester_user_id
  );

  return {
    friendships,
    loading,
    pendingIncoming,
    pendingOutgoing,
    accepted,
    blocked,
    friendUserIds,
    sendRequest,
    acceptRequest,
    ignoreRequest,
    removeFriend,
    blockUser,
    unblock,
    isFriend,
    isBlocked,
    reload: loadFriendships,
  };
}