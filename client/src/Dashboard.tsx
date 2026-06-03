import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { IconType } from "react-icons";
import ConfirmDialog from "./components/ConfirmDialog";
import { toastError, toastInfo, toastSuccess } from "./lib/toast";
import {
  SiTypescript, SiJavascript, SiPython, SiGo, SiRust, SiOpenjdk, SiKotlin, SiSwift,
  SiC, SiCplusplus, SiSharp, SiPhp, SiRuby, SiDart, SiScala, SiElixir, SiHaskell,
  SiClojure, SiR, SiLua, SiGnubash, SiHtml5, SiMarkdown,
} from "react-icons/si";
import { FaCode, FaCss3Alt } from "react-icons/fa";
import { useUser } from "./hooks/useUser.tsx";
import { useJobStream, type Stage } from "./hooks/useJobStream.tsx";
import { clearDraft, sweepDrafts } from "./lib/draft";
import Navbar from "./components/Navbar";
import Logo from "./components/Logo";

interface Project {
  id: string;
  userId: string;
  repoOwner: string;
  repoName: string;
  displayName: string | null;
  description: string | null;
  language: string | null;
  readmeMarkdown: string | null;
  status: "completed" | "failed";
  errorMessage: string | null;
  prUrl: string | null;
  prNumber: number | null;
  prStatus: "open" | "merged" | "closed" | null;
  createdAt: string;
  updatedAt: string;
}

function PrBadge({ prStatus }: { prStatus: "open" | "merged" | "closed" }) {
  const config: Record<string, { color: string; label: string; icon: string }> = {
    open:   { color: "#aec6ff", label: "PR open",   icon: "fork_right" },
    merged: { color: "#27c93f", label: "Merged",    icon: "check_circle" },
    closed: { color: "#a1a1a1", label: "Closed",    icon: "cancel" },
  };
  const c = config[prStatus];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border whitespace-nowrap"
      style={{ color: c.color, borderColor: `${c.color}40`, backgroundColor: `${c.color}10` }}
    >
      <span className="material-symbols-outlined text-[11px]">{c.icon}</span>
      {c.label}
    </span>
  );
}

const LANGUAGE_ICON: Record<string, { Icon: IconType; color: string }> = {
  TypeScript: { Icon: SiTypescript, color: "#3178c6" },
  JavaScript: { Icon: SiJavascript, color: "#f7df1e" },
  Python:     { Icon: SiPython,     color: "#3776ab" },
  Go:         { Icon: SiGo,         color: "#00add8" },
  Rust:       { Icon: SiRust,       color: "#dea584" },
  Java:       { Icon: SiOpenjdk,    color: "#ed8b00" },
  Kotlin:     { Icon: SiKotlin,     color: "#a97bff" },
  Swift:      { Icon: SiSwift,      color: "#f05138" },
  C:          { Icon: SiC,          color: "#a8b9cc" },
  "C++":      { Icon: SiCplusplus,  color: "#00599c" },
  "C#":       { Icon: SiSharp,      color: "#239120" },
  PHP:        { Icon: SiPhp,        color: "#777bb4" },
  Ruby:       { Icon: SiRuby,       color: "#cc342d" },
  Dart:       { Icon: SiDart,       color: "#0175c2" },
  Scala:      { Icon: SiScala,      color: "#dc322f" },
  Elixir:     { Icon: SiElixir,     color: "#6e4a7e" },
  Haskell:    { Icon: SiHaskell,    color: "#5e5086" },
  Clojure:    { Icon: SiClojure,    color: "#5881d8" },
  R:          { Icon: SiR,          color: "#276dc3" },
  Lua:        { Icon: SiLua,        color: "#2c2d72" },
  Shell:      { Icon: SiGnubash,    color: "#89e051" },
  HTML:       { Icon: SiHtml5,      color: "#e34c26" },
  CSS:        { Icon: FaCss3Alt,    color: "#264de4" },
  Markdown:   { Icon: SiMarkdown,   color: "#a3a3a3" },
};

