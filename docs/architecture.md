# GitDocs — Architecture Reference

A condensed working reference for the codebase. Built from the design + implementation sessions; not for the public README.

---

## 1. System overview

GitDocs takes a GitHub repo, analyses its structure with DeepSeek, generates a README, lets the user refine it in a live-preview editor with drag-and-drop screenshots, and submits the result as a Pull Request on the original repo.

```
┌─────────────┐    POST /api/generate   ┌─────────────┐
│   Browser   │───────────────────────► │  API + BullMQ│
│ (React,SSE) │◄──── GET /status/stream │  (1 Node     │
└─────────────┘                          │   process)   │
                                          └──┬───┬──┬───┘
                                             │   │  │
                  ┌────── enqueue ──────────┘   │  │
                  │                              │  │
                  ▼                              │  │
            ┌──────────┐   QueueEvents (sub)     │  │
            │ Upstash  │◄────────────────────────┘  │
            │  Redis   │                            │
            │ (TLS)    │── BRPOPLPUSH ──────────────┤
            └──────────┘                            │
                  ▲                                 │
                  │  HSET job:<id>                  ▼
                  │             ┌─────────────────────────┐
                  │             │  BullMQ Worker          │
                  │             │  concurrency=3          │
                  │             │  processor.ts           │
                  │             └──┬────┬────┬─────────┬──┘
                  │                │    │    │         │
                  │       ┌────────▼─┐  │  ┌─▼──────┐ │
                  │       │ GitHub   │  │  │DeepSeek│ │
                  │       │ tree+blob│  │  │stages 1│ │
                  │       │ API      │  │  │  + 2b  │ │
                  │       └──────────┘  │  └────────┘ │
                  │                     │             ▼
                  │                     │     ┌────────────┐
                  └─────────────────────┴────►│  Neon PG   │
                                              │  projects  │
                                              └────────────┘
```

After a project reaches `completed`, the editor flow takes over:

```
┌─────────────┐  GET /api/projects/:id   ┌────────────┐
│ ProjectEdit │◄─────────────────────────│  API       │
│ (split MD)  │                          │            │
│             │  POST /api/projects      │            │      Git Data API
│             │       /:id/pr            │            │   ┌───────────────┐
│             │─────────────────────────►│  github-pr │──►│ blobs → tree  │
│             │                          │  helper    │   │ → commit →    │
└─────────────┘                          └────────────┘   │ branch → PR   │
                                                          └───────┬───────┘
       Dashboard cards poll PR status (60s cache,                 │
       best-effort) ◄────────────────────────────────────────────┘
```

**Three storage layers, deliberately separate:**
- **Redis** — ephemeral state for jobs in flight (`queued`, `analyzing`, `generating`) + BullMQ's job queue internals + pub/sub events. TTL'd, lost on flush.
- **Postgres** — durable record of terminal states (`completed`, `failed`) plus PR metadata (`prUrl`, `prNumber`, `prStatus`, `prCheckedAt`). Never holds active jobs or image data.
- **GitHub** — the user's repo is the permanent home for the merged README and any image assets. GitDocs never stores images server-side; they pass through Node RAM only during PR submission.

**One Node process** holds both the Express API and the BullMQ Worker (decoupling into separate processes is a future-scale move, not needed yet).

---

## 2. Why each piece exists

| Piece | Role | Alternative considered |
|---|---|---|
| BullMQ | Job queue with built-in concurrency, retries, blocking pop | Postgres-as-queue (rejected: blocking pop poor) |
| Upstash Redis | Hosted Redis (TLS) for BullMQ + ephemeral state | Local Redis (rejected: extra infra) |
| Neon Postgres | Durable persistence of completed/failed projects | Sqlite (rejected: not multi-region ready) |
| Drizzle ORM | Typed schema + queries | Prisma (heavier, slower types) |
| SSE | One-way live progress, browser → dashboard | WebSockets (rejected: full-duplex unnecessary) |
| ioredis | Redis client compatible with BullMQ | @upstash/redis REST (rejected: no pub/sub, no blocking) |
| DeepSeek (OpenAI-compat) | LLM for analysis + README generation | OpenAI direct (cheaper to start with) |
| react-icons (`si` + `fa`) | Brand-accurate language logos | Hand-drawn SVGs (more maintenance) |
| react-toastify | Toast notifications | Custom toasts (no advantage) |
| react-router | Client-side routing | TanStack Router (later if needed) |
| @uiw/react-md-editor | Markdown editor (CodeMirror underneath) | Plain CodeMirror (more wiring), Ace (older, heavier) |
| react-markdown + remark-gfm | Custom preview pane with `urlTransform` for image blob URLs | @uiw's bundled preview (less control over image resolution) |
| nanoid | Short IDs for image filenames + PR branch suffixes | UUID (longer, harder to read in URLs/filenames) |

---

## 3. End-to-end data flow

For one job (Import button click → Ready card on dashboard):

```
1. Client    ListRepos.tsx → POST /api/generate { repoOwner, repoName }
2. API       /generate route:
              - look up users.githubToken from PG
              - jobId = randomUUID()
              - HSET job:<jobId> { userId, repoOwner, repoName, stage: "queued" }
              - SADD user:<userId>:active <jobId>
              - readmeQueue.add('readme', { jobId, userId, ..., githubToken })
              - respond 200 { jobId, stage: "queued" }
3. Client    handleImport → toast(Queued), navigate('/dashboard')
4. Dashboard JobStreamProvider's EventSource already open → receives snapshot/update events
5. Worker    new Worker pulls job atomically via BRPOPLPUSH
              processor.ts:
              - push('analyzing')              // HSET + job.updateProgress
              - getFileTree() → GitHub API
              - if files > 200: push('rejected'), cleanup, return  (no DB row)
              - analyzeWithDeepSeek() → JSON { displayName, language, shortDescription, ... }
              - push('generating', { displayName, language, shortDescription })
              - fetchAllFiles() → GitHub blobs (parallel)
              - generateReadme() → markdown
              - INSERT INTO projects (..., status='completed') RETURNING id
              - push('completed', { projectId })
              - SREM user:<userId>:active <jobId>; EXPIRE job:<id> 1h
6. BullMQ    publishes 'progress' / 'completed' events to bull:gitdocs-readme:events stream
7. API       QueueEvents subscriber fires .on('progress') handler
8. SSE       per-user filter (re-reads HGETALL to check userId), writes
              `event: update\ndata: {...}\n\n` to that user's TCP socket
9. Client    EventSource fires 'update' DOM event
              JobStreamProvider routes by stage:
              - completed → removes from active state, invalidates ['projects'], fires toast
              - failed → same as completed but failure toast
              - rejected → removes from active, fires toast (no PG refetch)
              - queued/analyzing/generating → upserts into active (newest first)
10. Dashboard  cards re-render with new state
```

