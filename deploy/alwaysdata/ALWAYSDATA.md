# Free hosting on alwaysdata (no credit card)

alwaysdata's free plan runs real Node.js processes (Node 22 and 24 are available), keeps files on a normal disk, and
gives you `https://<account>.alwaysdata.net`. Limits to expect: about 256 MB RAM and a quarter of a CPU, and a small
disk (sources disagree between 100 MB and 1 GB — the app + database for a classroom-sized group fits easily).
Plan is for personal / non-profit use.

You need: an email address. (I couldn't confirm whether sign-up asks for a phone number; I found no card requirement.)

## Steps
1. Create an account at alwaysdata.com and choose the free plan. Your account name is used below as `<account>`.
2. **Remote access → SSH**: enable SSH and set a password (or add a key).
3. Upload `this-cord-alwaysdata.zip` (SFTP with FileZilla/WinSCP, host `ssh-<account>.alwaysdata.net`), then in an SSH session:
   ```bash
   mkdir -p ~/thiscord ~/thiscord-data && cd ~/thiscord && unzip -o ../this-cord-alwaysdata.zip
   ```
   (Everything, including its few dependencies, is inside the zip — no `npm install` needed.)
4. **Web → Sites → Add a site**
   - Addresses: `<account>.alwaysdata.net`
   - Type: **Node.js**
   - Command: `node --no-warnings server/index.js`
   - Working directory: `thiscord`
   - Node.js version: **22.x or 24.x** (22.13+ is required)
   - Environment variables (one per line):
     ```
     NODE_ENV=production
     DATA_DIR=/home/<account>/thiscord-data
     APP_ORIGIN=https://<account>.alwaysdata.net
     TRUST_PROXY=true
     ```
   - Set **Idle time** to `0` if the field is available, so the process is never stopped between visits.
5. Save, then open `https://<account>.alwaysdata.net/healthz` — it should say `ok`. Then open the site and
   **register your own account first** (it becomes the admin).

## Check it really works
- Log in with two browsers and send a message from one: the other should show it within a couple of seconds
  (that's the live-update stream; some proxies buffer it — tell me if messages only appear after a refresh).
- Make a post, restart the site from the alwaysdata panel, reload: your account and messages should still be there.

## Backups / updates
- The server writes a database backup shortly after start and every 12 hours to `~/thiscord-data/backups` (newest 7 kept).
  Download one now and then over SFTP.
- To update: upload the new zip, `unzip -o` it over `~/thiscord`, restart the site (your data lives in `thiscord-data`, untouched).
