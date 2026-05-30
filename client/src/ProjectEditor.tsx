import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { useUser } from "./hooks/useUser.tsx";
import { useViewport } from "./hooks/useViewport.tsx";
import Navbar from "./components/Navbar";
import Logo from "./components/Logo";
import MarkdownPreview from "./components/MarkdownPreview";
import SubmitPRModal from "./components/SubmitPRModal";
import {
  acceptImageFiles,
  altFromFilename,
  formatBytes,
  MAX_IMAGE_BYTES,
} from "./lib/attach";

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
  prCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const API = "http://localhost:3000";
const DRAFT_PREFIX = "gitdocs:draft:";
const DRAFT_DEBOUNCE_MS = 500;

async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`${API}/api/projects/${id}`, { credentials: "include" });
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("Failed to fetch project");
  const data = await res.json();
  return data.project;
}

function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans antialiased text-[#e2e2e2]">
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
            <p className="text-white/40 text-xs font-mono">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const EDITOR_OVERRIDES = `
.w-md-editor.gh-editor {
  background-color: #0d1117;
  color: #e6edf3;
  box-shadow: none;
  border: none;
}
.w-md-editor.gh-editor .w-md-editor-text {
  background-color: #0d1117;
}
.w-md-editor.gh-editor .w-md-editor-text-pre > code,
.w-md-editor.gh-editor .w-md-editor-text-input {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  color: #e6edf3 !important;
  caret-color: #27c93f !important;
}
.w-md-editor.gh-editor .w-md-editor-toolbar {
  background-color: #161b22;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.w-md-editor.gh-editor .w-md-editor-toolbar ul > li > button {
  color: rgba(255,255,255,0.6);
}
.w-md-editor.gh-editor .w-md-editor-toolbar ul > li > button:hover {
  background-color: rgba(255,255,255,0.05);
  color: white;
}
.w-md-editor.gh-editor .w-md-editor-toolbar-divider {
  background-color: rgba(255,255,255,0.06);
}
`;

function toastError(title: string, subtitle: string) {
  toast(
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] mt-0.5">error</span>
      <div className="flex flex-col">
        <span className="font-bold text-white text-sm tracking-wide">{title}</span>
        <span className="text-white/50 text-xs mt-1">{subtitle}</span>
      </div>
    </div>
  );
}

