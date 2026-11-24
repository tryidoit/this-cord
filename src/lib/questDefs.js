// Pure data shared by the client and the server (no imports).
export const DEFAULT_DAILY_QUESTS = [
  { title: "Send 10 messages", metric: "messages", goal: 10, reward_that: 15, icon: "💬" },
  { title: "Win 1 game", metric: "games_won", goal: 1, reward_that: 20, icon: "🎮" },
  { title: "Add a friend", metric: "friends_added", goal: 1, reward_that: 10, icon: "🤝" },
  { title: "Join a voice room", metric: "voice_joined", goal: 1, reward_that: 12, icon: "🎙️" },
];

export const DEFAULT_WEEKLY_QUESTS = [
  { title: "Send 100 messages", metric: "messages", goal: 100, reward_that: 50, icon: "📈" },
  { title: "Win 5 games", metric: "games_won", goal: 5, reward_that: 60, icon: "🏆" },
  { title: "Earn 200 coins", metric: "coins_earned", goal: 200, reward_that: 30, icon: "💰" },
];

export const ACHIEVEMENTS = [
  { id: "first_message", title: "First Words", description: "Send your first message", icon: "📝", metric: "messages", goal: 1 },
  { id: "social_butterfly", title: "Social Butterfly", description: "Send 500 messages", icon: "🦋", metric: "messages", goal: 500 },
  { id: "chatterbox", title: "Chatterbox", description: "Send 2000 messages", icon: "🗣️", metric: "messages", goal: 2000 },
  { id: "gamer", title: "Gamer", description: "Win 10 games", icon: "🎮", metric: "games_won", goal: 10 },
  { id: "pro_gamer", title: "Pro Gamer", description: "Win 50 games", icon: "🏆", metric: "games_won", goal: 50 },
  { id: "rich", title: "Coin Magnate", description: "Earn 10,000 coins total", icon: "💎", metric: "coins_earned", goal: 10000 },
  { id: "voice_regular", title: "Voice Regular", description: "Join 10 voice rooms", icon: "🎙️", metric: "voice_joined", goal: 10 },
  { id: "collector", title: "Collector", description: "Own 10 avatars", icon: "🎭", metric: "avatars_owned", goal: 10 },
];