function LanguageIcon({ language }: { language?: string | null }) {
  const entry = (language && LANGUAGE_ICON[language]) || null;
  const Icon = entry?.Icon ?? FaCode;
  const color = entry?.color ?? "#a1a1a1";
  return (
    <div
      className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border transition-colors"
      style={{
        backgroundColor: `${color}1f`,
        borderColor: `${color}40`,
        color,
      }}
      title={language ?? "Unknown language"}
    >
      <Icon size={18} />
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const week = Math.floor(day / 7);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);
  if (sec < 60)  return "just now";
  if (min < 60)  return `${min} minute${min > 1 ? "s" : ""} ago`;
  if (hr < 24)   return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  if (day < 7)   return `${day} day${day > 1 ? "s" : ""} ago`;
  if (week < 5)  return `${week} week${week > 1 ? "s" : ""} ago`;
  if (month < 12) return `${month} month${month > 1 ? "s" : ""} ago`;
  return `${year} year${year > 1 ? "s" : ""} ago`;
}

function regenerateTitle(p: Project): string {
  return p.status === "failed" ? "Retry generation?" : "Regenerate README?";
}

function regenerateConfirmLabel(p: Project): string {
  return p.status === "failed" ? "Retry" : "Regenerate";
}

function ProjectPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-white">{children}</span>
  );
}

function PrPill({ number }: { number: number | null }) {
  return (
    <span className="font-mono text-[#aec6ff] bg-[#aec6ff]/10 border border-[#aec6ff]/20 px-1.5 py-0.5 rounded text-[11px] align-baseline">
      #{number}
    </span>
  );
}

function Warn({ tone = "amber", children }: { tone?: "amber" | "red"; children: React.ReactNode }) {
  const color = tone === "red" ? "#ffb4ab" : "#ffbd2e";
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5"
      style={{
        color: `${color}E6`,
        borderColor: `${color}40`,
        backgroundColor: `${color}0D`,
      }}
    >
      <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5" style={{ color }}>
        warning
      </span>
      <div className="text-[12.5px] leading-relaxed text-white/75">{children}</div>
    </div>
  );
}

function regenerateMessage(p: Project): React.ReactNode {
  const name = p.displayName ?? p.repoName;

  if (p.status === "failed") {
    return (
      <p>
        <ProjectPill>{name}</ProjectPill> will be re-queued for analysis. The failed entry is replaced
        with a fresh attempt — nothing on GitHub is affected.
      </p>
    );
  }

  if (!p.prUrl) {
    return (
      <p>
        <ProjectPill>{name}</ProjectPill> will be re-analyzed from scratch and a new README will
        replace the current one in this dashboard. Nothing on GitHub is touched.
      </p>
    );
  }

  if (p.prStatus === "merged") {
    return (
      <>
        <p>
          <ProjectPill>{name}</ProjectPill> will be re-analyzed and a fresh README generated in this
          dashboard.
        </p>
        <Warn tone="red">
          Pull request <PrPill number={p.prNumber} /> is already <span className="font-semibold text-[#27c93f]">merged</span> on
          GitHub's default branch — regenerating here does <span className="font-semibold">not</span> undo
          that. The committed README on <span className="font-mono text-white/90">main</span> stays as-is.
          To actually replace what's on the default branch, you'd need to submit and merge a new PR.
        </Warn>
      </>
    );
  }

  return (
    <>
      <p>
        <ProjectPill>{name}</ProjectPill> will be re-analyzed and a fresh README generated in this
        dashboard.
      </p>
      <Warn>
        Pull request <PrPill number={p.prNumber} /> stays on GitHub (currently{" "}
        <span className="font-semibold text-white/90">{p.prStatus ?? "open"}</span>) but this
        dashboard entry will stop linking to it — you'll get a new project to review and, if you
        want, submit a fresh PR.
      </Warn>
    </>
  );
}

