# Deploy targets

| Folder | What it is | Runs the server? |
|---|---|---|
| `alwaysdata/` | Free Node hosting; build the upload bundle with `build-alwaysdata.sh` | Yes |
| `oracle/` | Always Free VM; `setup-oracle.sh` installs everything + HTTPS | Yes |
| `vercel/` | Static front end + `/api` rewrite to a backend | No (needs one of the above) |
| `cloudflare/` | Pages front end + proxy Function to a backend | No (needs one of the above) |

One codebase on `main`; only config differs per host. Replace every `YOUR-BACKEND-HOST.example.com` placeholder.
