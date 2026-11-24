import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";

export default function useCommunity(activeServerId, isAdmin) {
  const [commands, setCommands] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [starboards, setStarboards] = useState([]);
  const [giveaways, setGiveaways] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [countingGames, setCountingGames] = useState([]);
  const [modActions, setModActions] = useState([]);
  const [levels, setLevels] = useState([]);
  const [roleRewards, setRoleRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!activeServerId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [cmds, autos, stars, gives, tix, suggs, bdays, counts, mods, lvls, rewards] = await Promise.all([
        api.entities.ServerCommand.filter({ server_id: activeServerId }, { limit: 100 }).then((r) => r.items || []),
        api.entities.ServerAutomation.filter({ server_id: activeServerId }, { limit: 50 }).then((r) => r.items || []),
        api.entities.Starboard.filter({ server_id: activeServerId }, { limit: 100, sort: "-star_count" }).then((r) => r.items || []),
        api.entities.Giveaway.filter({ server_id: activeServerId }, { limit: 50, sort: "-created_date" }).then((r) => r.items || []),
        api.entities.Ticket.filter({ server_id: activeServerId }, { limit: 100, sort: "-created_date" }).then((r) => r.items || []),
        api.entities.Suggestion.filter({ server_id: activeServerId }, { limit: 100, sort: "-created_date" }).then((r) => r.items || []),
        api.entities.Birthday.filter({ server_id: activeServerId }, { limit: 200 }).then((r) => r.items || []),
        api.entities.CountingGame.filter({ server_id: activeServerId }, { limit: 50 }).then((r) => r.items || []),
        isAdmin ? api.entities.ModerationAction.filter({ server_id: activeServerId }, { limit: 100, sort: "-created_date" }).then((r) => r.items || []) : Promise.resolve([]),
        api.entities.Level.filter({ server_id: activeServerId }, { limit: 100, sort: "-total_xp" }).then((r) => r.items || []),
        api.entities.RoleReward.filter({ server_id: activeServerId }, { limit: 50 }).then((r) => r.items || []),
      ]);
      setCommands(cmds);
      setAutomations(autos);
      setStarboards(stars);
      setGiveaways(gives);
      setTickets(tix);
      setSuggestions(suggs);
      setBirthdays(bdays);
      setCountingGames(counts);
      setModActions(mods);
      setLevels(lvls);
      setRoleRewards(rewards);
    } catch (e) {
      // ignore load errors
    } finally {
      setLoading(false);
    }
  }, [activeServerId, isAdmin]);

  useEffect(() => {
    loadAll();
    if (!activeServerId) return;
    const unsubCmd = api.entities.ServerCommand.subscribe(() => loadAll());
    const unsubAuto = api.entities.ServerAutomation.subscribe(() => loadAll());
    const unsubGive = api.entities.Giveaway.subscribe(() => loadAll());
    const unsubSugg = api.entities.Suggestion.subscribe(() => loadAll());
    const unsubStar = api.entities.Starboard.subscribe(() => loadAll());
    const unsubTix = api.entities.Ticket.subscribe(() => loadAll());
    const unsubBday = api.entities.Birthday.subscribe(() => loadAll());
    const unsubCount = api.entities.CountingGame.subscribe(() => loadAll());
    const unsubLvl = api.entities.Level.subscribe(() => loadAll());
    const unsubReward = api.entities.RoleReward.subscribe(() => loadAll());
    return () => {
      [unsubCmd, unsubAuto, unsubGive, unsubSugg, unsubStar, unsubTix, unsubBday, unsubCount, unsubLvl, unsubReward].forEach((u) => typeof u === "function" && u());
    };
  }, [activeServerId, loadAll]);

  return {
    commands, automations, starboards, giveaways, tickets, suggestions,
    birthdays, countingGames, modActions, levels, roleRewards, loading, reload: loadAll,
  };
}