const API = "http://localhost:3000";

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API}/api/dashboard/projects`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? "We couldn't load your projects.");
  }
  const data = await res.json();
  return data.projects;
}

const STAGE_TEXT: Record<Stage, string> = {
  queued:     "Queued",
  analyzing:  "Analyzing repository…",
  generating: "Generating README…",
  completed:  "Ready",
  failed:     "Failed",
  rejected:   "Rejected",
};

function StagePill({ stage, error }: { stage: Stage; error?: string | null }) {
  if (stage === "completed") {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]"></span>
        <span className="font-medium text-white/80">Ready</span>
      </div>
    );
  }
  if (stage === "failed") {
    return (
      <div className="flex items-center gap-2 text-[#ffb4ab]" title={error ?? undefined}>
        <span className="material-symbols-outlined text-[14px]">error</span>
        <span className="font-medium">Failed</span>
      </div>
    );
  }
  if (stage === "queued") {
    return (
      <div className="flex items-center gap-2 text-white/60">
        <span className="w-2 h-2 rounded-full bg-white/40"></span>
        <span className="font-medium">Queued</span>
      </div>
    );
  }
  // analyzing | generating
  const color = stage === "analyzing" ? "#aec6ff" : "#27c93f";
  return (
    <div className="flex items-center gap-2" style={{ color }}>
      <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
      <span className="font-medium">{STAGE_TEXT[stage]}</span>
    </div>
  );
}

interface CardProps {
  title: string;
  subtitle: string;
  description: string;
  language?: string | null;
  stage: Stage;
  createdAt?: string | null;
  errorMessage?: string | null;
  prStatus?: "open" | "merged" | "closed" | null;
  onClick?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
}

function ProjectCard({ title, subtitle, description, language, stage, createdAt, errorMessage, prStatus, onClick, onDelete, onRetry }: CardProps) {
  const borderHover = stage === "failed" ? "hover:border-[#ffb4ab]/30" : "hover:border-white/25";
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`group bg-[#0d1117] rounded-xl border border-white/10 ${borderHover} transition-all duration-300 flex flex-col min-h-44 sm:h-48 relative overflow-hidden ${clickable ? "cursor-pointer" : "cursor-default"}`}
    >
      {(onDelete || onRetry) && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-[#0d1117]/80 border border-white/10 text-white/60 hover:text-[#aec6ff] hover:border-[#aec6ff]/40 transition-colors backdrop-blur-sm"
              title="Retry"
              aria-label="Retry"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-[#0d1117]/80 border border-white/10 text-white/60 hover:text-[#ffb4ab] hover:border-[#ffb4ab]/40 transition-colors backdrop-blur-sm"
              title="Delete"
              aria-label="Delete"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
            </button>
          )}
        </div>
      )}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none"></div>
      <div className="p-5 sm:p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <LanguageIcon language={language} />
            <div className="min-w-0">
              <h3 className="font-bold text-white tracking-tight truncate text-sm sm:text-base leading-tight">
                {title}
              </h3>
              <p className="text-[11px] sm:text-xs text-white/40 font-mono truncate">{subtitle}</p>
            </div>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#a1a1a1] font-light flex-grow mt-2 line-clamp-2">
          {description}
        </p>
      </div>
      <div className="px-5 sm:px-6 py-3 sm:py-4 border-t border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[11px] sm:text-xs text-white/50">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <StagePill stage={stage} error={errorMessage} />
          {prStatus && <PrBadge prStatus={prStatus} />}
        </div>
        {createdAt && (
          <div className="flex items-center gap-1 font-mono text-white/40 shrink-0 whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span className="hidden sm:inline">{timeAgo(createdAt)}</span>
            <span className="sm:hidden">{timeAgo(createdAt).replace(" ago", "")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { data: user, isLoading } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { active } = useJobStream();

  const projectsQuery = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: !!user,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [confirm, setConfirm] = useState<{
    kind: "delete" | "retry";
    project: Project;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Sweep stale localStorage drafts: orphans (project gone), locked (prUrl set),
  // and expired (>5 days). Runs whenever the projects list refetches — cheap + idempotent.
  useEffect(() => {
    if (!projectsQuery.data) return;
    sweepDrafts(projectsQuery.data);
  }, [projectsQuery.data]);

  const runDelete = async (project: Project) => {
    setConfirmBusy(true);
    try {
      const res = await fetch(`${API}/api/projects/${project.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Delete failed");
      }
      clearDraft(project.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toastSuccess("Deleted", `${project.displayName ?? project.repoName} removed.`);
      setConfirm(null);
    } catch (err: unknown) {
      toastError("Couldn't delete", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setConfirmBusy(false);
    }
  };

  const runRetry = async (project: Project) => {
    setConfirmBusy(true);
    try {
      const res = await fetch(`${API}/api/projects/${project.id}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Retry failed");
      }
      // Retry mints a new project ID (see architecture §4.16) — the old draft is orphaned.
      clearDraft(project.id);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const name = project.displayName ?? project.repoName;
      if (project.status === "failed") {
        toastInfo("Re-queued", `${name} is back in the queue.`);
      } else {
        toastInfo("Regenerating", `${name} will be re-analyzed.`);
      }
      setConfirm(null);
    } catch (err: unknown) {
      toastError("Couldn't retry", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setConfirmBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center font-sans antialiased text-[#e2e2e2] selection:bg-[#27c93f] selection:text-black">
        <div className="flex flex-col items-center gap-8 translate-y-[-10%]">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="w-full h-full rounded-full border-[3px] border-white/5 border-t-[#27c93f]/80 animate-[spin_1s_cubic-bezier(0.5,0,0.5,1)_infinite] absolute"></div>
            <div className="w-14 h-14 rounded-full border-[3px] border-white/5 border-b-white/30 animate-[spin_1.5s_linear_infinite_reverse] absolute"></div>
            <span
              className="text-3xl font-mono leading-none text-[#27c93f] z-10 animate-pulse"
              style={{ textShadow: "0 0 18px rgba(39,201,63,0.35)" }}
            >
              ❯
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Logo size="sm" />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#27c93f] rounded-full animate-pulse shadow-[0_0_8px_#27c93f]"></span>
              <p className="text-white/40 text-xs font-mono">
                Synchronizing workspace...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const term = searchTerm.toLowerCase();
  const filteredActive = active.filter((j) =>
    (j.displayName ?? j.repoName).toLowerCase().includes(term) ||
    `${j.repoOwner}/${j.repoName}`.toLowerCase().includes(term)
  );
  const filteredProjects = (projectsQuery.data ?? []).filter((p) =>
    (p.displayName ?? p.repoName).toLowerCase().includes(term) ||
    `${p.repoOwner}/${p.repoName}`.toLowerCase().includes(term)
  );

  const hasAny = filteredActive.length > 0 || filteredProjects.length > 0;

  return (
    <>
      <style>{`
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
      <div className="bg-[#000000] text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased overflow-x-hidden min-h-screen flex flex-col">
        <Navbar user={user ?? null} />

        <main className="flex-grow pt-6 sm:pt-10 lg:pt-12 pb-12 sm:pb-16 lg:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="relative w-full sm:w-[280px] md:w-[320px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0d1117] border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#27c93f]/40 focus:border-[#27c93f]/40 block pl-10 p-2.5 transition-all placeholder-white/30"
                />
              </div>

              <button onClick={() => navigate('/listrepos')} className="bg-white text-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-95 text-sm whitespace-nowrap shadow-[0_0_20px_rgba(39,201,63,0.18)]">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add New
              </button>
            </div>

            {projectsQuery.isError && (
              <div className="bg-[#0d1117] border border-[#ffb4ab]/30 rounded-xl py-10 sm:py-12 px-4 flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#ffb4ab]/10 flex items-center justify-center text-[#ffb4ab] mb-4">
                  <span className="material-symbols-outlined text-[24px]">cloud_off</span>
                </div>
                <p className="text-sm font-medium text-white">Couldn't load your projects</p>
                <p className="text-xs text-white/50 mt-1 max-w-sm">
                  {projectsQuery.error?.message ?? "Something went wrong on our end."}
                </p>
                <button
                  onClick={() => projectsQuery.refetch()}
                  disabled={projectsQuery.isFetching}
                  className="mt-5 bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span className={`material-symbols-outlined text-[15px] ${projectsQuery.isFetching ? "animate-spin" : ""}`}>refresh</span>
                  {projectsQuery.isFetching ? "Retrying…" : "Try again"}
                </button>
              </div>
            )}

            {!hasAny && !projectsQuery.isLoading && !projectsQuery.isError && (
              <div className="bg-[#0d1117] border border-white/10 rounded-xl py-12 sm:py-16 px-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30 mb-4">
                  <span className="material-symbols-outlined text-[24px]">folder_open</span>
                </div>
                <p className="text-sm font-medium text-white">No projects yet</p>
                <p className="text-xs text-white/40 mt-1">Import a repository to generate your first README.</p>
              </div>
            )}

            {filteredActive.length > 0 && (
              <section className="mb-8 sm:mb-10">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#aec6ff] animate-pulse shadow-[0_0_8px_#aec6ff]"></span>
                  <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                    In progress
                  </h2>
                  <span className="text-[11px] sm:text-xs text-white/30 font-mono">
                    {filteredActive.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredActive.map((j) => (
                    <ProjectCard
                      key={j.jobId}
                      title={j.displayName || j.repoName}
                      subtitle={`${j.repoOwner}/${j.repoName}`}
                      description={j.shortDescription || "Awaiting analysis…"}
                      language={j.language}
                      stage={j.stage}
                      errorMessage={j.errorMessage}
                    />
                  ))}
                </div>
              </section>
            )}

            {filteredProjects.length > 0 && (
              <section>
                {filteredActive.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                    <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                      Projects
                    </h2>
                    <span className="text-[11px] sm:text-xs text-white/30 font-mono">
                      {filteredProjects.length}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProjects.map((p) => {
                    let onCardClick: (() => void) | undefined;
                    if (p.status === "completed") {
                      onCardClick = p.prUrl
                        ? () => window.open(p.prUrl!, "_blank", "noreferrer")
                        : () => navigate(`/project/${p.id}`);
                    }
                    return (
                      <ProjectCard
                        key={p.id}
                        title={p.displayName || p.repoName}
                        subtitle={`${p.repoOwner}/${p.repoName}`}
                        description={p.description || p.errorMessage || "—"}
                        language={p.language}
                        stage={p.status}
                        createdAt={p.createdAt}
                        errorMessage={p.errorMessage}
                        prStatus={p.prStatus}
                        onClick={onCardClick}
                        onDelete={() => setConfirm({ kind: "delete", project: p })}
                        onRetry={() => setConfirm({ kind: "retry", project: p })}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </main>

        <ConfirmDialog
          open={!!confirm}
          busy={confirmBusy}
          destructive={confirm?.kind === "delete"}
          title={
            confirm?.kind === "delete"
              ? "Delete project?"
              : confirm?.kind === "retry"
              ? regenerateTitle(confirm.project)
              : ""
          }
          message={
            confirm?.kind === "delete" ? (
              <p>
                <ProjectPill>{confirm.project.displayName ?? confirm.project.repoName}</ProjectPill>{" "}
                will be removed from your dashboard. Any PR you created on GitHub remains untouched.
              </p>
            ) : confirm?.kind === "retry" ? (
              regenerateMessage(confirm.project)
            ) : (
              ""
            )
          }
          confirmLabel={
            confirm?.kind === "delete"
              ? "Delete"
              : confirm?.kind === "retry"
              ? regenerateConfirmLabel(confirm.project)
              : "Confirm"
          }
          onCancel={() => !confirmBusy && setConfirm(null)}
          onConfirm={() => {
            if (!confirm) return;
            if (confirm.kind === "delete") runDelete(confirm.project);
            else runRetry(confirm.project);
          }}
        />

        <footer className="w-full border-t border-white/5 bg-black mt-auto">
          <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
            <Logo size="sm" className="opacity-60" />
            <div className="flex gap-4 sm:gap-6">
              <a className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors" href="#">
                Support
              </a>
              <a className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors" href="#">
                Docs
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Dashboard;
