# DeepSeek Model A/B Test — Round A vs Round B

**Date**: 2026-05-29
**Goal**: Decide whether to upgrade stage 2 (README generation) from `deepseek-chat` to `deepseek-v4-pro` non-thinking.
**Method**: Generate READMEs for 3 repos under each config, compare token usage, cost, and output quality.

---

## 1. Configurations tested

| | Round A | Round B |
|---|---|---|
| Stage 1 | `deepseek-chat` (legacy alias) | `deepseek-v4-flash` (explicit) |
| Stage 2 | `deepseek-chat` (legacy alias) | `deepseek-v4-pro`, `enable_thinking: false` |
| Thinking mode | Implicit OFF on both | ON on stage 1, attempted OFF on stage 2 |

**Pre-test assumption**: `deepseek-chat` aliases to `deepseek-v4-flash`. **Confirmed** by the resolved model name in stage 1 logs.

---

## 2. Headline numbers

| Repo | Files | Round A cost | Round B cost | Cost multiplier | README chars A → B |
|---|---|---|---|---|---|
| 2d_metaverse | 36 | **$0.00216** (0.22¢) | **$0.00572** (0.57¢) | **2.66×** | 7,743 → 6,573 (−15%) |
| CrudGo | 8 | **$0.00079** (0.08¢) | **$0.00358** (0.36¢) | **4.51×** | 4,538 → 4,935 (+9%) |
| TicTacToe | 37 | **$0.00159** (0.16¢) | **$0.00580** (0.58¢) | **3.65×** | 8,109 → 7,477 (−8%) |
| **Total** | — | **$0.00454** | **$0.01510** | **3.33× avg** | — |

Average cost per repo: **$0.00151 (0.15¢) → $0.00503 (0.50¢)**, a 3.33× increase.

Output is **not consistently longer** in Round B — two of three READMEs shrank.

---

## 3. Confounds — what makes this NOT a clean A/B

Documented honestly because they distort the comparison:

### 3.1 Stage 1 thinking-mode side effect

`deepseek-chat` does not emit reasoning tokens. **Explicitly named `deepseek-v4-flash` defaults to thinking ON** and emits 150–1,022 reasoning tokens per call. Stage 1 cost in Round B is therefore **~2–3× inflated** purely from the explicit-naming change, not from the model upgrade itself.

| Repo | Stage 1 A cost | Stage 1 B cost | Inflation |
|---|---|---|---|
| 2d_metaverse | $0.000111 | $0.000438 | 3.94× |
| CrudGo | $0.0000978 | $0.000336 | 3.43× |
| TicTacToe | $0.000154 | $0.000156 | 1.01× |

(The constant `STAGE1_ENABLE_THINKING = false` was added mid-test but never wired into the API call. Future test: actually pass `enable_thinking: false` on stage 1.)

### 3.2 v4-pro emitted reasoning tokens despite `enable_thinking: false`

Stage 2 v4-pro logs show 685–1,455 reasoning tokens **per call**, even though we sent `enable_thinking: false`. Either the param name is wrong (could be `thinking`, `thinking_mode`, or `enable_chain_of_thought`), or v4-pro emits some reasoning regardless. Real visible output is 30–60% of billed output:

| Repo | Stage 2 B billed out | reasoning | visible |
|---|---|---|---|
| 2d_metaverse | 2,340 | 685 | 1,655 |
| CrudGo | 2,382 | 1,167 | 1,215 |
| TicTacToe | 3,257 | 1,455 | 1,802 |

We paid for 8,000 output tokens to get ~4,700 visible. **The cost premium is partly from unwanted reasoning we can't disable through this param.**

### 3.3 Stage 1 picked different files

Round A's stage 1 (non-thinking) picked **12 files** for `2d_metaverse`; Round B's stage 1 (thinking) picked **10**. Different file selection → different stage 2 input → different output. We're not just comparing model A vs B on the same input.

### 3.4 Reasoning-token counts are non-deterministic

On the second run of stage 1 for the same repo:
- 2d_metaverse: 657 → 1,022 reasoning tokens (+55%)
- CrudGo: 234 → 895 (+283%)
- TicTacToe: 350 → 151 (−57%)

Same prompt, same model, **wildly different reasoning depth**. Cost variance per repo is ±30% just from this.

### 3.5 Prompt cache warms across rounds

Stage 1 cache-hit rate:
- Round A: 63–88% (cold start)
- Round B: 98–99% (warmed by Round A)

Round B benefits from Round A's cache priming. Stage 1 input cost is **artificially low** in Round B.

---

## 4. README quality — head-to-head

Comparing structure, accuracy, and completeness across the three repos.

### 4.1 CrudGo (the smallest, simplest repo)

**Round A** wins on completeness — includes a `License` section that Round B drops. Provides exact dependency versions (`Fiber v2.52.6`, `mongo-driver v1.17.2`, `godotenv v1.5.1`) where Round B is vaguer (`Go 1.23+`, `Fiber v2`).

**Round B** wins on a few specific accuracy points:
- Mentions `cors`, `logger`, `recover` middleware specifically (Round A misses two of three)
- Adds a Database Setup section noting the hardcoded `Analytic` database name in `config/db.go` (a real engineering detail)
- Notes the `books` collection name
- Better API Routes as a clean table (Round A has expanded sections per endpoint)

**Verdict**: split. Round B catches details a careful reviewer would value, but loses the License section and version specificity. Not worth 4.5× cost.

### 4.2 2d_metaverse (medium-complex fullstack)