End-to-end latency from worker stage transition → pixel change: ~50ms (mostly two Redis round-trips).

### 3a. Editor + PR submission flow

For one PR (Card click → Merged badge on dashboard):

```
1. Client    Dashboard card click → navigate /project/:id
2. API       GET /api/projects/:id — ownership-checked fetch
3. Client    ProjectEditor mounts:
              - hydrates markdown from readmeMarkdown
              - restores draft from localStorage if newer
              - opens @uiw/react-md-editor (preview="edit") on left
              - opens custom react-markdown preview on right with urlTransform
4. Client    User edits text + drags/pastes images:
              - acceptImageFiles validates MIME (png/jpg/gif/webp), size (5/25 MB)
              - generates path: readmeImages/img-{nanoid(8)}.{ext}
              - inserts ![alt](path) at cursor
              - holds File blob in React state Map
              - mints objectURL via URL.createObjectURL for preview
5. Client    SubmitPRModal — editable title + description; client serializes
              all Blobs to base64 + POSTs the bundle
6. API       POST /api/projects/:id/pr:
              - ownership + lock check (refuse if prUrl set)
              - validates each image: path regex, decoded size, magic-byte sniff
              - looks up user.githubToken
              - calls createReadmePR(...)
7. github-pr GET /repos/:o/:r              → default_branch
              GET /git/ref/heads/{default}  → parent commit SHA
              GET /git/commits/{sha}        → parent tree SHA
              POST /git/blobs (parallel)    → blob SHAs for README + each image
              POST /git/trees               → new tree (base_tree + entries)
              POST /git/commits             → new commit
              POST /git/refs                → branch gitdocs/readme-{nanoid}
              POST /pulls                   → { html_url, number }
8. API       UPDATE projects SET prUrl, prNumber, prStatus='open',
                                  prCheckedAt=NOW(), readmeMarkdown=$markdown
              respond { prUrl, prNumber, branch }
9. Client    Modal closes, toast with "View on GitHub" link, navigate /dashboard
              queryClient invalidates ['projects']
10. Dashboard refetch → card now has prUrl → next click opens GitHub PR page
11. Later    Dashboard refetch → status enrichment polls GitHub /pulls/:n
              (only for prStatus='open' AND prCheckedAt > 60s ago)
              → updates DB row → badge flips to Merged or Closed
```

End-to-end PR creation latency (text-only README, no images): ~1.2s; with two screenshots: ~2.5s — dominated by 4–6 GitHub API round-trips.

---

## 4. Key design decisions

### 4.1 DB-vs-Redis duality

- **In-flight jobs live in Redis only.** Hash `job:<jobId>` is the snapshot, set `user:<userId>:active` is the per-user index.
- **Terminal jobs live in Postgres only.** `INSERT INTO projects` happens at completion/failure; Redis hash gets a short TTL after that.
- **Dashboard merges both** — `/api/dashboard/projects` (PG) + `/api/dashboard/active` (Redis) + SSE updates.
- This means a refresh mid-job shows the card at its current stage from Redis. No polling needed.

### 4.2 Why `redis.duplicate()` everywhere

Three sockets to Upstash from one Node process:

| Socket | Used by | Why isolated |
|---|---|---|
| `redis` (main) | processor HSET/SREM, route handlers | Normal commands, always available |
| `redis.duplicate()` for QueueEvents | `lib/queue.ts` | Permanently in subscribed mode (XREAD BLOCK) — can't run other commands |
| `redis.duplicate()` for Worker | `worker/index.ts` | Permanently blocked on BRPOPLPUSH — same restriction |

A subscribed Redis client can only run `SUBSCRIBE/UNSUBSCRIBE/PING/QUIT`. Reusing one socket = error storms.

### 4.3 Concurrency=3 on single-threaded Node

JS is single-threaded for CPU, but jobs spend 99.8% of their time `await`ing GitHub + DeepSeek. The event loop interleaves 3 jobs across `await` yield points. Proof: `[deepseek] -> CALL repoB` appears in logs before `[deepseek] <- DONE repoA` when running concurrently.

Higher concurrency would just queue at DeepSeek; 3 is a balance between throughput and rate limits.

### 4.4 The `push()` helper: durable hash + live event

```ts
const push = async (stage, extras = {}) => {
  await redis.hset(`job:${jobId}`, { stage, updatedAt: Date.now(), ...extras })  // durable snapshot
  await job.updateProgress({ jobId, stage, ...extras })                          // live event
}
```

- Hash write FIRST: when SSE listener reacts to the event, it re-reads the hash and gets the new state. Reversing the order would push stale data.
- The SSE re-read makes the system robust against partial event payloads. Hash is source of truth.

### 4.5 `rejected` vs `failed`

- **`rejected`** = >200 files. No DeepSeek call ever made. No DB row. Just an SSE event + client toast. Job ends in 0.9s.
- **`failed`** = anything else that throws. DB row written with `status='failed'` + `errorMessage`. Visible in dashboard's projects section.

Reasoning: rejecting too-large repos isn't really a "failure" — it's policy. Treating it as transient noise (toast + drop) feels right.

### 4.6 Cleanup ordering — DB write before Redis SREM

```ts
INSERT INTO projects ...
SREM user:<id>:active <jobId>
EXPIRE job:<id> 1h
```

If the SREM happens before the INSERT and Redis crashes between them, the card disappears from the dashboard before the project row exists. Order reversed = race window where the card briefly vanishes then reappears. Order as written = if SREM fails, card stays in `active` set (graceful: re-fetch on next refresh will find the new PG row and the stale Redis entry; client dedups by `(repoOwner, repoName)`).

### 4.7 `req.on('close')` is non-optional

Every SSE route attaches per-connection listeners to `readmeEvents`. Without detaching them on disconnect:
- Heartbeat `setInterval` keeps firing forever, writes to dead socket → throws.
- `onProgress` keeps running per event, does HGETALL, tries to write to dead socket → throws.
- Listener count on `readmeEvents` grows unbounded → Node OOM after enough reconnects.

Cleanup is mandatory. Pattern: `.on()` on connect, `.off()` in `req.on('close')`.

### 4.8 Schema decisions

- **`projects.userId` FK with `onDelete: 'cascade'`** — deleting a user wipes their projects. Alternatives (`set null`, `restrict`) don't fit the ownership semantics.
- **`status` has no default** — every INSERT must explicitly state success/failure. Prevents silently mis-recording failures.
- **`repoOwner` + `repoName` denormalized** — not derived from `users.username` because (a) repos can live under orgs, (b) GitHub usernames can change.
- **`language` is text not enum** — Postgres enums are painful to ALTER; flexibility matters more than the 1-byte savings.
- **`readmeMarkdown` and `errorMessage` mutually exclusive in practice** — completed rows have one, failed rows have the other. Not enforced by CHECK constraint (soft invariant).

