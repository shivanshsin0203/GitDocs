# GitDocs — Launch To-Do

Target: live deployment + X post + Discord outreach by **2026-06-07** (7 days from 2026-05-31).

---

## Day 1 — Pre-launch assets + arch refresh

- [ ] Landing page copy pass — sharpen headline + CTA.
- [ ] OG meta tags + favicon for X share preview.
- [ ] 30-min re-read of `docs/architecture.md` (especially §6 follow-ups). Mark which apply to launch.
- [ ] Screenshots + demo GIF deferred to Day 6 (capture against the polished, deployed app).

## Day 2 — Security pass, part 1 (critical paths + deploy blockers)

- [ ] Add `zod`; schemas for `POST /api/generate` and `POST /api/projects/:id/pr`.
- [ ] Rate limit `POST /api/generate` (expensive route — tight per-user limit).
- [ ] CORS origin → `process.env.FRONTEND_URL` (arch §6.10, hardcoded `localhost:5173` today — launch blocker).
- [ ] Consolidate `apiKey` → `DEEPSEEK_API_KEY` (arch §6.11).
- [ ] JWT cookie flags audited for prod: `Secure`, `HttpOnly`, `SameSite=Lax`.

## Day 3 — Security pass, part 2 (breadth)

- [ ] zod schemas across remaining write routes (`/:id/retry`, `DELETE /:id`, auth callback body, etc).
- [ ] IDOR audit on every `:id` route — confirm ownership check in handler, not just middleware.
- [ ] OAuth `state` param verification on `/auth/callback`.
- [ ] Magic-byte sniff spot-check (arch §4.13 regex correctness) + base64-decode-bomb cap.
- [ ] Decide: keep 35mb body limit global, or scope it to `/:id/pr` only (arch §4.18).
- [ ] GitHub token in BullMQ payload — move to worker-time fetch from PG (arch §6.9). *Defer if tight.*
- [ ] Duplicate-import handling: `(userId, repoOwner, repoName)` unique constraint (arch §6.12).

## Day 4 — Feature + polish

- [ ] Refresh button on repo cards (re-fetch PR status on demand, bypass 60s cache).
- [ ] Polish checklist — write the list before working it; stop when checklist clears, not when day ends:
  - [ ] Empty state for "no projects yet"
  - [ ] Failed-card color/copy softening
  - [ ] Card hover alignment on tablet
  - [ ] Landing CTA copy + button states
  - [ ] Toast text consistency

## Day 5 — Deploy + observability

- [ ] Pick host (Render / Railway / Fly — needs persistent worker, not Vercel/Netlify).
- [ ] Production GitHub OAuth app (separate from dev) + callback URL.
- [ ] Domain + DNS + HTTPS cert.
- [ ] Production env vars: new `JWT_SECRET`, prod `DATABASE_URL`, prod `REDIS_URL`, `DEEPSEEK_API_KEY`, `GITHUB_CLIENT_ID/SECRET/CALLBACK_URL`, `FRONTEND_URL`.
- [ ] Sentry (or equivalent) wired on server + client.
- [ ] DeepSeek hard daily spend cap set on the DeepSeek dashboard.
- [ ] Full smoke test on live URL (architecture.md §7 — both generation flow and editor+PR flow).

## Day 6 — Buffer, prod fixes, README, launch assets

- [ ] Fix bugs surfaced by day-5 prod smoke.
- [ ] **Root `README.md`** — written against the final, deployed app. Headline, demo GIF, 3-bullet "how it works", live-link badge, local-dev pointer to `docs/architecture.md`. (The product literally generates READMEs; the repo's own README has to land.)
- [ ] Demo GIF (OBS / ScreenToGif) of the full flow on the live URL: pick repo → analyzing → generating → editor → PR.
- [ ] 3 product screenshots from the deployed app: dashboard, editor split view, PR badge.
- [ ] Draft X thread copy (headline + screenshots + thread structure).
- [ ] Pick 3–4 Discord servers; lurk #showcase etiquette; draft per-server intro.
- [ ] Privacy policy / Terms one-pager (helps reviewer trust + needed for OAuth app verification).

## Day 7 — Launch

- [ ] Post on X (morning, your timezone's peak).
- [ ] Discord rollout staggered across the day (don't blast all at once).
- [ ] On-call for incoming bug reports; monitor Sentry + DeepSeek spend.

---

## Hard questions — answer before Day 1

1. What does "ready to launch" mean concretely? (Suggested bar: arch §7 smoke tests pass on live URL.)
2. Rollback plan if X post goes well but app falls over? Do you know Upstash + Neon free-tier limits?
3. Who is the X post for — devs generating READMEs for their own repos, or general devtools audience? Copy + screenshots depend on the answer.
4. DeepSeek daily spend cap — what's the number?
5. Which 3–4 Discord servers, specifically?

---

## Out of scope for this launch

Deferred from arch §6 unless trivial:

- Webhook-driven PR status (still polling, 60s cache fine for launch traffic)
- Client code-splitting (1.5MB bundle is fine for launch)
- IndexedDB for image drafts
- SSE listener registry refactor
- Cost telemetry per user (the dashboard-level cap is enough for launch)
- Cancel in-flight job
- Filter cards by language/status/PR
- Re-edit after PR submission (still strict-locked)
