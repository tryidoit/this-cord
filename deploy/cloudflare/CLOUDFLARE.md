# Cloudflare Pages (front end + API proxy)

Like Vercel, Cloudflare can't host the SQLite/Node server, so Pages serves the built app and a Pages Function proxies
`/api/*` to your backend (Oracle VM or alwaysdata). Streaming (`/api/stream`) passes through fine.

1. Deploy the backend first and note its URL.
2. Copy `deploy/cloudflare/functions/` to the **repo root** (`functions/api/[[path]].js`) and `wrangler.toml` too.
3. Cloudflare dashboard > Workers & Pages > Create > Pages > connect this repo.
   Build command `npm run build`, output directory `dist`.
4. Settings > Variables: `BACKEND_URL=https://<your backend>`.
5. On the backend set `APP_ORIGIN=https://<project>.pages.dev` and `TRUST_PROXY=true`.

Alternative (no proxy): run the backend on the Oracle VM and put it behind a Cloudflare Tunnel or proxied DNS record
instead of Caddy's own certificate.
