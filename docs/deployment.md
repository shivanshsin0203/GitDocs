# GitDocs — Deployment Guide

End-to-end deploy of GitDocs onto **AWS EC2 Free Tier (t3.micro / t2.micro)** backend +
**Cloudflare Pages** frontend, with **Cloudflare** as the DNS + edge.

The free tier is **12 months from account creation**, so the 4-month initial run is fully covered.

---

## 1. Architecture you're deploying

```
            ┌────────────────────────────────────────────────────────────┐
            │              Cloudflare (free plan)                         │
            │   DNS · DDoS · TLS termination · CDN · WAF                  │
            └─────────────┬───────────────────────────────┬───────────────┘
                          │                               │
                          ▼                               ▼
                 ┌─────────────────┐               ┌─────────────────┐
                 │ Cloudflare Pages│               │  AWS EC2 t3.micro│
                 │  gitdocs.dev    │               │  api.gitdocs.dev │
                 │  React build    │               │ ┌──────────────┐ │
                 └─────────────────┘               │ │    Caddy     │ │
                                                   │ │   :80, :443  │ │
                                                   │ └──────┬───────┘ │
                                                   │  reverse_proxy   │
                                                   │ ┌──────▼───────┐ │
                                                   │ │  Node :3000  │ │
                                                   │ │  API+Worker  │ │
                                                   │ └──────┬───────┘ │
                                                   └────────┼─────────┘
                                                            │
                          ┌─────────────────────────────────┼─────────────────────────────┐
                          │                                 │                             │
                          ▼                                 ▼                             ▼
                ┌─────────────────┐              ┌─────────────────┐           ┌─────────────────┐
                │  Upstash Redis  │              │  Neon Postgres  │           │  DeepSeek API   │
                │ (BullMQ + RL)   │              │                 │           │                 │
                └─────────────────┘              └─────────────────┘           └─────────────────┘
```

All managed services (Cloudflare, Upstash, Neon) stay on their free tiers for this scale.

---

## 2. Prerequisites checklist

Before you start the deploy, have these ready:

