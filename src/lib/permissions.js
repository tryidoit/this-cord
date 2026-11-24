// Discord-style permission bitfield. Each permission is a power-of-two bit.
// Roles store a combined bitfield; channel overrides add (allow) or subtract (deny).

export const PERMISSIONS = {
  ADMINISTRATOR: 1n << 0n,
  VIEW_CHANNELS: 1n << 1n,
  MANAGE_CHANNELS: 1n << 2n,
  MANAGE_ROLES: 1n << 3n,
  MANAGE_SERVER: 1n << 4n,
  CREATE_INVITE: 1n << 5n,
  CHANGE_NICKNAME: 1n << 6n,
  MANAGE_NICKNAMES: 1n << 7n,
  KICK: 1n << 8n,
  BAN: 1n << 9n,
  TIMEOUT_MEMBERS: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_IN_THREADS: 1n << 12n,
  CREATE_THREADS: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  ADD_REACTIONS: 1n << 16n,
  USE_EXTERNAL_EMOJI: 1n << 17n,
  MENTION_EVERYONE: 1n << 18n,
  MANAGE_MESSAGES: 1n << 19n,
  MANAGE_THREADS: 1n << 20n,
  READ_MESSAGE_HISTORY: 1n << 21n,
  USE_SLASH_COMMANDS: 1n << 22n,
  SEND_VOICE_MESSAGES: 1n << 23n,
  CREATE_POLLS: 1n << 24n,
  CONNECT: 1n << 25n,
  SPEAK: 1n << 26n,
  VIDEO: 1n << 27n,
  MUTE_MEMBERS: 1n << 28n,
  DEAFEN_MEMBERS: 1n << 29n,
  MOVE_MEMBERS: 1n << 30n,
  PRIORITY_SPEAKER: 1n << 31n,
  USE_SOUNDBOARD: 1n << 32n,
  USE_VOICE_ACTIVITY: 1n << 33n,
  REQUEST_TO_SPEAK: 1n << 34n,
  MANAGE_EVENTS: 1n << 35n,
  VIEW_AUDIT_LOG: 1n << 36n,
  MANAGE_WEBHOOKS: 1n << 37n,
  MANAGE_EMOJI_AND_STICKERS: 1n << 38n,
};

export const PERMISSION_LIST = Object.entries(PERMISSIONS).map(([name, bit]) => ({
  name,
  label: name
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" "),
  bit,
}));

// ── can(user, permission, context) ──
// user: the profile object (has is_admin, moderator fields)
// permission: a BigInt from PERMISSIONS
// context: { server?, channel?, roles?, overrides?, member? }
//   - server: the Server record
//   - channel: the Channel record
//   - roles: Role[] — the roles the user has in this server
//   - overrides: ChannelOverride[] — per-channel overrides for the user's roles
//   - member: boolean — whether the user is a member of the server
export function can(user, permission, context = {}) {
  if (!user) return false;
  // Platform admins (is_admin on Profile) bypass everything
  if (user.is_admin) return true;
  if (!context.server) return false;

  const { roles = [], overrides = [], channel } = context;

  // Combine all role permissions
  let combined = 0n;
  for (const role of roles) {
    combined |= BigInt(role.permissions || 0);
  }

  // Administrator grants everything
  if (combined & PERMISSIONS.ADMINISTRATOR) return true;

  // Channel overrides: deny first, then allow
  if (channel && overrides.length > 0) {
    let denyBits = 0n;
    let allowBits = 0n;
    for (const ov of overrides) {
      denyBits |= BigInt(ov.deny || 0);
      allowBits |= BigInt(ov.allow || 0);
    }
    if (denyBits & permission) return false;
    if (allowBits & permission) return true;
  }

  // Check the combined role permissions
  return !!(combined & permission);
}

// Helper: get the BigInt permission value by name
export function perm(name) {
  return PERMISSIONS[name] || 0n;
}