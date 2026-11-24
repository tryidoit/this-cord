#!/usr/bin/env bash
# One-shot installer for a fresh Ubuntu 22.04/24.04 VM (Oracle Cloud Always Free, ARM or x86).
# Usage (from the unzipped project folder):   sudo bash deploy/oracle/setup-oracle.sh
# Optional:  DOMAIN=chat.example.com sudo -E bash deploy/oracle/setup-oracle.sh
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo"; exit 1; }
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
APP=/opt/thiscord; DATA=/var/lib/thiscord

echo "== packages =="
apt-get update -y
apt-get install -y curl ca-certificates gnupg rsync debian-keyring debian-archive-keyring apt-transport-https iptables-persistent cron
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "== app =="
id thiscord >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin thiscord
mkdir -p "$APP" "$DATA"
rsync -a --delete --exclude node_modules --exclude dist --exclude data --exclude .git "$SRC"/ "$APP"/
cd "$APP"
npm ci --no-audit --no-fund --legacy-peer-deps
npm run build
chown -R thiscord:thiscord "$APP" "$DATA"

echo "== address =="
if [ -z "${DOMAIN:-}" ]; then
  IP="$(curl -4 -fsS https://ifconfig.me || curl -4 -fsS https://api.ipify.org)"
  DOMAIN="${IP//./-}.sslip.io"   # free hostname that points at your IP; Caddy gets a real HTTPS certificate for it
fi
echo "Site will be: https://$DOMAIN"

cat > /etc/thiscord.env <<ENV
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATA_DIR=$DATA
APP_ORIGIN=https://$DOMAIN
TRUST_PROXY=true
ENV
chmod 600 /etc/thiscord.env

cat > /etc/systemd/system/thiscord.service <<UNIT
[Unit]
Description=This-Cord
After=network.target
[Service]
User=thiscord
WorkingDirectory=$APP
EnvironmentFile=/etc/thiscord.env
ExecStart=/usr/bin/node --no-warnings server/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA
[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000 {
		flush_interval -1
	}
}
CADDY

echo "== firewall (Ubuntu images on Oracle ship with REJECT rules) =="
iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
netfilter-persistent save >/dev/null

echo "== daily backup (03:17) =="
echo "17 3 * * * thiscord DATA_DIR=$DATA /usr/bin/node --no-warnings $APP/server/backup.mjs >> $DATA/backup.log 2>&1" > /etc/cron.d/thiscord-backup

systemctl daemon-reload
systemctl enable --now thiscord
systemctl restart caddy
sleep 2
curl -fsS http://127.0.0.1:3000/healthz && echo " <- app is running"
echo
echo "Done. Open https://$DOMAIN  (first account you register becomes the admin)."
echo "If it doesn't load: in the Oracle console add Ingress rules for TCP 80 and 443 (see deploy/oracle/ORACLE.md)."