### 4.9 SSE scope: per-user, not per-job

One EventSource per browser tab, regardless of in-flight count. Server filters BullMQ events by re-reading `job:<id>` hash and comparing `userId`.

Alternative (per-job EventSource) would hit browser's 6-connection-per-origin limit at 6+ active jobs. Per-user scales freely.

### 4.10 Client SSE lifted to a Provider (`useJobStream`)

The EventSource lives in `<JobStreamProvider>` wrapping `<Routes>`. It survives navigation between `/`, `/listrepos`, `/dashboard`. This means:

- `completed` / `failed` / `rejected` toasts fire regardless of which page is mounted.
- Dashboard reads `active` from the hook's context, doesn't own the SSE itself.
- Single source of truth for live state across the app.

### 4.11 Single-commit PR via Git Data API (not Contents API)

The Contents API is one PUT per file → N+1 commits per PR ("Add screenshot-1", "Add screenshot-2", "Update README"). Ugly history.

The Git Data API path (blob → tree → commit → ref → PR) lets us atomically commit the README + every image in one operation. Six API calls total but one clean commit in the PR diff.

### 4.12 Image lifecycle — three-stop journey, no GitDocs storage

```
Browser memory (File + objectURL)
       ↓ (base64 in PR POST body)
Node RAM (decoded buffer, magic-byte validated)
       ↓ (Git Data blobs API)
GitHub repo (readmeImages/img-xxxxxxxx.png)
```

GitDocs has no S3, no Cloudinary, no on-disk image cache. The user's repo is the permanent home. Three benefits: (a) no orphan-upload cleanup logic, (b) images survive if GitDocs dies, (c) zero storage cost for us.

The trade-off: a refresh mid-edit loses image references in the markdown (paths remain, blobs gone). We accept this for v1 with a `beforeunload` guard + mobile-only warning banner.

### 4.13 Image validation: regex + magic-byte sniff

Two layers, both server-side:
- **Path regex**: `^readmeImages/img-[A-Za-z0-9_-]{8}\.(png|jpe?g|gif|webp)$`. Lets through only paths we generated — no traversal, no arbitrary writes.
- **Magic-byte sniff**: PNG `89 50 4E 47`, JPEG `FF D8 FF`, GIF `47 49 46`, WebP `52 49 46 46 .. .. .. .. 57 45 42 50`. Catches an attacker spoofing a `.png` extension on a script payload.

A reported MIME alone isn't trusted because the client controls it.

**Regex alphabet gotcha** — nanoid's default alphabet is `[A-Za-z0-9_-]`, not lowercase-only. An initial `[a-z0-9]{8}` regex rejected every PR with an image until corrected. Mirror nanoid's full alphabet in the server regex.

### 4.14 PR status enrichment — 60s cache, best-effort, must await DB writes

Dashboard endpoint enriches projects where `prStatus='open' AND prCheckedAt > 60s ago`:

```
Promise.allSettled(stale.map(r => getPRStatus(...)))   // parallel GitHub fan-out
↓
for each fulfilled: mutate r.prStatus + r.prCheckedAt in response, enqueue DB UPDATE
↓
await Promise.allSettled(updates)                       // ← critical, see below
↓
res.json({ projects: rows })
```

**Best-effort**: failed GitHub calls (401, 404, timeout) are logged but never fail the dashboard. Stale data is better than no dashboard.

**The `await` matters**. Drizzle's update returns a PromiseLike, not a real Promise. Calling `.catch()` on it without awaiting *appears* to fire-and-forget but on the Neon HTTP driver the query never actually executes if the response completes first. Symptom: same `open → merged` poll line appears on every refresh because the DB never persists. Fix: collect updates into an array and `await Promise.allSettled(updates)` before responding. This adds one DB round-trip (~50ms per stale PR) — acceptable.

### 4.15 Strict lock on submitted PRs

Once a project has `prUrl IS NOT NULL`:
- The card click opens the PR URL on GitHub instead of `/project/:id`.
- A second `POST /:id/pr` returns 409 with the existing `prUrl`.
- The editor route refuses to re-open (planned v2 would fetch fresh README from GitHub).

Reasoning: one PR per project per session keeps state simple. Users who want to edit further can do it on GitHub, or delete + re-import.

### 4.16 Retry = delete row + re-enqueue (any project, not just failed)

Any project can be re-run via `POST /api/projects/:id/retry`. The handler:
1. Looks up the row (ownership-checked)
2. DELETEs it — including any `prUrl` / `prStatus` metadata
3. Seeds Redis (`HSET job:<newJobId>`, `SADD user:<id>:active`)
4. Enqueues a fresh BullMQ job via `readmeQueue.add(...)`

The worker then runs the full `analyzing → generating → completed` pipeline and INSERTs a new row. **The project ID changes** because the old row is gone and the new row gets a fresh UUID.

The endpoint name (`/retry`) is a legacy carryover from when only failed projects qualified. The semantics are now broader — "regenerate from scratch" — but the URL stays for compatibility.

**What this does and doesn't touch:**
- The DB row for this dashboard entry is gone. Any `prUrl` link from that row is gone.
- The GitHub PR itself is untouched. If it was open or closed, it stays open or closed on GitHub. If it was merged, the merged commit on the default branch stays merged.
- Drafts in `localStorage` for the old project ID are cleared client-side (`clearDraft` in `Dashboard.runRetry`) since the ID is invalid post-regen.

**Client UX**: the confirm dialog branches on `status` + `prUrl` + `prStatus` to surface the right warning:
- Failed → "re-queued, fresh attempt"
- Completed, no PR → "re-analyzed, nothing on GitHub touched"
- Completed, PR open/closed → amber callout: "PR #N stays on GitHub, dashboard entry stops linking to it"
- Completed, PR merged → red callout: "PR #N already merged on default branch — regenerating does not undo that"

Considered alternative: keep the row and have the processor UPDATE instead of INSERT on regen. Rejected — would require a `retry` flag in the job payload and conditional logic in `processor.ts`, and the changed-ID behavior is fine since failed cards have no external references and completed cards' PR links are already discarded by the regen itself.

### 4.17 PR-target = same repo, never the upstream of a fork

`POST /repos/:owner/:repo/pulls` with `base=default_branch` lands the PR on the same repo the user picked. For forks, GitHub's API defaults the PR base to the *parent* repo if you omit it — we explicitly set `base` to the fork's default branch so PRs always target the user's own repo, never upstream by accident.

