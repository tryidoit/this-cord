# Free hosting on Oracle Cloud "Always Free" (step by step)

Why this one: it is the only free option that gives you a server that **stays on** and a **disk that keeps your data**
(Render/Koyeb-style free tiers sleep and wipe local files, which would delete every account). You need a credit/debit
card for identity verification; Always Free resources are not charged.

1. Sign up at cloud.oracle.com (pick a home region and keep it; you can't change it later).
2. **Compute → Instances → Create instance**. Image: *Ubuntu 24.04*. Shape: *Ampere A1 Flex*, 1 OCPU / 6 GB RAM is plenty
   (the free pool is "up to 4 OCPU / 24 GB"). If it says "Out of capacity", retry later or try the other free shape
   (*VM.Standard.E2.1.Micro*, 1 GB RAM — enough for a small group). Download the SSH key it offers.
3. **Networking**: click the instance's subnet → *Default security list* → **Add ingress rules**: source `0.0.0.0/0`,
   TCP, destination ports `80` and `443` (two rules).
4. Upload the project and run the installer:
   ```bash
   scp -i ssh-key.key this-cord.zip ubuntu@<PUBLIC_IP>:~
   ssh -i ssh-key.key ubuntu@<PUBLIC_IP>
   sudo apt-get install -y unzip && unzip this-cord.zip -d thiscord && cd thiscord
   sudo bash deploy/oracle/setup-oracle.sh
   ```
   It installs Node 22 + Caddy, builds the app, starts it as a service, gets an HTTPS certificate and prints your URL
   (`https://<ip-with-dashes>.sslip.io` — a free hostname that points at your IP; no domain purchase needed).
5. Open the URL and **register your own account first** — it becomes the admin.

## Keeping it healthy
- Logs: `sudo journalctl -u thiscord -f`    Restart: `sudo systemctl restart thiscord`
- Backups: automatic daily to `/var/lib/thiscord/backups` (newest 14 kept). Copy one off the server now and then:
  `scp -i key ubuntu@IP:/var/lib/thiscord/backups/*.db .`
- Update the app: upload the new zip, unzip, run `sudo bash deploy/oracle/setup-oracle.sh` again (data is kept).
- Oracle can reclaim Always Free VMs that sit nearly idle for a long time. A busy chat app normally avoids this; if you
  get a warning email, log in and use the VM, or keep something running on it.
- Password-reset emails: set `RESET_WEBHOOK_URL` in `/etc/thiscord.env` to your own mail relay, otherwise ask an admin
  or read the link from `journalctl`.
