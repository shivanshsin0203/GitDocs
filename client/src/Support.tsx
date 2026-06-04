import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "./hooks/useUser.tsx";
import { toastInfo } from "./lib/toast";
import Navbar from "./components/Navbar";
import Logo from "./components/Logo";

const GH_USERNAME    = "shivanshsin0203";
const X_USERNAME     = "ShivanshSi0203";
const LINKEDIN_SLUG  = "shivansh-singh-736521289";

const GH_URL       = `https://github.com/${GH_USERNAME}`;
const X_URL        = `https://x.com/${X_USERNAME}`;
const LINKEDIN_URL = `https://www.linkedin.com/in/${LINKEDIN_SLUG}/`;

const STACK = [
  { label: "TypeScript", color: "#3178c6" },
  { label: "React",      color: "#61dafb" },
  { label: "Node.js",    color: "#3c873a" },
  { label: "Express",    color: "#e2e2e2" },
  { label: "Drizzle",    color: "#c5f74f" },
  { label: "BullMQ",     color: "#ff6b6b" },
  { label: "Redis",      color: "#dc382d" },
  { label: "Postgres",   color: "#336791" },
  { label: "Tailwind",   color: "#38bdf8" },
];

const TERMINAL_LINES = [
  { prompt: "whoami",         output: "shivansh singh — full-stack engineer · indie hacker" },
  { prompt: "uname -s",       output: "builder · making things on the internet" },
  { prompt: "cat contact.md", output: "best reached on 𝕏 — see the card below" },
];

type TypedLine = {
  prompt: string;
  output: string;
  promptDone: boolean;
  outputDone: boolean;
  promptShown: string;
  outputShown: string;
};

function useTypewriter(lines: typeof TERMINAL_LINES, speed = 22) {
  const [state, setState] = useState<TypedLine[]>(() =>
    lines.map((l) => ({
      ...l,
      promptDone: false,
      outputDone: false,
      promptShown: "",
      outputShown: "",
    })),
  );

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const advance = (lineIdx: number, target: "prompt" | "output", charIdx: number) => {
      if (cancelled) return;
      const fullLines = lines;
      if (lineIdx >= fullLines.length) return;
      const text = target === "prompt" ? fullLines[lineIdx].prompt : fullLines[lineIdx].output;

      if (charIdx > text.length) {
        // line + phase done
        setState((prev) => {
          const next = [...prev];
          if (target === "prompt") next[lineIdx] = { ...next[lineIdx], promptDone: true };
          else                     next[lineIdx] = { ...next[lineIdx], outputDone: true };
          return next;
        });
        // jump to output of same line, or prompt of next line
        if (target === "prompt") {
          timer = window.setTimeout(() => advance(lineIdx, "output", 0), 120);
        } else {
          timer = window.setTimeout(() => advance(lineIdx + 1, "prompt", 0), 250);
        }
        return;
      }

      setState((prev) => {
        const next = [...prev];
        if (target === "prompt") {
          next[lineIdx] = { ...next[lineIdx], promptShown: text.slice(0, charIdx) };
        } else {
          next[lineIdx] = { ...next[lineIdx], outputShown: text.slice(0, charIdx) };
        }
        return next;
      });
      timer = window.setTimeout(() => advance(lineIdx, target, charIdx + 1), speed);
    };

    advance(0, "prompt", 0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [lines, speed]);

  return state;
}