### 4.18 Magic-byte size cap = `35mb` Express body limit

Default Express `json()` parser limit is 100kb. The PR endpoint accepts up to 25 MB of base64 image data + ~33% base64 inflation + small JSON overhead, so the limit is raised to 35 MB. Lower-volume routes (auth, generate, dashboard) ride on the same higher limit — harmless but worth knowing.

### 4.19 Responsive editor via three viewport modes

`useViewport()` returns `'mobile' | 'tablet' | 'desktop'` from `window.matchMedia`. Layout:

| Mode | Width | Layout | Default pane |
|---|---|---|---|
| desktop | ≥1024 | side-by-side split | both |
| tablet | 768–1023 | side-by-side + 3-way toggle `[edit · split · preview]` | split |
| mobile | <768 | tabs `[edit · preview]` + collapsed MDEditor toolbar | edit |

Pane height is computed from `window.innerHeight` minus a per-viewport offset (navbar + sticky header + optional draft banner + optional toggle row + attach strip). Recomputes on resize.

### 4.20 Image draft persistence: markdown yes, blobs never

`localStorage` autosave keyed by `gitdocs:draft:<projectId>`, debounced 500ms, stored as a small JSON envelope `{ md, updatedAt }`. The helpers live in `client/src/lib/draft.ts` (`saveDraft`, `loadDraft`, `clearDraft`, `sweepDrafts`, `stripImageRefs`).

**Images are never persisted.** Two reasons:
- localStorage's ~5MB origin-wide quota can't fit even one 5MB image after base64's 33% inflation
- Inflating Blobs to base64 strings burns CPU on every save and isn't free to decode back

**Strip-on-save, not strip-on-load.** When `saveDraft` writes the envelope, `stripImageRefs` replaces every `![alt](readmeImages/img-XXXXXXXX.ext)` (paths produced by our nanoid generator) with `<!-- re-attach image: alt -->`. The in-memory `markdown` state keeps the original refs during the session; only the persisted copy is sanitized. Effects:
- After refresh, the editor restores text + visible placeholder comments showing where each image went and what its alt text was. User re-drops the file and deletes the comment.
- Preview can never render a broken local image after restore — the path simply isn't there.
- PR submit can never accidentally commit a markdown referencing an image whose blob is gone.

The regex is scoped to our exact path shape (`readmeImages/img-<nanoid8>.<ext>`) so external image URLs like `![logo](https://...)` are left untouched.

**5-day TTL.** Each envelope carries an `updatedAt` timestamp; `loadDraft` returns `null` (and deletes the key) if `Date.now() - updatedAt > 5 days`. Two enforcement layers:
- *Lazy on read* — `loadDraft` deletes expired keys when the editor mounts
- *Sweep on dashboard mount* — `sweepDrafts(projects)` walks every `gitdocs:draft:` key and drops orphans (project no longer exists), locked entries (project has `prUrl`), and expired ones in one pass

Lazy alone leaves expired keys for projects nobody opens; sweep alone misses an old draft on a project that *does* still exist. Both together cover everything.

**Cleanup triggers.** Every place a draft needs to die:
| Trigger | Where | What |
|---|---|---|
| User clicks "discard" on the restored-draft banner | `ProjectEditor.handleDiscardDraft` | `clearDraft(id)` |
| PR submitted successfully | `ProjectEditor.handleSubmitPR` | `clearDraft(id)` |
| Project deleted from dashboard | `Dashboard.runDelete` | `clearDraft(id)` |
| Project re-generated (new ID minted) | `Dashboard.runRetry` | `clearDraft(id)` for the *old* ID |
| Projects refetch on dashboard mount | `Dashboard` effect | `sweepDrafts(rows)` — orphans/locked/expired in one pass |

**Banner shows draft age.** The hydrate effect captures `updatedAt` from `loadDraft` and renders `restored unsaved draft from N {minutes,hours,days} ago` so the user can decide whether to keep it before the TTL claims it.

**Legacy migration.** Drafts written before the envelope existed (raw markdown strings) are detected on read by failed `JSON.parse` / failed shape check. `loadDraft` re-envelopes them with a fresh `updatedAt = Date.now()` and returns the stripped form. One-time migration per legacy entry, transparent to the user.

**Why not IndexedDB.** IDB would persist blobs natively at multi-GB quotas. Considered and rejected — adds an async hydration race + dependency on `idb` for ergonomics, all to preserve image work that the user can re-drop in a few seconds. The strip-on-save model keeps the data flow consistent with the broader "GitDocs never stores images" stance (§4.12) and matches the existing mobile banner's promise.

### 4.21 In-session image filtering — `referencedImages` as derived state

The editor keeps two pieces of state that can drift:
- `markdown` — the source of truth for what gets submitted as the README
- `images: Map<path, File>` — every file the user dropped this session, keyed by the path inserted into the markdown at drop time

Without a bridge, those drift the moment the user deletes an `![](readmeImages/...)` line: the markdown loses the ref, the Map still holds the File, and the original submit logic would upload an orphan image into the PR commit.

**Single source of truth: `referencedImages`.** A `useMemo` that walks `images` and keeps only entries whose `path` appears in the current `markdown`:

```ts
const referencedImages = useMemo(() => {
  const out: Array<[string, File]> = [];
  for (const entry of images) {
    if (markdown.includes(entry[0])) out.push(entry);
  }
  return out;
}, [images, markdown]);
```

Everything user-facing and network-facing routes through this:
- `imageCount` (shown in the attach strip and submit modal)
- `totalImageBytes` (shown next to the count)
- The PR payload's `serializedImages`

Displayed counts now always match what the server receives.

**Why keep the orphans in `images` instead of deleting them.** The Map acts as a content-addressed cache, alive as long as something points at the key. If the user deletes an image ref then hits Ctrl+Z (or otherwise types the path back), the path reappears in `markdown`, `referencedImages` recomputes, finds the File again, and the preview re-resolves via the same `objectURL`. No re-fetch, no re-drop, no broken preview. Orphans cost a File reference + a blob URL until the component unmounts; cheap.

Alternative considered: prune `images` whenever a ref disappears from text. Rejected — it would break the Ctrl+Z restore and force a re-drop. The "filter at boundary, keep everything in cache" pattern mirrors how git's object store keeps unreferenced blobs alive until GC.

**Server-side note.** The server doesn't enforce "every submitted image path must appear in the markdown." Client-side filtering is the only guard today. A defense-in-depth check on `/pr` is listed in §6.

### 4.22 Sync scroll: removed, not deferred

