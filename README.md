<div align="center">

<img src="readme_assets/logo-1024.png" alt="GitDocs logo" width="180" />

# GitDocs

### Turn any GitHub repository into a polished, PR-ready README in under a minute.

*Analyze - Generate - Edit - Ship - all without leaving the browser.*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node-Express_5-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![BullMQ](https://img.shields.io/badge/BullMQ-Workers-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://docs.bullmq.io)
[![Postgres](https://img.shields.io/badge/Neon-Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-LLM-4D6BFE?style=for-the-badge&logo=openai&logoColor=white)](https://deepseek.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

<br />

[![Live at gitdocs.online](https://img.shields.io/badge/%E2%96%B6%20Live-gitdocs.online-22C55E?style=for-the-badge&logoColor=white)](https://gitdocs.online)

[**Live App**](https://gitdocs.online) - [**Demo**](#demo) - [**Features**](#what-it-does) - [**Architecture**](#architecture) - [**Quick Start**](#quick-start) - [**Roadmap**](#roadmap)

</div>

---

## Demo




https://github.com/user-attachments/assets/f323f752-4e01-4023-92c9-755796974816


*The dashboard merges durable projects (Postgres) with in-flight jobs (Redis) over a single SSE stream - refresh-safe, multi-tab safe.*

---

## What it does

GitDocs is a full-stack web app that **reads your repository, understands what it is, writes a beautiful README, and ships it as a Pull Request - all from one screen.**

> **Try it now, no setup required -> [gitdocs.online](https://gitdocs.online)**

You sign in with GitHub, point GitDocs at any repo you own, and the system:

1. **Analyzes the tree** with DeepSeek to figure out language, framework, purpose, and structure.
2. **Streams progress live** to the dashboard (`queued -> analyzing -> generating -> ready`) via Server-Sent Events.
3. **Drafts a complete README** - title, badges, features, install steps, usage, all reasoned from real source files.
4. **Hands you a split-pane editor** with live markdown preview, drag-and-drop screenshots, and a 5-day autosave.
5. **Opens a single-commit Pull Request** on your repo (Git Data API: blob -> tree -> commit -> branch -> PR).
6. **Tracks the PR's status** - *Open / Merged / Closed* - and surfaces it back on your dashboard.

GitDocs **never stores your images**. They travel browser -> Node RAM -> GitHub repo. No S3, no Cloudinary, no orphan cleanup.

---

## Why GitDocs

| Problem | What GitDocs does about it |
|---|---|
| README writing is the chore everyone postpones | Generates a complete first draft in ~20 seconds |
| AI-generated drafts feel generic | Reads actual source files, not just repo metadata |
| Markdown editors and previews disagree on screenshots | Custom `urlTransform` resolves blob URLs in-preview, base64 to GitHub on submit |
| "Just edit it on GitHub" loses your changes when the tab closes | 5-day localStorage autosave with stripped image refs |
| AI tools dump PRs with N commits ("Add file 1", "Add file 2") | One atomic commit via Git Data API - clean diff, clean history |
| You can't tell if your AI-generated PR ever got merged | Dashboard polls GitHub and flips the badge to *Merged* automatically |

---

## Feature Tour

### GitHub OAuth, scoped to what we actually need
Sign in once. We store nothing more than your `users` row and a token used only at job time.

### Live job stream (SSE, not polling)
One `EventSource` per tab, lifted into a global Provider so toasts fire from any route. The dashboard re-renders the moment a worker stage transitions - typical pixel-to-pixel latency: **~50 ms**.

### Three-stage LLM pipeline
- **Stage 1 - Analyze** - fetch the file tree, send a structured prompt, get back `{ displayName, language, shortDescription, ... }`.
- **Stage 2 - Fetch** - parallel GitHub blob requests for the files Stage 1 deemed important.
- **Stage 3 - Generate** - full README markdown with sections reasoned from real code.

### Drag-and-drop screenshots, validated twice
- **Client-side**: MIME sniff, 5/25 MB cap, nanoid-keyed path `readmeImages/img-XXXXXXXX.png`.
- **Server-side**: regex on the path **and** magic-byte sniff on the decoded buffer. A spoofed `.png` carrying script bytes is rejected before it ever reaches GitHub.

### Split editor with real preview parity
`@uiw/react-md-editor` on the left, `react-markdown` + `remark-gfm` on the right, with a custom `urlTransform` so local blob URLs resolve *while you type* and base64 payloads upload *only on submit*.

### Responsive editor, three viewport modes

| Viewport | Layout | Default pane |
|---|---|---|
| **Desktop** >=1024 px | side-by-side split | both |
| **Tablet** 768-1023 px | split + 3-way toggle `[edit / split / preview]` | split |
| **Mobile** <768 px | tabs `[edit / preview]` | edit |

### 5-day draft persistence - markdown yes, blobs never
`localStorage` autosaves your work every 500 ms. Image references are replaced with `<!-- re-attach image: alt -->` comments so a refresh leaves a clear "drop the file here again" trail rather than a broken preview.

### One-click retry / regenerate
Any project - failed *or* completed - can be regenerated from scratch. The dashboard's confirm dialog warns you intelligently: *"Your PR #42 is already merged on the default branch - regenerating won't undo that."*

### PR status enrichment with a 60-second cache
On dashboard load, every project with `prStatus='open'` and a stale `prCheckedAt` is polled in parallel via `Promise.allSettled`. Failures are logged, never block the UI. Result: badges always look fresh, GitHub rate limits stay healthy.

### Rate limited at the edge
`express-rate-limit` + `rate-limit-redis` keep abusive clients off the queue without breaking honest ones.

---

## Architecture

```
+-------------+    POST /api/generate    +--------------+
|   Browser   |------------------------->| API + BullMQ |
| (React,SSE) |<---- GET /status/stream  | (1 Node proc)|
+-------------+                          +--+---+---+---+
                                            |   |   |
                  +-------- enqueue --------+   |   |
                  v                              |   |
            +----------+  QueueEvents (sub)      |   |
            | Upstash  |<------------------------+   |
            |  Redis   |-- BRPOPLPUSH ---------------+
            |  (TLS)   |                             |
            +----------+                             v
                  ^              +-------------------------+
                  |              |  BullMQ Worker          |
                  |              |  concurrency = 3        |
                  |              |  processor.ts           |
                  |              +--+-----+-----+----------+
                  |                 |     |     |
                  |       +---------v--+  |  +--v-----+
                  |       | GitHub API |  |  |DeepSeek|
                  |       | tree+blobs |  |  | stages |
                  |       +------------+  |  +--------+
                  |                       |
                  |                       v
                  |              +----------------+
                  +------------->|  Neon Postgres |
                                 |   projects     |
                                 +----------------+
```

**Three storage layers, deliberately separate.**

| Layer | Holds | Why |
|---|---|---|
| **Redis** (Upstash) | In-flight jobs, BullMQ internals, pub/sub events | Ephemeral, TTL'd, blocking pop |
| **Postgres** (Neon) | Terminal projects + PR metadata (`prUrl`, `prNumber`, `prStatus`, `prCheckedAt`) | Durable, never holds active jobs |
| **GitHub** | The merged README + every image asset | The user's repo is the permanent home |

For the full design rationale - why Redis duality, why concurrency = 3, why the Git Data API over Contents API, why magic-byte validation, why we *removed* sync-scroll instead of half-shipping it - read [`docs/architecture.md`](docs/architecture.md). It's 600+ lines of decisions, trade-offs, and the gotchas we hit on the way.

---

## Tech Stack

**Frontend**

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![React Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)

**Backend**

![Node](https://img.shields.io/badge/Node.js-LTS-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-Queue-DC382D?style=flat-square&logo=redis&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-Typed-C5F74F?style=flat-square&logo=drizzle&logoColor=black)
![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1?style=flat-square&logo=zod&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Cookies-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)

**Infrastructure & Services**

![Upstash](https://img.shields.io/badge/Upstash-Redis-00E9A3?style=flat-square&logo=upstash&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-Postgres-00E599?style=flat-square&logo=postgresql&logoColor=white)
![DeepSeek](https://img.shields.io/badge/DeepSeek-API-4D6BFE?style=flat-square)
![GitHub API](https://img.shields.io/badge/GitHub-OAuth_+_Git_Data_API-181717?style=flat-square&logo=github&logoColor=white)

---

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **A GitHub OAuth App** ([create one](https://github.com/settings/developers)) with callback `http://localhost:3000/api/auth/callback`
- **A Neon Postgres** database ([free tier](https://neon.tech))
- **An Upstash Redis** instance ([free tier](https://upstash.com)) - use the `rediss://` TCP URL, *not* the REST URL
- **A DeepSeek API key** ([deepseek.com](https://platform.deepseek.com))

### 1. Clone and install

```bash
git clone https://github.com/shivanshsin0203/GitDocs.git
cd GitDocs

# Install both workspaces
cd server && npm install
cd ../client && npm install
```

### 2. Configure `server/.env`

```env
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/callback

DATABASE_URL=postgresql://...neon.tech/...
JWT_SECRET=a_long_random_string
REDIS_URL=rediss://default:...@your-instance.upstash.io:6379
DEEPSEEK_API_KEY=sk-...
```

Optional for deployment - override defaults via env:

```env
# server/.env
FRONTEND_URL=https://your-app.example.com
```

```env
# client/.env.production
VITE_API_URL=https://your-api.example.com
```

### 3. Migrate the database

```bash
cd server
npx drizzle-kit generate --name init
# Review the generated SQL in drizzle/, then apply it.
```

### 4. Run both services

```bash
# Terminal 1
cd server && npm run dev          # -> :3000

# Terminal 2
cd client && npm run dev          # -> :5173
```

Open **http://localhost:5173**, log in with GitHub, and import your first repo.

A healthy first-second boot looks like:

```
[redis] connecting to rediss://default:***@*.upstash.io:6379
[queue] initializing queue "gitdocs-readme"
[worker] starting worker for queue "gitdocs-readme" (concurrency=3)
Server is running on port 3000
[redis] TCP connected
[redis] ready
[worker] ready
```

---

## Project Structure

```
gitdocs/
  client/                          # React 19 + Vite + Tailwind 4
    src/
      hooks/
        useJobStream.tsx           # global SSE provider - toasts + active jobs
        useUser.tsx                # React Query + 401 redirect
        useViewport.tsx            # mobile | tablet | desktop
      lib/
        api.ts                     # API_BASE from VITE_API_URL or localhost
        attach.ts                  # image validation (MIME + size + path)
        draft.ts                   # localStorage autosave + 5-day TTL
      components/
        MarkdownPreview.tsx        # react-markdown with blob-URL resolver
        SubmitPRModal.tsx          # editable title/description + asset summary
        ConfirmDialog.tsx
      Dashboard.tsx                # projects + active cards
      ProjectEditor.tsx            # split editor + image drag-drop + PR submit
      ListRepos.tsx                # repo picker -> POST /api/generate

  server/                          # Express 5 + BullMQ + Drizzle
    src/
      api/routes/                  # auth, generate, dashboard, projects, status
      worker/
        index.ts                   # Worker(concurrency=3)
        processor.ts               # orchestrator + dual-write helper
        stages/                    # stage1-analyze, stage2-fetch, stage3-generate
      lib/
        env.ts                     # zod-validated env, FRONTEND_URL fallback
        redis.ts                   # ioredis singleton (+ .duplicate() for sub/worker)
        queue.ts                   # readmeQueue + readmeEvents
        github-pr.ts               # Git Data API: blob -> tree -> commit -> ref -> PR
      db/schema.ts                 # Drizzle: users, projects

  docs/
    architecture.md                # the 600-line design reference
    deployment.md
    tobedone.md

  readme_assets/                   # logo, screenshots, demo video
```

---

## End-to-End Flow

A single import - **Import button click to "Ready" card on dashboard**:

```
1. Client    ListRepos -> POST /api/generate { repoOwner, repoName }
2. API       seed Redis (HSET job:<id>), enqueue BullMQ job
3. Client    toast "Queued", navigate to /dashboard
4. Worker    BRPOPLPUSH -> pull job atomically
              push('analyzing')   -> GitHub tree fetch
              push('generating')  -> DeepSeek stages 1 + 2 + 3
              INSERT INTO projects ... status='completed'
              push('completed', { projectId })
5. BullMQ    fires QueueEvents over Redis pub/sub
6. SSE       per-user filter -> writes to that user's TCP socket
7. Client    EventSource dispatches 'update' -> JobStreamProvider
              -> invalidates ['projects'], removes from active, fires toast
8. Dashboard cards re-render with the new project
```

**Pixel-to-pixel latency from worker stage change: ~50 ms** (two Redis round-trips).

A single PR - **Card click to "Merged" badge**:

```
1. ProjectEditor mounts, hydrates from DB + localStorage draft
2. User edits markdown, drags screenshots into the editor
3. SubmitPRModal serializes blobs -> base64
4. API validates every image (path regex + magic-byte sniff)
5. createReadmePR -> blobs -> tree -> commit -> branch -> PR  (one atomic commit)
6. DB row updated with prUrl + prNumber + prStatus='open'
7. Dashboard re-fetches, badge appears
8. Later refresh -> status enrichment polls GitHub -> badge flips to "Merged"
```

---

## Roadmap

Pulled from [`docs/architecture.md`](docs/architecture.md), roughly in priority order:

- [ ] **Automatic retry policy** - `attempts: 3` + exponential backoff for transient DeepSeek / GitHub errors
- [ ] **Re-edit after PR submission** - fetch current README from GitHub Contents API as starting markdown
- [ ] **Server-side orphan-image guard** - defense-in-depth for the client's `referencedImages` filter
- [ ] **Client code-splitting** - lazy-load `/project/:id` to drop the main bundle below 1 MB
- [ ] **Webhook-driven PR status** - register a GitHub App for `pull_request.closed` and stop polling
- [ ] **Cancel in-flight job** - BullMQ `job.remove()` + Redis cleanup for active cards
- [ ] **Filter cards by language / status / PR state** - search is name-only today
- [ ] **Absolute image URLs toggle** - for npm/PyPI READMEs that don't auto-rewrite relative paths
- [ ] **Cost telemetry** - running DeepSeek token-cost per user

---

## Contributing

Issues and PRs welcome. Before opening a PR, please:

1. Read [`docs/architecture.md`](docs/architecture.md) - it explains *why* things are the way they are.
2. Run the smoke tests in the architecture doc.
3. Keep changes scoped - large refactors are easier to review when filed as a design issue first.

---

## License

ISC - see [`LICENSE`](LICENSE).

---

<div align="center">

Built by <a href="https://github.com/shivanshsin0203">@shivanshsin0203</a> - README generated and self-hosted by GitDocs.

</div>