function toastSuccess(title: string, body: React.ReactNode) {
  toast(
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[#27c93f] text-[20px] mt-0.5">check_circle</span>
      <div className="flex flex-col">
        <span className="font-bold text-white text-sm tracking-wide">{title}</span>
        <span className="text-white/60 text-xs mt-1">{body}</span>
      </div>
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("read failed"));
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

const ProjectEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useUser();

  const projectQuery = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id!),
    enabled: !!user && !!id,
    retry: false,
  });

  const viewport = useViewport();
  const queryClient = useQueryClient();
  const [markdown, setMarkdown] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [paneMode, setPaneMode] = useState<"edit" | "preview" | "split">("split");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [winHeight, setWinHeight] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight : 900,
  );

  // Track viewport height for full-bleed pane sizing
  useEffect(() => {
    const onResize = () => setWinHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Default pane mode per viewport — only set when viewport changes
  useEffect(() => {
    if (viewport === "mobile") setPaneMode("edit");
    else setPaneMode("split");
  }, [viewport]);

  // Image attachment state
  const [images, setImages] = useState<Map<string, File>>(new Map());
  const [objectUrls, setObjectUrls] = useState<Map<string, string>>(new Map());
  const [dragDepth, setDragDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorBodyRef = useRef<HTMLDivElement | null>(null);

  const totalImageBytes = useMemo(() => {
    let total = 0;
    for (const f of images.values()) total += f.size;
    return total;
  }, [images]);

  // Sync objectUrls with images: create new URLs, revoke removed ones
  useEffect(() => {
    setObjectUrls((prev) => {
      const next = new Map<string, string>();
      // keep existing URLs for paths still present
      for (const [path, url] of prev) {
        if (images.has(path)) next.set(path, url);
        else URL.revokeObjectURL(url);
      }
      // mint URLs for new paths
      for (const [path, file] of images) {
        if (!next.has(path)) next.set(path, URL.createObjectURL(file));
      }
      return next;
    });
  }, [images]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of objectUrls.values()) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate from project + localStorage draft (draft wins if present)
  useEffect(() => {
    if (!projectQuery.data || hydrated) return;
    const original = projectQuery.data.readmeMarkdown ?? "";
    const draftKey = DRAFT_PREFIX + projectQuery.data.id;
    const draft = localStorage.getItem(draftKey);
    if (draft !== null && draft !== original) {
      setMarkdown(draft);
      setDirty(true);
      setDraftRestored(true);
    } else {
      setMarkdown(original);
    }
    setHydrated(true);
  }, [projectQuery.data, hydrated]);

  // Debounced draft autosave
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated || !projectQuery.data) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const key = DRAFT_PREFIX + projectQuery.data!.id;
      try {
        localStorage.setItem(key, markdown);
      } catch {
        // localStorage full or denied — silent fail; submit still works
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [markdown, hydrated, projectQuery.data]);

  // beforeunload guard
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Find editor textarea for cursor-aware insertion
  const getTextarea = useCallback((): HTMLTextAreaElement | null => {
    if (!editorBodyRef.current) return null;
    return editorBodyRef.current.querySelector(".w-md-editor-text-input");
  }, []);

  const insertAtCursor = useCallback(
    (snippet: string) => {
      const ta = getTextarea();
      if (!ta) {
        setMarkdown((prev) => (prev.endsWith("\n") || prev === "" ? prev + snippet : prev + "\n" + snippet));
        return;
      }
      const start = ta.selectionStart ?? markdown.length;
      const end = ta.selectionEnd ?? markdown.length;
      const before = markdown.slice(0, start);
      const after = markdown.slice(end);
      const needsLeading = before.length > 0 && !before.endsWith("\n");
      const piece = (needsLeading ? "\n" : "") + snippet;
      const next = before + piece + after;
      setMarkdown(next);
      // Restore cursor after the inserted snippet
      const newPos = before.length + piece.length;
      requestAnimationFrame(() => {
        try {
          ta.focus();
          ta.setSelectionRange(newPos, newPos);
        } catch { /* noop */ }
      });
    },
    [markdown, getTextarea],
  );

  const ingestFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.isArray(fileList) ? fileList : Array.from(fileList);
      if (files.length === 0) return;
      const { accepted, rejected } = acceptImageFiles(files, totalImageBytes);

      for (const r of rejected) {
        toastError("Can't attach", `${r.name} — ${r.reason}`);
      }
      if (accepted.length === 0) return;

      // Build the markdown snippet for all accepted images
      const snippet = accepted
        .map(({ path, file }) => `![${altFromFilename(file.name)}](${path})`)
        .join("\n");
      insertAtCursor(snippet + "\n");

      // Persist files
      setImages((prev) => {
        const next = new Map(prev);
        for (const { path, file } of accepted) next.set(path, file);
        return next;
      });
      setDirty(true);
    },
    [insertAtCursor, totalImageBytes],
  );

  // Drag handlers — depth counter avoids flicker when dragging over children
  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setDragDepth((d) => d + 1);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setDragDepth((d) => Math.max(0, d - 1));
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setDragDepth(0);
    if (e.dataTransfer.files?.length) {
      ingestFiles(e.dataTransfer.files);
    }
  };

  // Paste handler — sit at body level, fires for textarea too
  useEffect(() => {
    const body = editorBodyRef.current;
    if (!body) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      ingestFiles(files);
    };
    body.addEventListener("paste", handler);
    return () => body.removeEventListener("paste", handler);
  }, [ingestFiles]);

  const onSelectClick = () => fileInputRef.current?.click();
  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length) {
      ingestFiles(e.target.files);
    }
    e.target.value = "";
  };

  if (userLoading || projectQuery.isLoading) {
    return <FullPageSpinner label="Loading project..." />;
  }

  if (projectQuery.error) {
    const notFound = projectQuery.error.message === "NOT_FOUND";
    return (
      <div className="bg-black text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased min-h-screen flex flex-col">
        <Navbar user={user ?? null} />
        <main className="flex-grow flex items-center justify-center px-4">
          <div className="bg-[#0d1117] border border-white/10 rounded-xl py-12 sm:py-16 px-8 flex flex-col items-center text-center max-w-md">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30 mb-4">
              <span className="material-symbols-outlined text-[24px]">
                {notFound ? "folder_off" : "error"}
              </span>
            </div>
            <p className="text-sm font-medium text-white">
              {notFound ? "Project not found" : "Couldn't load project"}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {notFound
                ? "It may have been deleted or doesn't belong to you."
                : "Try refreshing in a moment."}
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-6 bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-all active:scale-95"
            >
              Back to dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const project = projectQuery.data!;
  const title = project.displayName || project.repoName;
  const repoPath = `${project.repoOwner}/${project.repoName}`;
  const imageCount = images.size;
  // Pane height fills the viewport exactly. Offset = navbar + header + attach strip
  // (+ optional draft banner, mobile warning, tablet/mobile toggle).
  const baseOffset = viewport === "mobile" ? 162 : 170;
  const extraOffset =
    (draftRestored ? 32 : 0) +
    (viewport === "mobile" && imageCount > 0 ? 32 : 0) +
    (viewport !== "desktop" ? 36 : 0);
  const paneHeight = Math.max(320, winHeight - baseOffset - extraOffset);
  const showEditPane = paneMode === "edit" || paneMode === "split";
  const showPreviewPane = paneMode === "preview" || paneMode === "split";
  const splitColsClass = paneMode === "split" ? "grid grid-cols-1 lg:grid-cols-2" : "grid grid-cols-1";
  const showMobileImageWarning = viewport === "mobile" && imageCount > 0;

  const handleChange = (val?: string) => {
    const next = val ?? "";
    setMarkdown(next);
    if (!dirty && next !== (project.readmeMarkdown ?? "")) setDirty(true);
  };

  const handleDiscardDraft = () => {
    const original = project.readmeMarkdown ?? "";
    setMarkdown(original);
    setDirty(false);
    setDraftRestored(false);
    localStorage.removeItem(DRAFT_PREFIX + project.id);
  };

  const handleOpenSubmit = () => {
    if (!markdown.trim()) {
      toastError("Empty README", "Add some content before submitting a PR.");
      return;
    }
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmitPR = async ({ title, description }: { title: string; description: string }) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const serializedImages = await Promise.all(
        Array.from(images.entries()).map(async ([path, file]) => ({
          path,
          contentBase64: await blobToBase64(file),
        })),
      );

      const res = await fetch(`${API}/api/projects/${project.id}/pr`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          title,
          description,
          images: serializedImages,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const reason = data?.detail || data?.error || "Unknown error";
        setSubmitError(reason);
        return;
      }

      const data = await res.json();

      // Clear draft, mark clean, close modal
      localStorage.removeItem(DRAFT_PREFIX + project.id);
      setDirty(false);
      setModalOpen(false);

      // Invalidate dashboard projects + this project
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });

      toastSuccess(
        "Pull Request created",
        <a href={data.prUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
          View on GitHub →
        </a>,
      );

      navigate("/dashboard");
    } catch (err: any) {
      setSubmitError(err.message ?? "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const dragActive = dragDepth > 0;

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
      <style>{EDITOR_OVERRIDES}</style>
      <div className="bg-black text-[#e2e2e2] font-sans selection:bg-[#27c93f] selection:text-black antialiased min-h-screen flex flex-col">
        <Navbar user={user ?? null} />

        {/* Editor header */}
        <div className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-14 sm:top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-white/40 hover:text-white transition-colors flex items-center shrink-0"
                aria-label="Back to dashboard"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div className="h-5 w-[1px] bg-white/10 shrink-0"></div>
              <div className="min-w-0">
                <h1 className="font-bold text-white text-sm sm:text-base tracking-tight truncate flex items-center gap-2">
                  <span
                    className="font-mono text-[#27c93f] leading-none"
                    style={{ textShadow: "0 0 12px rgba(39,201,63,0.35)" }}
                  >
                    ❯
                  </span>
                  {title}
                </h1>
                <p className="text-[11px] sm:text-xs text-white/40 font-mono truncate">{repoPath}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {dirty && (
                <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffbd2e] animate-pulse"></span>
                  unsaved
                </span>
              )}
              <button
                onClick={handleOpenSubmit}
                className="bg-white text-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 text-sm whitespace-nowrap shadow-[0_0_20px_rgba(39,201,63,0.18)] hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <span className="material-symbols-outlined text-[18px]">merge</span>
                Submit PR
              </button>
            </div>
          </div>

          {draftRestored && (
            <div className="border-t border-white/5 bg-[#ffbd2e]/[0.04]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-[#ffbd2e]/90 min-w-0">
                  <span className="material-symbols-outlined text-[14px]">history</span>
                  <span className="truncate">restored unsaved draft from your last session</span>
                </div>
                <button
                  onClick={handleDiscardDraft}
                  className="text-white/50 hover:text-white transition-colors underline underline-offset-2 shrink-0"
                >
                  discard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Editor body — full bleed, fills viewport like markdownlivepreview.com */}
        <main className="flex-grow w-full flex flex-col">
          <div
            ref={editorBodyRef}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className="relative bg-[#0d1117] overflow-hidden flex flex-col flex-grow"
            style={{
              boxShadow: dragActive
                ? "inset 0 0 0 2px #27c93f"
                : "none",
            }}
          >
            {/* Pane mode toggle — visible on mobile/tablet only */}
            {viewport !== "desktop" && (
              <div className="flex bg-[#0d1117] border-b border-white/10">
                {(viewport === "mobile" ? ["edit", "preview"] : ["edit", "split", "preview"]).map((m) => {
                  const isActive = paneMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setPaneMode(m as typeof paneMode)}
                      className={`flex-1 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] border-b-2 transition-colors ${
                        isActive
                          ? "border-[#27c93f] text-white"
                          : "border-transparent text-white/40 hover:text-white/70"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile image-volatility warning */}
            {showMobileImageWarning && (
              <div className="bg-[#ffbd2e]/[0.04] border-b border-white/5 px-4 py-2 flex items-center gap-2 text-[11px] font-mono text-[#ffbd2e]/80">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span className="truncate">refreshing will lose dropped images — submit when ready</span>
              </div>
            )}

            {/* Split panes — flush, no per-pane chrome */}
            <div data-color-mode="dark" className={splitColsClass}>
              {showEditPane && (
                <div className={showPreviewPane && viewport === "desktop" ? "border-r border-white/10" : ""}>
                  <MDEditor
                    value={markdown}
                    onChange={handleChange}
                    preview="edit"
                    hideToolbar={viewport === "mobile"}
                    visibleDragbar={false}
                    height={paneHeight}
                    className="gh-editor"
                    extraCommands={[]}
                  />
                </div>
              )}

              {showPreviewPane && (
                <div className={showEditPane && viewport !== "desktop" ? "border-t border-white/10" : ""}>
                  <div className="overflow-auto p-6 sm:p-8 lg:p-10" style={{ height: paneHeight }}>
                    <MarkdownPreview markdown={markdown} objectUrls={objectUrls} />
                  </div>
                </div>
              )}
            </div>

            {/* Attach hint strip — sticks to the bottom of the editor */}
            <div className="border-t border-white/10 bg-[#161b22] py-2 px-4 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-white/40 truncate flex items-center gap-2">
                <span className="text-[#27c93f]">❯</span>
                attach images by dragging, pasting, or{" "}
                <button
                  onClick={onSelectClick}
                  className="underline underline-offset-2 text-white/70 hover:text-white transition-colors"
                >
                  selecting
                </button>
                {imageCount > 0 && (
                  <span className="text-white/30 ml-2">
                    · {imageCount} attached · {formatBytes(totalImageBytes)}
                  </span>
                )}
              </span>
              <span className="hidden md:inline text-[10px] font-mono text-white/25 shrink-0">
                png · jpg · gif · webp · {Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB max
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={onFilePicked}
              />
            </div>

            {/* Drag-over overlay */}
            {dragActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-[#27c93f]/[0.05] backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-3 text-[#27c93f]" style={{ textShadow: "0 0 18px rgba(39,201,63,0.35)" }}>
                  <span className="material-symbols-outlined text-[48px]">attach_file</span>
                  <span className="font-mono text-sm tracking-wide">drop to embed</span>
                </div>
              </div>
            )}
          </div>
        </main>

        <SubmitPRModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          repoOwner={project.repoOwner}
          repoName={project.repoName}
          imageCount={imageCount}
          totalImageBytes={totalImageBytes}
          submitting={submitting}
          errorMessage={submitError}
          onSubmit={handleSubmitPR}
        />
      </div>
    </>
  );
};

export default ProjectEditor;