function TerminalIntro() {
  const lines = useTypewriter(TERMINAL_LINES);
  const allDone = lines.every((l) => l.outputDone);

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
        </div>
        <div className="text-[10px] text-white/30 font-mono">~ /shivansh — bash</div>
      </div>
      {/* Body */}
      <div className="p-5 sm:p-6 font-mono text-[13px] sm:text-[14px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className="mb-2">
            <div className="text-white/90">
              <span className="text-[#27c93f]" style={{ textShadow: "0 0 12px rgba(39,201,63,0.35)" }}>❯ </span>
              <span>{l.promptShown}</span>
              {!l.promptDone && <span className="inline-block w-[7px] h-[14px] -mb-[2px] bg-[#27c93f] animate-pulse ml-[1px]" />}
            </div>
            {(l.promptDone || l.outputShown.length > 0) && (
              <div className="text-white/60 pl-4">{l.outputShown}</div>
            )}
          </div>
        ))}
        {allDone && (
          <div className="text-white/90">
            <span className="text-[#27c93f]">❯ </span>
            <span className="inline-block w-[7px] h-[14px] -mb-[2px] bg-[#27c93f] animate-pulse ml-[1px]" />
          </div>
        )}
      </div>
    </div>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  // 𝕏 lockup — clean glyph, no brand asset dependency
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.04 11.04 0 015.78 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .31.21.67.79.56C20.21 21.39 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.27 2.38 4.27 5.47v6.27zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function HeroXCard() {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noreferrer"
      className="group relative block bg-[#0d1117] border border-[#27c93f]/40 rounded-xl overflow-hidden transition-all hover:border-[#27c93f] hover:-translate-y-[2px]"
      style={{ boxShadow: "0 0 40px rgba(39,201,63,0.15), inset 0 0 0 1px rgba(39,201,63,0.08)" }}
    >
      {/* Pulsing border ring */}
      <div className="absolute inset-0 rounded-xl pointer-events-none border border-[#27c93f]/0 group-hover:border-[#27c93f]/30 transition-colors" />
      <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#27c93f]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#27c93f] animate-pulse shadow-[0_0_8px_#27c93f]" />
        main channel
      </div>
      <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-black border border-white/10"
          style={{ boxShadow: "0 0 30px rgba(39,201,63,0.25)" }}
        >
          <XIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <div className="flex-grow min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            @{X_USERNAME}
          </h2>
          <p className="text-sm text-white/60 mt-1.5 font-mono">
            where i actually post — dms open
          </p>
        </div>
        <div className="flex items-center gap-2 text-[#27c93f] font-mono text-sm font-bold uppercase tracking-[0.2em] shrink-0">
          <span>open</span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
      </div>
    </a>
  );
}

interface SecondaryCardProps {
  href: string;
  label: string;
  handle: string;
  Icon: ({ className }: { className?: string }) => React.JSX.Element;
  accent: string;
}