Attempted percentage-based scroll mapping between MDEditor's nested scroll containers and the preview pane. The `.w-md-editor-text` wrapper and inner `<textarea>` both emit scroll events but with quirks: textarea scroll doesn't bubble, the wrapper sometimes doesn't scroll at all depending on content layout. Multiple retry-attach attempts didn't find a clean signal.

Dropped the feature rather than ship a flaky version. Re-implementing properly would need line-by-line AST mapping (parse markdown → line ranges → DOM offsets in preview). Significant code for marginal value when both panes scroll independently and tracking each other isn't critical to the task.

---

## 5. File map

### Server

| File | Purpose |
|---|---|
| `server/src/index.ts` | Express bootstrap; `import './worker'` boots the queue worker in-process |
| `server/src/db/schema.ts` | Drizzle table defs (`users`, `projects`) |
| `server/src/db/index.ts` | Neon HTTP driver + Drizzle handle |
| `server/src/lib/redis.ts` | ioredis singleton, masked URL log, 5 lifecycle events |
| `server/src/lib/queue.ts` | `readmeQueue` (producer), `readmeEvents` (subscriber), `JobData` type |
| `server/src/lib/jwt.ts` | JWT sign/verify for auth cookie |
| `server/src/lib/github.ts` | (placeholder for future shared GitHub helpers) |
| `server/src/lib/github-pr.ts` | `createReadmePR` (Git Data API blob→tree→commit→ref→PR) + `getPRStatus` |
| `server/src/worker/index.ts` | `new Worker(...)` with concurrency=3, wraps `processor.ts` |
| `server/src/worker/processor.ts` | Orchestrator: setStage helper, dual write, reject path, DB persist |
| `server/src/worker/stages/stage1-analyze.ts` | GitHub tree fetch + DeepSeek analysis (returns `Stage1Result`) |
| `server/src/worker/stages/stage2-fetch.ts` | Parallel GitHub blob fetch with truncation |
| `server/src/worker/stages/stage3-generate.ts` | DeepSeek README generation prompt |
| `server/src/api/server.ts` | Mounts route modules under `/api` |
| `server/src/api/middleware/auth.ts` | JWT cookie → `req.userId` |
| `server/src/api/routes/auth.ts` | GitHub OAuth login/callback/logout |
| `server/src/api/routes/generate.ts` | `POST /generate` — seed Redis + enqueue |
| `server/src/api/routes/dashboard.ts` | `/me`, `/listrepos`, `/projects` (with PR-status enrichment), `/active` |
| `server/src/api/routes/projects.ts` | `GET /:id`, `POST /:id/pr`, `DELETE /:id`, `POST /:id/retry` |
| `server/src/api/routes/status.ts` | `GET /status/stream` — SSE with snapshot replay + per-user filter |

### Client

| File | Purpose |
|---|---|
| `client/src/main.tsx` | App entry; wraps `<Routes>` in `<JobStreamProvider>` + `<QueryClientProvider>` |
| `client/src/App.tsx` | Landing route (`/`) |
| `client/src/LandingPage.tsx` | Marketing page |
| `client/src/ListRepos.tsx` | `/listrepos` — GitHub repo list + Import button → POST `/api/generate` |
| `client/src/Dashboard.tsx` | `/dashboard` — projects + active cards, sections, search, hover delete/retry |
| `client/src/ProjectEditor.tsx` | `/project/:id` — split editor, image drag-drop, PR submit, responsive |
| `client/src/AuthError.tsx` | `/auth/error` — OAuth error page |
| `client/src/hooks/useUser.tsx` | React Query for `/dashboard/me` + redirect on 401 |
| `client/src/hooks/useJobStream.tsx` | Global SSE Provider — opens one EventSource, fires toasts, exposes `active` |
| `client/src/hooks/useViewport.tsx` | `'mobile' \| 'tablet' \| 'desktop'` from matchMedia, debounced via rAF |
| `client/src/lib/attach.ts` | Shared image validation (MIME + size + path generation) |
| `client/src/lib/draft.ts` | `saveDraft`/`loadDraft`/`clearDraft`/`sweepDrafts`/`stripImageRefs` + 5-day TTL envelope |
| `client/src/components/Navbar.tsx` | Top nav, user menu, logout |
| `client/src/components/Logo.tsx` | App logo |
| `client/src/components/MarkdownPreview.tsx` | `react-markdown` + GitHub-dark prose CSS + `urlTransform` for blob URLs |
| `client/src/components/SubmitPRModal.tsx` | Backdrop blur modal: editable title/description + asset summary |
| `client/src/components/ConfirmDialog.tsx` | Reusable destructive/neutral confirm (delete, retry) |

---

## 6. Known follow-ups

Roughly in priority order. None block the current feature set.

1. **Retry policy** — `attempts: 3` + exponential backoff in `readmeQueue.add()` to survive transient DeepSeek / GitHub blips. (User-facing retry button exists; this is for *automatic* retry on transient errors.)
2. **Re-edit after PR submission** — currently strict-locked. v2: fetch the current README from GitHub's Contents API and use as starting markdown. Image refs resolve from `raw.githubusercontent.com`.
3. **Server-side orphan-image rejection on `/pr`** — defense-in-depth for the client-side `referencedImages` filter (§4.21). Reject any submitted image whose `path` doesn't appear in the markdown body. One-line guard, blocks a future client bug from committing orphan files. Also reorder the `/pr` handler so the project lookup + ownership check happens before image decoding — currently a logged-in user can force the server to decode up to 25 MB of images against a project ID they don't own before the 404 lands.
4. **Drop debug logs in `dashboard.ts`** — `console.log(stale)` and `console.log(stale.length>0)` (lines 76-77) dump full project rows on every `/projects` request. Already-structured log on line 75 covers the useful signal.
5. **~~IndexedDB for image drafts~~** — *rejected*. The strip-on-save approach in §4.20 makes refresh-loses-images intentional and consistent with the "GitDocs never stores images" model from §4.12. Re-attaching is fast and the placeholder comment preserves intent. Kept here as a historical note only.
4. **Webhook-driven PR status** — currently we poll on dashboard load (60s cache). At higher scale, register a GitHub App / webhook for `pull_request.closed` events and skip polling entirely.
5. **Client code-splitting** — `@uiw/react-md-editor` + CodeMirror push the main bundle to ~1.5 MB ungzipped. Lazy-load the `/project/:id` route via `React.lazy(() => import(...))`.
6. **SSE listener registry** — at >20 concurrent users, refactor per-connection `.on()` to a shared `Map<userId, Set<res>>` to avoid N-fan-out per event.
7. **Schema migration discipline** — never `drizzle-kit push` on a DB with real data; use `generate` + hand-reviewed `migrate`. Snapshot drift also matters: when running `generate` after a hand-applied migration, fix the snapshot or future generates will repeat already-applied ALTERs. We use `IF NOT EXISTS` clauses as a safety net for drifted columns.
8. **`__drizzle_migrations` table is hand-maintained** — `drizzle-kit migrate` hung on this project. We bypass it by running SQL directly via `pg` + recording the migration hash. Future task: figure out why drizzle-kit hangs against Neon's `sslmode=require`.
9. **GitHub token at worker job time, not enqueue time** — currently we ship the token in the BullMQ job payload. For multi-tenant, fetch from PG inside the worker so token never sits in Redis.
10. **CORS origin from env** — hardcoded `localhost:5173` in `index.ts`; move to `process.env.FRONTEND_URL`.
11. **`apiKey` env var → `DEEPSEEK_API_KEY`** — code reads both; consolidate to the explicit name.
12. **Duplicate-import handling** — currently allows multiple rows for same repo. Likely want `(userId, repoOwner, repoName)` unique constraint with UPSERT, but unconfirmed.
13. **Filter cards by language/status/PR** — search is name-only today.
14. **Cost telemetry** — log a running DeepSeek token-cost total per user.
15. **Absolute image URLs for npm/PyPI READMEs** — relative `readmeImages/foo.png` paths work on github.com (auto-rewritten) but not on package registries. For library authors specifically, offer a toggle to emit `https://raw.githubusercontent.com/...` absolute URLs.
16. **Cancel in-flight job** — `active` cards currently can't be deleted/cancelled. Would need BullMQ `job.remove()` + Redis cleanup.

