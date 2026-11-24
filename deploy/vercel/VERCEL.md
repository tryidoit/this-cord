# Vercel (front end only)

Vercel can't run this server (it needs a long-lived Node process, a persistent SQLite file and a live `/api/stream`
connection). So Vercel serves the **built React app** and proxies `/api` to a backend you host elsewhere
(Oracle VM or alwaysdata — see `../oracle` and `../alwaysdata`). The browser only ever talks to the Vercel domain, so
cookies and the CSRF origin check keep working.

1. Deploy the backend first and note its URL.
2. Copy `deploy/vercel/vercel.json` to the **repo root** and replace `YOUR-BACKEND-HOST.example.com`.
3. Import the repo in Vercel (framework preset: Vite). Deploy.
4. On the backend set `APP_ORIGIN=https://<your-project>.vercel.app` and `TRUST_PROXY=true`.

Caveat: Vercel's proxy may cut long-lived `/api/stream` (live updates) connections after a while; the client
reconnects, but if it feels laggy use the Cloudflare option instead.