**Round A is meaningfully more comprehensive:**
- 8 badges vs 6 (Round B drops Node.js, Socket.io)
- Specific versions everywhere (`React 18.3`, `Vite 5.4`, `Phaser 3.86`, `PeerJS 1.5`)
- **Captured frontend env vars** (`VITE_CLIENT_ID`, `VITE_DOMAIN` for Kinde OAuth) — Round B completely missed these
- Detailed WebSocket events split into Client→Server and Server→Client tables
- Project structure lists individual components (Game.jsx, Space.jsx, Home.jsx)
- Docker section with explicit env var flags

**Round B is shorter and less detailed.** Misses the Kinde frontend integration entirely — a functional documentation gap a user would hit immediately when trying to set up auth.

**Verdict**: Round A wins clearly. Round B is paying 2.66× to lose information.

### 4.3 TicTacToe (full-stack with auth + DB)

**Round A is the better README:**
- 10 badges vs 5 (Round B drops Node.js, Prisma, Socket.io, Vite, Tailwind)
- **Includes the User model schema as a table** (id, email, name, password, createdAt, updatedAt) — Round B doesn't
- Project structure lists individual route files (login.tsx, register.tsx, gameroom.tsx, watchparty.tsx) — Round B abstracts these as `...`
- Routes listed as `/api/register`, `/api/login`, `/api/rooms` — Round B says `/register`, `/login`, `/rooms` (one of these is wrong; need to verify against `http.ts`)
- 8 features listed vs 6
- More precise tech stack (lists `react-hot-toast`, `Lucide React`)

**Round B caveats:**
- Mentions `shadcn/ui` specifically (Round A says generic "Radix UI")
- Has a useful note about the frontend proxying to `localhost:3001`
- **Admits** in the API section: "The full route handler implementations are in `Backend/src/http.ts` (not included in the snapshot)" — this is honest but signals the model didn't have enough to work with

**Verdict**: Round A wins. The User model table is the kind of detail that makes a README functional rather than ornamental.

---

## 5. Cross-cutting observations

- **Round B drops badges aggressively** (3, 6, 5 vs Round A's 4, 8, 10). The system prompt allows this, and Round B may be applying it more strictly, but the result is less informative cards for visitors.
- **Round B's visible output is shorter** for 2 of 3 repos despite costing more — billed output is inflated by unstoppable reasoning tokens, but the actual README content is leaner.
- **Round B is more conservative about claims** ("not included in the snapshot", admits gaps) — this can be a virtue, but it leaves the README less complete.
- **Round A captures more "edge" details** (Kinde frontend env vars, individual component files, full User schema). For a generated README that the user will minimally edit, fewer gaps = better tool.

---

## 6. Cost projection

If we kept Round B as the new default:

| Volume | Round A cost/day | Round B cost/day | Difference |
|---|---|---|---|
| 100 repos/day | $0.15 | $0.50 | +$0.35 (+$10.50/mo) |
| 1,000 repos/day | $1.51 | $5.03 | +$3.52 (+$105/mo) |
| 10,000 repos/day | $15.13 | $50.33 | +$35.20 (+$1,056/mo) |

At any volume, the absolute cost is small. But the quality-per-dollar is worse.

If the 75%-off promo on v4-pro ends, Round B costs jump ~4× (regular price is `$1.74/M in` and `$3.48/M out`), making the comparison ~13× cost for slightly worse output.

---

## 7. Verdict — **revert to `deepseek-chat` for stage 2**

`deepseek-v4-pro` non-thinking does not produce better READMEs than `deepseek-v4-flash` (the resolved model for `deepseek-chat`) in this test. It costs 3.33× more on average and produces output that is shorter in 2/3 cases, less detailed in badges, and misses functional documentation (frontend env vars, User schema tables, individual file structures).

The cost increase isn't catastrophic in absolute terms (0.5¢ vs 0.15¢) but **there's no quality return on the investment**. Other places to put that 0.35¢ per repo: prompt caching optimizations, broader stage 1 file selection (so stage 2 sees more context), or simply leaving it as savings.

**Keep stage 1 + stage 2 on `deepseek-chat`.**

---

## 8. Things to test next (if you want to keep iterating)

1. **Re-run with stage 2 v4-pro thinking ON** (default). Worth knowing if the reasoning tokens actually buy accuracy. Will cost ~$0.02–0.04 per repo.
2. **Verify the actual `enable_thinking` parameter name** for v4-pro. Currently we send the flag and it doesn't take effect.
3. **Test stage 1 with thinking explicitly OFF on v4-flash** — currently constant exists but isn't wired. Should give a clean stage-1 baseline at flash pricing.
4. **Compare against `deepseek-reasoner` (R1)** if it's still available — different reasoning style, might produce noticeably more accurate setup steps.
5. **Test with larger repos (50–150 files)** — pro might justify itself on complex codebases where v4-flash gets confused.

---

## 9. Per-repo raw data

See `round-a-metrics.json` and `round-b-metrics.json` for full numerics, and `round-a/*.md` and `round-b/*.md` for full README outputs.

## 10. Talking points for interviews

If asked about this work:

> "I built per-job token + cost telemetry into the worker so I could A/B test DeepSeek models on README quality. Tested `deepseek-v4-flash` (resolved from the legacy `deepseek-chat` alias) against `deepseek-v4-pro` non-thinking on three real repos. v4-pro cost 3.3× more but produced READMEs that were shorter, missed frontend OAuth env vars, and dropped 30–50% of the language/framework badges. I reverted to flash and added the findings to the architecture doc. Key gotchas I documented: (1) the legacy alias and explicit v4-flash behave differently in default thinking mode, (2) `enable_thinking: false` is silently ignored or named wrong on v4-pro — still emits reasoning tokens we pay for as output, (3) reasoning token counts are non-deterministic so cost variance is ±30% on the same input."

That's a tight 60-second answer that signals telemetry instincts, cost discipline, and an honest A/B testing approach.