- [ ] AWS account (use a payment method that works — free tier still requires a card for verification)
- [ ] Domain bought (e.g., `gitdocs.dev`) — Hostinger or any registrar
- [ ] Cloudflare account (free plan)
- [ ] GitHub OAuth app credentials already exist for local dev — you'll edit its callback URL
- [ ] Code is in a GitHub repo (private is fine; Pages can pull from it)
- [ ] Your existing `.env` values: `DATABASE_URL`, `REDIS_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `apiKey` (DeepSeek)

---

## 3. Cost reality

| Item | Cost (first 12 months) | Cost (month 13+) |
|---|---|---|
| EC2 t3.micro (1 vCPU, 1GB) | $0 (750 hr/mo free) | ~$8/mo on-demand or ~$5/mo with 1-yr reserved |
| EBS 30GB gp3 | $0 (free tier) | ~$2.40/mo |
| Data transfer out (100GB/mo) | $0 (free tier) | $0.09/GB after |
| Cloudflare DNS + Pages + proxy + Origin CA | $0 forever | $0 forever |
| Domain | ~$10-15/yr | same |
| Upstash Redis | $0 (10k cmds/day free) | $0 unless usage grows |
| Neon Postgres | $0 (3GB free) | $0 unless usage grows |
| DeepSeek/LLM API | variable, per-call | variable |

**4-month run: ~$5 (just the domain prorated). 12-month run: ~$15. Set a calendar reminder for free-tier expiry day to migrate or upgrade.**

---

## 4. RAM warning for t3.micro (1GB)

The free tier instance has only **1GB RAM**. Your Node process + BullMQ worker + Caddy + system services need monitoring. Big LLM JSON payloads during repo analysis can spike memory.

**Mitigate with swap** (see step 6.3). Caddy + Node + worker idle around 400-600MB; with 2GB swap you have headroom.

If you regularly OOM under real usage, the path is:
1. Move worker to its own t3.micro (still free-tier eligible if combined hours stay under 750/mo)
2. OR upgrade to t3.small (2GB) — leaves free tier, ~$15/mo

---

## 5. AWS EC2 setup

### 5.1 Launch the instance

1. AWS Console → **EC2** → **Launch Instance**
2. **Name**: `gitdocs-api`
3. **AMI**: Ubuntu Server 24.04 LTS (HVM), SSD Volume Type → free-tier eligible
4. **Instance type**: `t3.micro` (preferred) or `t2.micro` (also free-tier)
5. **Key pair**: create new → name it `gitdocs-key` → download `.pem` file → **save somewhere safe; you can't re-download it**
6. **Network settings**: create new security group
   - Allow SSH (port 22) from **My IP** (NOT 0.0.0.0/0)
   - Allow HTTP (port 80) from **Anywhere** (0.0.0.0/0)
   - Allow HTTPS (port 443) from **Anywhere** (0.0.0.0/0)
7. **Storage**: 30GB gp3 (max free-tier amount)
8. **Region**: **`ap-south-1` (Mumbai)** if your users are in India, else `us-east-1` (Virginia)
9. **Launch**

Note the instance's **Public IPv4 address** — you'll need it shortly.

### 5.2 Elastic IP (recommended)

Without an Elastic IP, your VM's public IP changes when you stop/start it — which breaks DNS. Allocate one:

1. EC2 Console → **Elastic IPs** → **Allocate Elastic IP address** → Allocate
2. Select the new EIP → **Actions → Associate Elastic IP** → choose your instance
3. The EIP is **free as long as it's associated with a running instance**. Detached EIPs cost ~$3.50/mo.

Use this Elastic IP for the DNS record in step 7.

### 5.3 SSH in

```bash
chmod 400 gitdocs-key.pem
ssh -i gitdocs-key.pem ubuntu@<your-elastic-ip>
```

(On Windows PowerShell: `icacls gitdocs-key.pem /inheritance:r /grant:r "$($env:USERNAME):R"` to restrict permissions.)

---

## 6. Server provisioning

Run these as the `ubuntu` user (you're already SSH'd in).

### 6.1 System update + basics

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ufw git build-essential
```

### 6.2 Firewall (UFW)