function SecondaryCard({ href, label, handle, Icon, accent }: SecondaryCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group bg-[#0d1117] border border-white/10 rounded-xl p-5 sm:p-6 flex items-center gap-4 hover:border-white/25 hover:-translate-y-[2px] transition-all"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center border transition-colors"
        style={{
          backgroundColor: `${accent}10`,
          borderColor: `${accent}40`,
          color: accent,
        }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">
          {label}
        </p>
        <p className="text-sm font-bold text-white truncate mt-0.5">{handle}</p>
      </div>
      <span className="material-symbols-outlined text-[18px] text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all">
        arrow_outward
      </span>
    </a>
  );
}

function StackChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {STACK.map((s) => (
        <span
          key={s.label}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono font-medium border bg-[#0d1117]"
          style={{ color: s.color, borderColor: `${s.color}40` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ prompt }: { prompt: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 font-mono text-[11px] sm:text-xs">
      <span className="text-[#27c93f]" style={{ textShadow: "0 0 8px rgba(39,201,63,0.4)" }}>❯</span>
      <span className="text-white/40 uppercase tracking-[0.2em]">{prompt}</span>
    </div>
  );
}

interface GhRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

const REPOS_URL = `https://api.github.com/users/${GH_USERNAME}/repos?sort=pushed&per_page=12`;

// Minimal language color map covering most common langs. Falls back to neutral grey.
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python:     "#3572A5",
  Go:         "#00ADD8",
  Rust:       "#dea584",
  Java:       "#b07219",
  Kotlin:     "#A97BFF",
  Swift:      "#F05138",
  "C++":      "#f34b7d",
  C:          "#555555",
  "C#":       "#178600",
  Ruby:       "#701516",
  PHP:        "#4F5D95",
  HTML:       "#e34c26",
  CSS:        "#563d7c",
  Shell:      "#89e051",
  Vue:        "#41b883",
  Svelte:     "#ff3e00",
  Dart:       "#00B4AB",
};

function RecentRepos() {
  const [repos, setRepos] = useState<GhRepo[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(REPOS_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: GhRepo[]) => {
        if (cancelled) return;
        const filtered = Array.isArray(data)
          ? data.filter((r) => !r.fork && !r.archived).slice(0, 6)
          : [];
        setRepos(filtered);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (errored) {
    return (
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5 sm:p-6">
        <p className="text-white/40 text-xs font-mono">
          github is rate-limiting · browse repos on{" "}
          <a href={GH_URL} target="_blank" rel="noreferrer" className="underline text-[#27c93f]">
            github
          </a>
        </p>
      </div>
    );
  }

  if (repos === null) {
    return (
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5 sm:p-6">
        <p className="text-white/30 text-xs font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
          fetching repos…
        </p>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5 sm:p-6">
        <p className="text-white/40 text-xs font-mono">no public repos yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {repos.map((r) => {
        const langColor = (r.language && LANG_COLORS[r.language]) ?? "#8b949e";
        return (
          <a
            key={r.id}
            href={r.html_url}
            target="_blank"
            rel="noreferrer"
            className="group bg-[#0d1117] border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col gap-3 hover:border-white/25 hover:-translate-y-[2px] transition-all min-h-[140px]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[16px] text-white/40">book_2</span>
                <span className="font-mono text-sm text-white font-bold truncate">{r.name}</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0">
                arrow_outward
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed line-clamp-2 flex-grow">
              {r.description ?? "no description"}
            </p>
            <div className="flex items-center gap-4 text-[11px] font-mono text-white/40 mt-auto">
              {r.language && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
                  {r.language}
                </span>
              )}
              {r.stargazers_count > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">star</span>
                  {r.stargazers_count}
                </span>
              )}
              {r.forks_count > 0 && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">fork_right</span>
                  {r.forks_count}
                </span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}

interface GhEvent {
  id: string;
  type: string;
  repo: { name: string; url: string };
  created_at: string;
  payload: {
    commits?: { message: string; sha: string }[];
    ref?: string;
    ref_type?: string;
    action?: string;
    pull_request?: { html_url: string; title: string; number: number };
    issue?: { html_url: string; title: string; number: number };
    forkee?: { html_url: string; full_name: string };
  };
}

const EVENTS_URL = `https://api.github.com/users/${GH_USERNAME}/events/public?per_page=15`;

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60)  return `${sec}s`;
  if (min < 60)  return `${min}m`;
  if (hr < 24)   return `${hr}h`;
  if (day < 30)  return `${day}d`;
  const mo = Math.floor(day / 30);
  if (mo < 12)   return `${mo}mo`;
  return `${Math.floor(day / 365)}y`;
}

interface RenderedEvent {
  glyph: string;
  glyphColor: string;
  verb: string;
  detail: React.ReactNode;
  href: string;
}

function renderEvent(e: GhEvent): RenderedEvent | null {
  const repoHref = `https://github.com/${e.repo.name}`;
  const branch = e.payload.ref?.replace("refs/heads/", "") ?? "";
  switch (e.type) {
    case "PushEvent": {
      const n = e.payload.commits?.length ?? 0;
      return {
        glyph: "↑",
        glyphColor: "#27c93f",
        verb: "push",
        detail: (
          <>
            <span className="text-white/40">{n} commit{n === 1 ? "" : "s"} to </span>
            <span className="text-white">{e.repo.name}</span>
            {branch && <span className="text-white/40">/{branch}</span>}
          </>
        ),
        href: repoHref,
      };
    }
    case "CreateEvent": {
      const kind = e.payload.ref_type ?? "ref";
      return {
        glyph: "⊕",
        glyphColor: "#aec6ff",
        verb: "create",
        detail: (
          <>
            <span className="text-white/40">{kind} </span>
            <span className="text-white">{e.repo.name}</span>
            {e.payload.ref && <span className="text-white/40">/{e.payload.ref}</span>}
          </>
        ),
        href: repoHref,
      };
    }
    case "WatchEvent": {
      return {
        glyph: "★",
        glyphColor: "#ffd479",
        verb: "star",
        detail: <span className="text-white">{e.repo.name}</span>,
        href: repoHref,
      };
    }
    case "ForkEvent": {
      return {
        glyph: "⑂",
        glyphColor: "#aec6ff",
        verb: "fork",
        detail: <span className="text-white">{e.repo.name}</span>,
        href: e.payload.forkee?.html_url ?? repoHref,
      };
    }
    case "PullRequestEvent": {
      const action = e.payload.action ?? "opened";
      return {
        glyph: "⇄",
        glyphColor: "#dbb8ff",
        verb: `pr ${action}`,
        detail: (
          <>
            <span className="text-white/40">#{e.payload.pull_request?.number} </span>
            <span className="text-white">{e.payload.pull_request?.title ?? e.repo.name}</span>
          </>
        ),
        href: e.payload.pull_request?.html_url ?? repoHref,
      };
    }
    case "IssuesEvent": {
      const action = e.payload.action ?? "opened";
      return {
        glyph: "◎",
        glyphColor: "#ffb4ab",
        verb: `issue ${action}`,
        detail: (
          <>
            <span className="text-white/40">#{e.payload.issue?.number} </span>
            <span className="text-white">{e.payload.issue?.title ?? e.repo.name}</span>
          </>
        ),
        href: e.payload.issue?.html_url ?? repoHref,
      };
    }
    case "IssueCommentEvent":
    case "PullRequestReviewCommentEvent": {
      return {
        glyph: "💬",
        glyphColor: "#aec6ff",
        verb: "comment",
        detail: <span className="text-white">{e.repo.name}</span>,
        href: repoHref,
      };
    }
    case "ReleaseEvent": {
      return {
        glyph: "⬢",
        glyphColor: "#27c93f",
        verb: "release",
        detail: <span className="text-white">{e.repo.name}</span>,
        href: repoHref,
      };
    }
    case "PublicEvent": {
      return {
        glyph: "◯",
        glyphColor: "#27c93f",
        verb: "open-source",
        detail: <span className="text-white">{e.repo.name}</span>,
        href: repoHref,
      };
    }
    default:
      return null; // skip noisy/rare events
  }
}

function ActivityLog() {
  const [events, setEvents] = useState<GhEvent[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(EVENTS_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: GhEvent[]) => {
        if (cancelled) return;
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => { cancelled = true; };
  }, []);

  const rendered = useMemo(() => {
    if (!events) return null;
    const out: { e: GhEvent; r: RenderedEvent }[] = [];
    for (const e of events) {
      const r = renderEvent(e);
      if (r) out.push({ e, r });
      if (out.length >= 8) break;
    }
    return out;
  }, [events]);

  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
        </div>
        <div className="text-[10px] text-white/30 font-mono">git log --author={GH_USERNAME} --all</div>
      </div>
      {/* Body */}
      <div className="p-4 sm:p-5 font-mono text-[12px] sm:text-[13px] leading-relaxed">
        {errored && (
          <p className="text-white/40">
            github is rate-limiting · view activity on{" "}
            <a href={GH_URL} target="_blank" rel="noreferrer" className="underline text-[#27c93f]">
              github
            </a>
          </p>
        )}
        {!errored && rendered === null && (
          <p className="text-white/30 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
            tailing log…
          </p>
        )}
        {!errored && rendered && rendered.length === 0 && (
          <p className="text-white/40">no recent public activity</p>
        )}
        {rendered && rendered.map(({ e, r }) => (
          <a
            key={e.id}
            href={r.href}
            target="_blank"
            rel="noreferrer"
            className="group grid grid-cols-[auto_auto_auto_1fr] items-center gap-x-3 py-1 hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors"
          >
            <span className="text-white/30 tabular-nums w-10 text-right">
              {timeAgoShort(e.created_at)}
            </span>
            <span
              className="w-4 text-center text-[14px] font-bold"
              style={{ color: r.glyphColor, textShadow: `0 0 6px ${r.glyphColor}55` }}
            >
              {r.glyph}
            </span>
            <span className="text-white/70 uppercase tracking-wider text-[10px] sm:text-[11px] w-20 sm:w-24 truncate">
              {r.verb}
            </span>
            <span className="truncate text-[12px] sm:text-[13px]">{r.detail}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// Build up a keystroke buffer for the `help` easter egg. Bail when the user
// is typing into a form field so we don't steal their input.
function useEasterEgg() {
  const buffer = useRef("");
  const fired = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.key.length !== 1) return;

      buffer.current = (buffer.current + e.key.toLowerCase()).slice(-8);
      if (!fired.current && buffer.current.endsWith("help")) {
        fired.current = true;
        toastInfo(
          "available commands",
          "whoami · contact · stack · heatmap · exit",
        );
        // Allow re-triggering after a brief cooldown
        window.setTimeout(() => { fired.current = false; }, 4000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const Support = () => {
  const { data: user } = useUser();
  const navigate = useNavigate();
  useEasterEgg();

  // Tiny hint that the page has a hidden command
  const hint = useMemo(
    () => `try typing "help" anywhere · gitdocs/support`,
    [],
  );

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
      <div className="bg-[#000000] text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased min-h-screen flex flex-col">
        <Navbar user={user ?? null} />

        <main className="flex-grow pt-8 sm:pt-12 pb-12 sm:pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-white/30 mb-3">
                <span className="material-symbols-outlined text-[14px]">terminal</span>
                <span className="uppercase tracking-[0.2em]">support · about the maker</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter leading-[1.05]">
                Hey, I’m <span className="text-[#27c93f]" style={{ textShadow: "0 0 30px rgba(39,201,63,0.4)" }}>Shivansh</span>.
              </h1>
              <p className="text-sm sm:text-base text-white/50 mt-3 max-w-xl">
                Solo dev behind GitDocs. If something’s broken or you just want to say hi,
                pick a channel below — DMs on 𝕏 get the fastest reply.
              </p>
            </div>

            {/* Terminal intro */}
            <TerminalIntro />

            {/* Find me — all channels treated equal; X is just bigger because I live there */}
            <section>
              <SectionLabel prompt="ls socials/" />
              <div className="space-y-4">
                <HeroXCard />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SecondaryCard
                    href={GH_URL}
                    label="github"
                    handle={`@${GH_USERNAME}`}
                    Icon={GitHubIcon}
                    accent="#e2e2e2"
                  />
                  <SecondaryCard
                    href={LINKEDIN_URL}
                    label="linkedin"
                    handle="shivansh-singh"
                    Icon={LinkedInIcon}
                    accent="#0a66c2"
                  />
                </div>
              </div>
            </section>

            {/* Most recently pushed repos — live from GitHub, excludes forks/archives */}
            <section>
              <SectionLabel prompt={`git --recent ${GH_USERNAME}`} />
              <RecentRepos />
            </section>

            {/* Stack */}
            <section>
              <SectionLabel prompt="ls stack/" />
              <StackChips />
            </section>

            {/* Live activity feed — recent public GitHub events */}
            <section>
              <SectionLabel prompt={`tail -f /github/${GH_USERNAME}.log`} />
              <ActivityLog />
            </section>

            {/* Back to dashboard */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-[10px] font-mono text-white/30 tracking-wider">{hint}</p>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-xs font-mono text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                back to dashboard
              </button>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-white/5 bg-black mt-auto">
          <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
            <Logo size="sm" className="opacity-60" />
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
              made with <span className="text-[#ff6b6b]">♥</span> by @{X_USERNAME}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Support;
