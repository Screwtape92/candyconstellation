# Deploying to a Raspberry Pi (Cloudflare Tunnel)

Step-by-step runbook for the self-hosted path described in
`docs/architecture.md` ("Self-hosted deployment (home box + tunnel)") and
`docs/planning-log.md` ("Second deployment path"). Written so an agent or
operator with **zero prior context on this deployment** — e.g. freshly SSH'd
into the Pi with just this repo pulled — can follow it mechanically end to
end. If anything below conflicts with `docs/architecture.md`, that doc wins;
flag the conflict rather than silently picking one.

**Assumes:** the Pi already has SSH/GitHub access set up and this repo cloned
(or `git pull`ed to latest `main`), and a domain already added to the same
Cloudflare account that will run the tunnel (see "Domain" below if not).

## 0. Fill in these placeholders

Everything below uses two placeholders — replace them once, consistently:

- `<repo-dir>` — the absolute path this repo was cloned to on the Pi (e.g.
  `/home/pi/candyconstellation`).
- `<hostname>` — the public hostname this deploys to (e.g.
  `candy.example.com`). The domain (`example.com`) must already be an active
  zone in the Cloudflare account used in step 5.

## 1. Check the OS architecture

```
uname -m
```

`aarch64` → use the `arm64` package links below (current Raspberry Pi OS
Bookworm on a Pi 3/4/5 defaults to this). `armv7l` → use `armhf` instead
everywhere an architecture is named. `armv6l` (very old Pi Zero/1) — Node 22
and current `cloudflared` releases don't support this; stop and flag it
rather than improvising a workaround.

## 2. Install Node.js 22.5+

`node:sqlite` (the self-host server's storage layer, see
`docs/architecture.md`) needs Node 22.5+, and Raspberry Pi OS's own `apt`
repo Node is usually much older — don't `apt install nodejs` and assume it's
new enough. Use NodeSource:

```
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # confirm >= v22.5.0
```

## 3. Build

From `<repo-dir>`:

```
npm ci
npm run build          # frontend -> dist/
npm run build:server   # server -> server/dist/
```

**Verify before continuing** — don't skip this: run
`node server/dist/server/index.js` in the foreground, confirm it logs
`listening on :8787`, hit `curl -s http://localhost:8787/api/getLeaderboard`
from another shell (expect `{"entries":[]}` on first run), then `Ctrl-C` it.
If this doesn't work, the systemd/tunnel steps below won't either — fix it
here first.

## 4. Run the app server as a systemd service

Find the Node binary path first (`which node` — usually `/usr/bin/node` with
the NodeSource install above). Create
`/etc/systemd/system/candy-constellation.service`:

```ini
[Unit]
Description=Candy Constellation self-host server
After=network.target

[Service]
Type=simple
WorkingDirectory=<repo-dir>
ExecStart=/usr/bin/node <repo-dir>/server/dist/server/index.js
Environment=PORT=8787
Restart=on-failure
RestartSec=5
User=pi

[Install]
WantedBy=multi-user.target
```

(Adjust `User=` if the Pi's login user isn't `pi`.)

```
sudo systemctl daemon-reload
sudo systemctl enable --now candy-constellation
sudo systemctl status candy-constellation   # confirm "active (running)"
curl -s http://localhost:8787/api/getLeaderboard
```

This service now survives reboots and the SSH session ending. **Redeploy
procedure** for any future code change: `git pull`, re-run step 3's two
build commands, then `sudo systemctl restart candy-constellation` — no
service file changes needed.

## 5. Domain (skip if already on Cloudflare)

The tunnel step below needs the target domain's DNS already managed by
Cloudflare. If it isn't yet: either buy it directly through Cloudflare
Registrar (lands in the account with Cloudflare DNS active immediately), or
add an existing domain to Cloudflare (Websites → Add a site) and update its
nameservers at whatever registrar currently holds it. Either way, confirm
the zone shows "Active" in the Cloudflare dashboard before continuing.

## 6. Install cloudflared

```
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb
cloudflared --version
```

(Use `cloudflared-linux-armhf.deb` on a 32-bit OS per step 1.)

## 7. Authenticate and create the tunnel

```
cloudflared tunnel login
```

This prints a URL — open it in a browser on **any** device (doesn't have to
be the Pi itself, since it's just completing OAuth against your Cloudflare
account) and pick the zone from step 5. It writes a cert to
`~/.cloudflared/cert.pem` on the Pi.

```
cloudflared tunnel create candy-constellation
```

Prints a tunnel UUID and writes credentials to
`~/.cloudflared/<UUID>.json` — note the UUID, it's needed below.

```
cloudflared tunnel route dns candy-constellation <hostname>
```

This creates the CNAME automatically — no manual DNS dashboard step.

## 8. Configure ingress

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: candy-constellation
credentials-file: /home/pi/.cloudflared/<UUID>.json
ingress:
  - hostname: <hostname>
    service: http://localhost:8787
  - service: http_status:404
```

(Replace `<UUID>` with the value from step 7; adjust the credentials path if
the login user isn't `pi`.)

## 9. Install the tunnel as a systemd service

```
sudo cloudflared --config /home/pi/.cloudflared/config.yml service install
sudo systemctl start cloudflared
sudo systemctl status cloudflared   # confirm "active (running)"
```

**Known gotcha (pass `--config` explicitly, as above):** running this with
`sudo` makes `$HOME` resolve to `/root`, so cloudflared looks for
`/root/.cloudflared/config.yml` by default and won't find the one actually
written to `/home/pi/.cloudflared/` — passing `--config` with the full path
sidesteps this entirely rather than needing to debug a "config not found"
failure.

## 10. Verify end to end

From a machine that is **not** the Pi and **not** on the same LAN (e.g. your
phone on mobile data) — confirms the tunnel, not just localhost:

```
curl -s https://<hostname>/api/getLeaderboard
```

Expect `{"entries":[...]}`. Then open `https://<hostname>/` in a browser and
play a round through to confirm the full flow (score submission,
leaderboard) works over the real public path, not just localhost.

## Troubleshooting

- **`node:sqlite` import errors** — re-check step 1/2; this needs Node
  22.5+, not just "Node 22".
- **`candy-constellation` service won't start** — `sudo journalctl -u
  candy-constellation -n 50` for the actual error; almost always either the
  Node path in `ExecStart` being wrong (re-check `which node`) or `dist/`/
  `server/dist/` missing because step 3's builds weren't run on this exact
  checkout.
- **`cloudflared` service won't start / "config not found"** — the sudo/
  `$HOME` gotcha in step 9; re-run `service install` with the explicit
  `--config` path.
- **`curl` to `<hostname>` fails/times out but localhost:8787 works** — check
  `cloudflared tunnel info candy-constellation` and the zone's DNS record in
  the Cloudflare dashboard (should be a CNAME to `<UUID>.cfargotunnel.com`);
  also confirm the zone is "Active", not still pending nameserver
  propagation from step 5.
