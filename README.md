# This-Cord

Discord-style chat app: React + Vite front end, Node (Express + built-in SQLite) back end. No third-party backend.

## Run it
Needs Node 22.13+.

```bash
npm install
npm run build
npm start            # http://localhost:3000  (serves the built app + API)
```

Development: `npm run server` in one terminal, `npm run dev` in another (Vite proxies `/api`).

Tests (boots a throwaway server and attacks it): `npm test`

## Configuration (environment variables)
| Variable | Purpose |
|---|---|
| `PORT` | default 3000 |
| `DATA_DIR` | where `thiscord.db` and the session key live (default `./data`). **Back this up.** |
| `SESSION_SECRET` | optional; otherwise generated into `DATA_DIR/session.key` |
| `APP_ORIGIN` | your public URL(s), comma separated (used for reset links and the CSRF origin check) |
| `TRUST_PROXY` | set to `true` when behind nginx/Caddy/Cloudflare so rate limits see real IPs |
| `COOKIE_SECURE` | defaults to `true` in production; set `false` only for plain-HTTP testing |
| `RESET_WEBHOOK_URL` | optional: server POSTs `{email, link}` here so you can send password-reset mail. Without it the link is printed to the server log |

**The first account that registers becomes the admin.** Register yours before sharing the URL.
Serve over HTTPS in production (a reverse proxy is fine).

## Security model (what the server enforces)
- Sessions are signed, HttpOnly, SameSite=Lax cookies; passwords use scrypt; login/register/reset are rate-limited.
- Every write needs a custom header + same-origin `Origin` (CSRF).
- Per-entity read/write rules live in `server/schema/*.jsonc` (`rls`) and are enforced for every request, including live updates.
- Players cannot edit `is_admin`, `moderator`, `vip`, bans, cheat codes, or raise their own coin balance. Coins are earned only through `/api/economy/*` (daily, 5‑minute reward, game wins, gifts, quests) with cooldowns and once-only claims. Spending avatars / Plus / handle changes must be paid for in the same update.
- Message author names, DM sender ids, and `is_system` are set by the server; muted/banned users can't post; message rate limit.
- Server join/leave (invite codes, paid servers) is done by the server.
- Device bans use a server-issued HttpOnly cookie.
- Strict CSP and security headers via helmet.

## Free hosting
- **No card / no phone:** `deploy/alwaysdata/ALWAYSDATA.md` (alwaysdata free plan; build the upload bundle with `bash deploy/alwaysdata/build-alwaysdata.sh`).
- **Always-on VM (needs a card for verification):** `deploy/oracle/ORACLE.md`.
- **Vercel / Cloudflare (front end only, proxy to a backend):** `deploy/vercel/VERCEL.md`, `deploy/cloudflare/CLOUDFLARE.md`. Overview: `deploy/README.md`.
Sleeping free tiers (Render, etc.) can't be used as-is: they wipe the database every time they sleep.

## Anti-evasion for device bans
Each signed-in user is linked to: a server cookie, a random id kept in localStorage **and** IndexedDB, a browser
fingerprint and their network (/24). A ban matches on the cookie or the stored id (clearing cookies is not enough),
and when it matches it also adds any new id the visitor is presenting. Fingerprint + network also stops *new accounts*
from a banned browser on the same network (never used to block logins, so shared school networks stay safe).
Still beatable by wiping all site data **and** changing browser or network (e.g. a VPN); no web app can fully prevent that.

## Cheating limits
Quest progress is counted by the server (messages, wins, friends, voice joins, coins earned). Game wins require a
server-issued game session, a minimum play time, and pay once per start (max 40/hour). A script that waits and
replays real requests can still farm ~40 wins/hour; the reward is small and capped. Games run in the browser, so
true cheat-proofing would need the games themselves to run on the server.

## Known limits
- No email verification or Google sign-in (they were Base44 features); password reset needs `RESET_WEBHOOK_URL` or the server log.