---

## 7. Local dev

### Env vars (`server/.env`)

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/callback
DATABASE_URL=postgresql://...neon.tech/...
JWT_SECRET=...
REDIS_URL=rediss://default:...@*.upstash.io:6379
DEEPSEEK_API_KEY=sk-...        # or `apiKey=` (legacy fallback)
```

### Run

```
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Server boots on `:3000`, client on `:5173`. Expected first-second logs:

```
[redis] connecting to rediss://default:***@*.upstash.io:6379
[queue] initializing queue "gitdocs-readme"
[worker] starting worker for queue "gitdocs-readme" (concurrency=3)
Server is running on port 3000
[redis] TCP connected
[redis] ready
[worker] ready
```

If Redis errors out before `ready`: check `REDIS_URL` is the `rediss://` TCP URL from Upstash, not the REST URL.

### Migrations

```
# Generate after editing src/db/schema.ts
cd server && npx drizzle-kit generate --name <description>

# Hand-review the SQL in drizzle/<n>_*.sql before applying.
# If the snapshot drifted, expect spurious ADD COLUMN statements — wrap them in IF NOT EXISTS.
```

`drizzle-kit migrate` may hang silently against Neon — if it does, apply the SQL directly via the `pg` client and record the migration hash into `drizzle.__drizzle_migrations` manually. See §6 item 8.

### Smoke test — generation

1. Open `http://localhost:5173`, log in via GitHub.
2. Dashboard loads, shows existing projects.
3. Click **Add New** → pick a small repo → **Import**.
4. Toast "Queued" appears; redirect to dashboard.
5. New card moves through Queued → Analyzing → Generating → Ready over ~20s.
6. Server logs show the `[deepseek] -> CALL` / `<- DONE` pair around each LLM call.
7. Refresh mid-job: card resumes at current stage (proof of Redis snapshot working).

### Smoke test — editor + PR

1. Click a Ready card → opens `/project/:id` with split editor and preview.
2. Resize the window — pane height should track viewport; pane toggle appears on tablet/mobile.
3. Edit text; refresh page; banner says "restored unsaved draft" (proof of localStorage autosave).
4. Drag a PNG/JPG onto the editor — green dashed border + "drop to embed" overlay; markdown gets `![alt](readmeImages/img-XXXXXXXX.png)`; preview shows the image via blob URL.
5. Try dropping a PDF — rejected with toast.
6. Click **Submit PR** → modal opens with editable title/description and asset summary.
7. Click **Create Pull Request** → ~2s spinner → success toast with PR link → redirect to dashboard.
8. The card now shows the **PR open** badge; clicking opens the PR on GitHub.
9. Merge the PR on GitHub; wait ≥60s; refresh dashboard. Badge flips to **Merged**.
10. Hover a failed card (force one via SQL `UPDATE`) — retry icon appears. Click → confirm → re-queues. Worker runs full pipeline; new row appears with fresh project ID.

### Common gotchas

- **White screen on landing**: a broken named import somewhere in the route graph crashes the bundle. Check Vite output.
- **`MaxRetriesPerRequestError`**: forgot `maxRetriesPerRequest: null` on ioredis. BullMQ needs it.
- **SSE never sends updates**: confirm `QueueEvents` connection isn't the same socket as the main `redis` (must be `.duplicate()`).
- **Push to GitHub fails on secret scan**: a token sneaked into a commit. Use `git filter-branch --index-filter` to scrub.
- **PR status badge stuck on "PR open" after you merged on GitHub**: 60s cache TTL. Wait, then refresh. If still stuck, check server logs — if `[dashboard] poll ... open → merged` keeps repeating on each refresh, the DB UPDATE isn't persisting. Make sure all `db.update(...).where(...)` calls are *awaited* (see §4.14).
- **`Invalid image path` on PR submit**: server regex must include nanoid's full alphabet `[A-Za-z0-9_-]`, not `[a-z0-9]`. See §4.13.
- **`drizzle-kit migrate` hangs**: known issue with Neon's SSL mode. Apply SQL via `pg` directly and backfill `__drizzle_migrations`. See §6 item 8.
- **Editor pane bottoms cut off the attach strip**: the per-viewport offset in `ProjectEditor.tsx` is tuned for the current chrome. If you add a new sticky banner above the editor, increase `baseOffset` accordingly.
- **Mac traffic-light dots feel out of place after dropping window chrome**: removed deliberately. The `❯` prompt + bottom hint strip carry the brand without per-pane decoration.

---

## 8. Production deployment

`docs/deployment.md` is the step-by-step runbook. This section is the **why** — what the deployed topology looks like and which trade-offs each piece encodes.

### 8.1 Live topology