AWS Security Groups already handle network filtering, but UFW is defense-in-depth:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 6.3 Swap file (2GB — important on 1GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
free -h     # verify swap is active
```

### 6.4 Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # should be v22.x
npm --version
```

### 6.5 pm2 (process manager)

Keeps your Node app alive across crashes and reboots.

```bash
sudo npm install -g pm2
```

### 6.6 Caddy (reverse proxy + TLS)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
sudo systemctl status caddy    # should be active (running) on port 80
```

---

## 7. Domain + Cloudflare DNS setup

### 7.1 Move DNS to Cloudflare (one-time)

1. Cloudflare → **Add a site** → enter your domain → Free plan
2. Cloudflare scans existing DNS, gives you 2 nameservers (e.g. `adam.ns.cloudflare.com`, `eva.ns.cloudflare.com`)
3. At your registrar (Hostinger): Domain → Nameservers → **Custom** → paste both Cloudflare nameservers
4. Wait until Cloudflare dashboard shows your domain as **Active** (usually <30 min)

### 7.2 Add DNS records

In Cloudflare → your domain → **DNS** → **Records**:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `api` | `<your Elastic IP>` | 🟠 Proxied |

The frontend `gitdocs.dev` and `www` records will be added automatically by Pages in step 10.

### 7.3 SSL/TLS settings

Cloudflare → your domain → **SSL/TLS** → **Overview** → set to **Full (Strict)**.

Anything less is either insecure (Flexible) or broken (Off).

### 7.4 Create the Origin Certificate

Cloudflare → your domain → **SSL/TLS** → **Origin Server** → **Create Certificate**:

1. Defaults are fine (RSA, 15 years validity, covers `*.gitdocs.dev` and `gitdocs.dev`)
2. **Save both fields immediately** — you cannot retrieve them later:
   - **Origin Certificate** → `origin.pem`
   - **Private Key** → `origin.key`

Upload them to the VM (from your local machine):

```bash
scp -i gitdocs-key.pem origin.pem origin.key ubuntu@<elastic-ip>:/tmp/
```

On the VM:

```bash
sudo mkdir -p /etc/cf
sudo mv /tmp/origin.pem /tmp/origin.key /etc/cf/
sudo chmod 600 /etc/cf/origin.key
sudo chmod 644 /etc/cf/origin.pem
sudo chown root:root /etc/cf/*
```

---

## 8. Caddy config

Edit `/etc/caddy/Caddyfile` and replace contents with:

```caddy
api.gitdocs.dev {
    tls /etc/cf/origin.pem /etc/cf/origin.key

    # Pass through real client IP that Cloudflare set; Caddy adds X-Forwarded-For
    # automatically. trust_proxy is for parsing Cloudflare's CF-Connecting-IP if needed.
    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }

    # Buffering off so SSE streams flush in real time
    encode gzip
    request_body {
        max_size 35MB
    }
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
sudo journalctl -u caddy -f    # ctrl+c to exit — watch for errors
```

---

## 9. Deploy the backend code

### 9.1 Clone + install

```bash
cd ~
git clone https://github.com/<your-username>/gitdocs.git
cd gitdocs/server
npm ci
npm run build    # compiles TypeScript to dist/
```

If `npm run build` doesn't exist as a separate command, check `package.json` — the current `start` script does `tsc -b && node dist/index.js`. You can run that to verify the build works.

### 9.2 Production .env

Create `/home/ubuntu/gitdocs/server/.env`:

```bash
NODE_ENV=production
PORT=3000

# Frontend URL — used for CORS + OAuth redirects
FRONTEND_URL=https://gitdocs.dev

# Postgres (Neon)
DATABASE_URL=postgresql://...your existing Neon URL...

# Redis (Upstash)
REDIS_URL=rediss://...your existing Upstash URL...

# GitHub OAuth — update GITHUB_CALLBACK_URL to production
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://api.gitdocs.dev/api/auth/callback

# JWT
JWT_SECRET=...generate a fresh strong secret for prod (don't reuse dev)...

# DeepSeek
apiKey=sk-...
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

`chmod 600 .env` so only the owner can read it.

### 9.3 Required code changes (one-time)

Three small edits before the production deploy works correctly.

**A. Trust the proxy (rate limiter fix)** — `server/src/index.ts`

Add this immediately after `const app = express();`:

```ts
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

Without this, the rate limiter sees every request as coming from Caddy's `127.0.0.1` and either blocks everyone or no one. **Critical.**

**B. CORS origin from env** — `server/src/index.ts`

Change:
```ts
app.use(cors({origin:"http://localhost:5173",credentials:true}));
```
to:
```ts
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
```

**C. Client API base URL via Vite env var** — `client/.env.production`

Create the file:
```
VITE_API_BASE=https://api.gitdocs.dev
```

Then in client code, replace every hardcoded `http://localhost:3000` with:
```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
```

Affected files: `Dashboard.tsx`, `ProjectEditor.tsx`, `ListRepos.tsx`, `LandingPage.tsx`, `Navbar.tsx`, `hooks/useUser.tsx`, `hooks/useJobStream.tsx`. (One constant in each — cheap edit.)

`.env.production` is automatically used by Vite when you `npm run build`. The dev `.env` (or fallback to localhost) keeps local development unbroken.

Commit and push these changes before deploying.

### 9.4 GitHub OAuth app update

GitHub → your profile → **Settings** → **Developer settings** → **OAuth Apps** → your GitDocs app:

- **Homepage URL**: `https://gitdocs.dev`
- **Authorization callback URL**: `https://api.gitdocs.dev/api/auth/callback`
- Save

The `GITHUB_CALLBACK_URL` in your production `.env` must match exactly.

### 9.5 Start the app with pm2

```bash
cd ~/gitdocs/server
pm2 start dist/index.js --name gitdocs
pm2 startup systemd       # follow the printed instruction (one sudo command)
pm2 save                   # persist current process list across reboots
pm2 logs gitdocs           # ctrl+c to exit — watch for "Server is running on port 3000"
```

### 9.6 Verify the chain

From your local machine (or any browser):

```bash
curl -i https://api.gitdocs.dev/
# Expected: HTTP/2 200, JSON body {"status":"ok","timestamp":"..."}
```

If you see `Cloudflare 521/522/525`:
- 521: Caddy isn't running → `sudo systemctl status caddy`
- 522: firewall/SG blocking port 443 → check AWS Security Group and UFW
- 525: SSL handshake failed → check the origin cert paths in Caddyfile

---

## 10. Frontend — Cloudflare Pages

1. Cloudflare → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Authorize GitHub, select your repo
3. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `cd client && npm ci && npm run build`
   - **Build output directory**: `client/dist`
   - **Root directory**: leave blank (or set to `/`)
4. **Environment variables** → add:
   - `VITE_API_BASE` = `https://api.gitdocs.dev`
5. Save and deploy. First build takes 2-4 minutes.

### 10.1 Attach the custom domain

Pages project → **Custom domains** → **Set up a custom domain**:

1. Enter `gitdocs.dev` → activate → Cloudflare auto-creates the DNS record
2. Enter `www.gitdocs.dev` → activate (auto-redirects to root)

Wait ~1 minute. `https://gitdocs.dev` should now serve your React app.

---

## 11. End-to-end test

1. Visit `https://gitdocs.dev`
2. Click "Login with GitHub" → redirects to GitHub → auth → redirects back to `https://gitdocs.dev/dashboard`
3. Click "Add New" → list of your repos loads from `https://api.gitdocs.dev/api/dashboard/listrepos`
4. Import a small repo → SSE updates appear in real time → completes → project card shows in dashboard
5. Open project → edit README → submit PR → PR opens on GitHub

If any step fails, check `pm2 logs gitdocs` on the VM and the browser console.

---

## 12. Deploy workflow (future updates)

After the initial deploy, code changes ship like this:

**Frontend (Cloudflare Pages — automatic):**
```bash
git push origin main
# Pages detects the push, rebuilds, deploys in 2-3 min. No action needed.
```

**Backend (manual SSH):**
```bash
ssh -i gitdocs-key.pem ubuntu@<elastic-ip>
cd ~/gitdocs
git pull
cd server
npm ci
npm run build
pm2 reload gitdocs    # zero-downtime restart
pm2 logs gitdocs --lines 50    # verify no errors
```

For zero-friction backend deploys later, set up a GitHub Action that SSHs in and runs those commands on push to `main`.

---

## 13. Monitoring + ops

### 13.1 pm2 essentials

```bash
pm2 status                    # is it running?
pm2 logs gitdocs              # tail logs (ctrl+c to exit)
pm2 logs gitdocs --err        # errors only
pm2 monit                     # CPU + memory dashboard
pm2 restart gitdocs           # full restart
pm2 reload gitdocs            # graceful (preferred)
```

### 13.2 RAM watch (critical on t3.micro)

```bash
free -h                       # one-shot memory
htop                          # interactive (apt install htop first)
```

If `MemAvailable` regularly drops below 100MB or swap usage exceeds 1GB, you're heading for OOM. Time to upgrade or split the worker.

### 13.3 Disk

```bash
df -h     # 30GB free-tier disk; logs/build cache will grow over time
```

### 13.4 Caddy logs

```bash
sudo journalctl -u caddy -f
sudo journalctl -u caddy --since "10 minutes ago"
```

### 13.5 Free-tier usage alarm

**Set this on day 1** so you don't get surprise-billed:

AWS Console → **Billing** → **Budgets** → **Create budget** → **Zero spend budget** → email alert when any charge appears. This catches the day your free tier expires or you accidentally provision something paid.

---

## 14. Free-tier expiry plan (month 12)

When the 12-month free tier ends, the same instance starts billing at on-demand rates (~$8/mo). Options:

1. **Stay on AWS, accept ~$8/mo** — easiest, no migration
2. **Reserve the instance for 1 year** — drops to ~$5/mo (commits you for a year)
3. **Migrate to Hetzner/Hostinger/Oracle** — costs $0-5/mo but requires a few hours of work

Migration steps (high level): provision new VM → run sections 5.3-9.5 of this doc on the new host → swap the Cloudflare A record → decommission old EC2.

The DB (Neon) and Redis (Upstash) stay put — only the compute moves.

---

## 14.5. Scaling up: t3.small + multi-project on AWS credits

Use this section when the free tier feels too tight (you keep OOMing on
big repo analyses) **or** when you want to host more than just GitDocs on
the same VM. Assumes you have AWS Activate / hackathon / educator credits.

### Why t3.small isn't in the free tier

AWS Free Tier 750 hr/mo only covers `t2.micro` and `t3.micro` (1 GB RAM).
`t3.small` (2 GB RAM, 2 vCPU burstable) is **paid** at on-demand prices.
Your credits cover it; your free-hour allowance does not.

**Mumbai (`ap-south-1`) on-demand pricing:**

| Instance | RAM | vCPU | $/mo (730 hr) | Credit runway ($300) |
|---|---|---|---|---|
| t3.micro | 1 GB | 2 burst | $7.60 (after free tier) | ~39 months |
| **t3.small** | 2 GB | 2 burst | **~$16** | **~18 months** |
| t3.medium | 4 GB | 2 burst | ~$32 | ~9 months |

### Capacity table — how many GitDocs-style apps fit?

Per-instance footprint (Node + worker + Caddy site-block + headroom):

| Instance state | RAM used |
|---|---|
| Idle (no jobs) | ~250 MB |
| Active LLM analysis (large repo, JSON in flight) | ~550–800 MB |
| Plus shared system overhead | +200 MB |

**Concurrent instances on t3.small (2 GB + 2 GB swap):**

| # of GitDocs instances | Verdict |
|---|---|
| 1 | Comfortable, lots of headroom |
| 2 | Tight; works if both are low-traffic and jobs are staggered |
| 3 | Will OOM the moment two instances hit "generating" simultaneously |
| 4+ | OOM at idle |

**Sweet spot: 1 instance, aggressively 2.** If you want 3+, jump to
t3.medium ($32/mo) — better RAM utilization than two t3.smalls ($32/mo
combined) with shared burstable CPU credits.

### CPU caveat

t3.small is 2 vCPU **burstable** with baseline 40% per core. CPU credits
accumulate while idle, burn during LLM JSON parsing. Two instances both
analyzing concurrently will burn through credits in ~10 minutes, then
throttle to baseline → analysis stalls. Monitor `CPUCreditBalance` in
CloudWatch.

### Hidden bottleneck: shared external services

Even if RAM fits, each GitDocs instance needs:

| Service | Free tier ceiling | Multi-instance strategy |
|---|---|---|
| Neon Postgres | 3 GB, 1 project per account | Use one project with separate databases or schemas |
| Upstash Redis | 10k cmds/day per DB | Create one DB per instance OR share with key prefixes |
| GitHub OAuth app | 1 per app | Register a separate OAuth app per instance (different callback URLs) |

This setup overhead is real — debugging cross-contamination between
instances is painful. Worth doing only if the alternative VMs are more
expensive than the duplication effort.

### Multi-tenant Caddy config

When running multiple apps on one box, give each its own subdomain and
upstream port. Add to `/etc/caddy/Caddyfile`:

```caddy
api.gitdocs.dev {
    tls /etc/cf/origin.pem /etc/cf/origin.key
    reverse_proxy 127.0.0.1:3000
}

api.otherproject.dev {
    tls /etc/cf/origin.pem /etc/cf/origin.key
    reverse_proxy 127.0.0.1:3001
}
```

The Origin Cert from Cloudflare can cover wildcards (`*.yourdomain.dev`)
or you create a new Origin Cert per domain — both free.

In pm2, run each app on its own port via env var:

```bash
PORT=3000 pm2 start dist/index.js --name gitdocs
PORT=3001 pm2 start ../otherproject/dist/index.js --name otherproject
pm2 save
```

### Resizing an existing instance

You don't need to rebuild — AWS lets you change instance type on the
same VM:

1. `sudo shutdown -h now` on the VM (or stop from AWS console)
2. EC2 console → select instance → **Actions → Instance settings → Change instance type**
3. Pick `t3.small` → Apply
4. Start the instance again

Same Elastic IP, same disk, same everything — just more RAM and CPU.
The OS reboots in ~30 seconds. Caddy + pm2 auto-start (from earlier setup),
so the app comes back without you SSHing in.

### When to skip t3.small entirely

If your roadmap is "run 3+ small projects on one VM," go straight to
**t3.medium** (4 GB / 2 vCPU / ~$32/mo). Same per-month cost as two
t3.smalls but vastly more headroom — and one VM is less ops than two.

### Quick decision matrix

| Situation | Best instance |
|---|---|
| Just GitDocs, want $0 cost | t3.micro free tier (12 months) |
| Just GitDocs, free tier expired or OOM issues | t3.small via credits |
| GitDocs + 1 small side project | t3.small via credits |
| GitDocs + 2-3 side projects | t3.medium via credits |
| Heavy use, real users | Move worker to its own VM; consider beyond free tier entirely |

---

## 15. Troubleshooting cheatsheet

| Symptom | Likely cause | Fix |
|---|---|---|
| `curl https://api.gitdocs.dev` returns Cloudflare 521 | Caddy isn't running | `sudo systemctl restart caddy` |
| `curl` returns Cloudflare 522 | Port 443 not reachable | Check AWS SG inbound rules + `ufw status` |
| `curl` returns Cloudflare 525 | Origin cert mismatch | Re-check Caddyfile paths point to `/etc/cf/origin.pem` and `.key` |
| OAuth callback errors | GitHub callback URL or `GITHUB_CALLBACK_URL` env mismatch | Ensure both are exactly `https://api.gitdocs.dev/api/auth/callback` |
| Login works but dashboard empty | CORS blocking | Confirm `FRONTEND_URL` env = `https://gitdocs.dev` and CORS reads it |
| Rate limit triggers wrongly | `trust proxy` not set | Add the production block in `index.ts` |
| SSE disconnects every 100s | Cloudflare proxy timeout | Set Cloudflare → Network → "WebSockets" ON; SSE inherits |
| Frequent OOM / killed by pm2 | Out of RAM on t3.micro | Add swap (section 6.3) or upgrade |
| Pages deploy fails | Wrong build dir | Confirm output is `client/dist` not `dist` |
| 429 on every request | `app.set('trust proxy')` enabled in dev | Wrap it in `NODE_ENV === 'production'` check |

---

## 16. Security baseline

You're already covered by the rate limiter, but lock these down too:

- [x] SSH key auth only, password auth disabled (Ubuntu default)
- [ ] Disable root SSH: `sudo sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl restart ssh`
- [ ] Auto security updates: `sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure --priority=low unattended-upgrades`
- [ ] Fail2ban for SSH brute force protection: `sudo apt install -y fail2ban`
- [x] Cloudflare proxy hides origin IP
- [x] AWS Security Group restricts inbound to 22/80/443
- [ ] AWS billing alert (section 13.5)
- [x] App-level rate limits (already deployed)
- [x] HTTPS everywhere via Origin Cert