```
                       ┌─────────────────────────────────────┐
                       │   Cloudflare edge (global anycast)  │
                       │   - DNS authoritative for           │
                       │     gitdocs.online                  │
                       │   - DDoS, WAF, rate-limit at edge   │
                       │   - Universal SSL (browser-trusted) │
                       └─────────┬──────────────────┬────────┘
                                 │                  │
                                 │ HTTPS            │ HTTPS
                                 │ (Pages serves    │ (Origin Cert,
                                 │  static build)   │  Full Strict)
                                 ▼                  ▼
                  ┌────────────────────┐   ┌─────────────────────────┐
                  │ Cloudflare Pages   │   │ AWS EC2 t3.micro        │
                  │ gitdocs.online     │   │ api.gitdocs.online      │
                  │ - React build      │   │ - Elastic IP (hidden)   │
                  │ - VITE_API_URL     │   │ - UFW 22/80/443         │
                  │   inlined at build │   │ ┌─────────────────────┐ │
                  └────────────────────┘   │ │ Caddy :80,:443      │ │
                                           │ │ TLS via Origin Cert │ │
                                           │ │ /etc/cf/origin.*    │ │
                                           │ └────────┬────────────┘ │
                                           │  reverse_proxy          │
                                           │ ┌────────▼────────────┐ │
                                           │ │ Node 127.0.0.1:3000 │ │
                                           │ │ Express + BullMQ    │ │
                                           │ │ trust proxy = 1     │ │
                                           │ │ pm2 → systemd       │ │
                                           │ └─────────────────────┘ │
                                           └─────────────────────────┘
                                                       │
                       ┌────────────────────────────┬──┴──┬──────────────────────┐
                       ▼                            ▼     ▼                      ▼
              ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
              │  Upstash Redis  │         │  Neon Postgres  │         │  DeepSeek API   │
              │   (rediss://)   │         │   (DATABASE_URL)│         │                 │
              └─────────────────┘         └─────────────────┘         └─────────────────┘
```

Frontend and backend live on different boxes by design — the React build is static and Cloudflare's CDN is the cheapest, fastest way to serve it. The Node + worker process is the only thing that needs a long-lived VM.

### 8.2 The two-proxy chain — Cloudflare and Caddy

Most apps have one reverse proxy. This deployment has **two**, each doing a distinct job:

| Layer | Software | Role |
|---|---|---|
| Edge proxy | Cloudflare | TLS to browser, hides origin IP, DDoS/WAF, edge cache, anycast routing |
| Local proxy | Caddy on EC2 | TLS terminator for the Cloudflare ↔ origin leg, reverse-proxy to Node on loopback, gzip, body-size cap |

Why not one or the other:

- **Cloudflare alone (no Caddy)** would require either: (a) Cloudflare → Node over plaintext HTTP, exposing the public-internet leg between Cloudflare and EC2 — `Flexible SSL`, broken trust model, or (b) Node speaking TLS directly with a public cert, which means Node manages cert reload and the EC2 IP must be publicly reachable on :443.
- **Caddy alone (no Cloudflare)** means the EC2 IP is public, DDoS protection drops to AWS SG only, no edge cache, and the cert must be from a publicly-trusted CA (Let's Encrypt via Caddy's auto-ACME — fine, but loses the wildcard convenience).

Two-proxy chain costs nothing extra (Caddy is one apt-install, Cloudflare free plan covers the edge) and gives you both halves.

### 8.3 TLS: two certs for two segments

```
Browser  ──[Universal SSL]──►  Cloudflare  ──[Origin Cert]──►  Caddy/EC2
         issuer: Google Trust  Services      issuer: Cloudflare Origin CA
         trusted by all browsers              trusted by Cloudflare edge only
         auto-rotates ~90 days                15-year validity
         covers gitdocs.online + *           covers *.gitdocs.online + gitdocs.online
```

- **Universal SSL** is auto-issued and stored by Cloudflare when the zone is added. Never seen, never touched on origin.
- **Origin Cert** is issued via Cloudflare → SSL/TLS → Origin Server → Create Certificate. The `.pem` + `.key` files live at `/etc/cf/origin.pem` and `/etc/cf/origin.key` on the VM. **Cloudflare only shows the private key once** — losing it means re-issuing.

The Origin Cert is **wildcarded** (`*.gitdocs.online`), which means new subdomains (e.g. `admin.gitdocs.online`) just need a Cloudflare DNS record + new Caddy site block — no new cert. Worth keeping that property when extending.

SSL/TLS mode in Cloudflare must be **Full (Strict)**. Other modes:

| Mode | Browser ↔ CF | CF ↔ Origin | Notes |
|---|---|---|---|
| Off | plaintext | plaintext | broken |
| Flexible | TLS | **plaintext** | misleading lock icon, real wire unencrypted |
| Full | TLS | TLS, any cert | accepts self-signed → MITM possible |
| **Full (Strict)** | TLS | TLS, validated CA | only option that's secure end-to-end |

### 8.4 DNS proxying (the orange cloud)

Each Cloudflare DNS record has a proxy toggle. The `api` A record points at the Elastic IP **with proxy ON (🟠)**:

- Public DNS returns Cloudflare anycast IPs (104.21.x.x), not the EC2 IP.
- Cloudflare maps `api.gitdocs.online` → `<elastic IP>` internally and forwards traffic.
- EC2 IP is effectively invisible in public DNS. Direct connections to the IP can be denied at the AWS SG level (we currently allow them because Caddy serves a 200/502 either way — but adding `allow_h2c: false` and IP-whitelisting Cloudflare's published ranges in SG is a hardening option).

If the proxy toggle goes gray:
- `nslookup` returns the raw EC2 IP
- Browsers hit Caddy directly with the Origin Cert (which they don't trust)
- TLS handshake fails: `NET::ERR_CERT_AUTHORITY_INVALID`

Single most common deploy regression. Always verify with `nslookup api.gitdocs.online` returning 104/172 prefixes.

### 8.5 Caddy site block

`/etc/caddy/Caddyfile`:

```caddy
api.gitdocs.online {
    tls /etc/cf/origin.pem /etc/cf/origin.key

    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }

    encode gzip
    request_body {
        max_size 35MB
    }
}
```

Key points:

- **Host header `{host}` is preserved** — Node sees `Host: api.gitdocs.online`, not `Host: localhost:3000`. OAuth callback URL generation and other host-aware logic depend on this.
- **`request_body max_size 35MB`** matches the Express `json({ limit: "35mb" })` — image base64 payloads during PR submit can be large. Keep these two in sync.
- **`encode gzip`** compresses HTTP responses; SSE streams skip compression (no `Content-Length`) so they're not affected.
- **Cert file permissions matter.** Caddy runs as the `caddy` user, not root. The first reload failed with `permission denied` because `origin.key` was `chmod 600` owned by `root:root`. Fix: `chown root:caddy /etc/cf/origin.*; chmod 640 origin.key; chmod 644 origin.pem`.

Reload, never restart, after edits:
```bash
sudo caddy validate --config /etc/caddy/Caddyfile   # syntax check
sudo systemctl reload caddy                          # zero-downtime
```

A bad config on `restart` brings Caddy down (and with it TLS). On `reload`, Caddy keeps serving the old config if the new one is invalid.

### 8.6 Express trust proxy

```ts
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
```

Why this can't be skipped: every request arrives at Node from `127.0.0.1` (Caddy → loopback). Without `trust proxy`, `req.ip` returns `127.0.0.1` for everyone, so `express-rate-limit` buckets the whole world into one. The auth limiter (10/15min per IP) would lock everyone out after 10 total logins; the global limiter (300/15min) would lock everyone out after 300 total requests.

`trust proxy: 1` tells Express to read `X-Forwarded-For` and peel off **one** trusted hop. With the chain `Cloudflare → Caddy → Node`, Cloudflare writes `X-Forwarded-For: <real client>`, Caddy preserves it, Express reads it. `req.ip` is now the real client.

Why production-only:
- In dev there is no proxy in front of Node. `X-Forwarded-For` doesn't exist.
- If `trust proxy: 1` were always on, a malicious local client could spoof their IP by sending the header. Production has Caddy stripping/rewriting; dev does not.

### 8.7 Env vars and CORS

Three env-var values must agree for the CORS + OAuth flow to work:

| Variable | Where | Value | Used for |
|---|---|---|---|
| `FRONTEND_URL` | `server/.env` | `https://gitdocs.online` | CORS `Access-Control-Allow-Origin`, OAuth post-callback redirect |
| `VITE_API_URL` | `client/.env.production` | `https://api.gitdocs.online` | inlined into the client bundle at build time; every API fetch |
| `GITHUB_CALLBACK_URL` | `server/.env` + GitHub OAuth App | `https://api.gitdocs.online/api/auth/callback` | OAuth `redirect_uri` parameter |

Exact-string comparison everywhere — no trailing slashes, scheme matters, www-or-not matters. The browser sends `Origin: https://gitdocs.online`; `cors()` middleware echoes `Access-Control-Allow-Origin: <env.FRONTEND_URL>`; if those don't byte-match, the browser blocks the response and the fetch rejects.

Two non-obvious failure modes:

1. **Trailing slash on `FRONTEND_URL`** → `ACAO: https://gitdocs.online/` ≠ `Origin: https://gitdocs.online` → CORS reject. Silent until you check headers.
2. **`VITE_API_URL` set in Pages dashboard but build done locally** → Vite inlines env vars **at build time**. If the build runs on your machine and you `wrangler pages deploy dist`, the dashboard env var is ignored. Either commit a `client/.env.production` and rebuild locally, or switch Pages to Git-integrated builds so the dashboard env actually applies.

When changing `.env` on the VM, pm2 must be reloaded with the `--update-env` flag — a plain `pm2 restart` keeps the old env in memory:
```bash
pm2 restart gitdocs --update-env
```

### 8.8 pm2 + systemd

Two-tier supervision:

```
systemd  ──►  pm2-ubuntu.service  ──►  pm2 daemon  ──►  gitdocs (node)
(boot)        (registered by         (long-lived,     (your app)
              pm2 startup systemd)    restarts crashes)
```

- `pm2 start dist/index.js --name gitdocs` — adds the app to pm2's process list.
- `pm2 startup systemd` — generates a `systemctl enable`-able service that runs `pm2 resurrect` at boot. (Must run the printed `sudo env PATH=...` command.)
- `pm2 save` — writes the current process list to `~/.pm2/dump.pm2`. `pm2 resurrect` re-reads this file on boot.

What survives what:

| Event | App stays alive? | Manual action needed? |
|---|---|---|
| Node throws & exits | ✓ pm2 restarts it | no |
| Memory leak / OOM | ✓ pm2 restarts it | no |
| `sudo systemctl restart caddy` | ✓ unrelated process | no |
| `sudo reboot` | ✓ if `pm2 startup` + `pm2 save` ran | no |
| `pm2 stop gitdocs` | ✗ explicit stop, stays stopped across reboots | yes (`pm2 start gitdocs`) |

### 8.9 Free-tier constraints to track

| Constraint | Limit | Mitigation |
|---|---|---|
| EC2 t3.micro RAM | 1 GB | 2 GB swap at `/swapfile`, `vm.swappiness=10` — LLM JSON spikes survive |
| EC2 free-tier hours | 750/mo | Single instance only — 1 × 730hr/mo fits |
| Free-tier duration | 12 months from account creation | Zero-spend budget alarm catches expiry day |
| Cloudflare Pages builds | 500/mo on free plan | Plenty for normal dev cadence |
| Upstash Redis | 10k cmds/day free | BullMQ heartbeats use ~1k/day baseline |
| Neon Postgres | 3 GB | Projects table is small; well under |

### 8.10 Day-2 operations cheat sheet

**Deploy code change to backend:**
```bash
ssh -i gitdocs-key.pem ubuntu@<elastic-ip>
cd ~/gitdocs && git pull && cd server && npm ci && npx tsc -b
pm2 reload gitdocs --update-env
pm2 logs gitdocs --lines 30
```

`pm2 reload` is zero-downtime (new process spawns, old drains then exits). `pm2 restart` is hard (kill → start). Prefer reload.

**Health probes:**
```bash
pm2 status                              # is alive?
pm2 logs gitdocs --err --lines 100      # what crashed?
free -h                                 # MemAvailable; <100 MB = trouble
df -h                                   # 30 GB disk fills with logs over months
sudo journalctl -u caddy -n 50          # TLS / reverse-proxy issues
sudo systemctl is-active caddy
```

**Cert rotation (every 15 years or on key compromise):**
1. Cloudflare → SSL/TLS → Origin Server → Create Certificate (new pair)
2. Save `.pem` + `.key` locally; `scp` to `/tmp/` on VM
3. `sudo mv /tmp/origin.* /etc/cf/`; reset ownership and chmod (`root:caddy`, `640`/`644`)
4. `sudo systemctl reload caddy`
5. Revoke the old cert in Cloudflare's Origin Server page

**Cloudflare error → cause mapping** (origin-side, browser-facing errors only — see §15 of `docs/deployment.md` for full list):

| Error | Layer | First check |
|---|---|---|
| 521 Web server is down | Caddy not running | `sudo systemctl status caddy` |
| 522 Connection timed out | Port 443 blocked | AWS SG inbound + `sudo ufw status` |
| 525 SSL handshake failed | Caddy can't load cert | `openssl x509 -in /etc/cf/origin.pem -noout -dates` + file perms |
| 526 Invalid SSL certificate | Cert expired / wrong SANs | Re-issue Origin Cert with `*.gitdocs.online` |
| `redirect_uri_mismatch` | GitHub OAuth app callback vs `.env` | Exact match required, no trailing slash |
| CORS reject | `FRONTEND_URL` ≠ browser `Origin` | Compare both, pm2 reload with `--update-env` after fix |

