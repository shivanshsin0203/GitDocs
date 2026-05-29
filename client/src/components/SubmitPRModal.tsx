import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { formatBytes } from "../lib/attach";

const DEFAULT_TITLE = "docs: update README via GitDocs";
const DEFAULT_DESCRIPTION = `This README was generated and edited via GitDocs.

⚠ AI-generated content — please review carefully before merging.

---
gitdocs.dev
`;

const TITLE_MAX = 120;
const DESC_MAX = 5000;

interface SubmitPRModalProps {
  open: boolean;
  onClose: () => void;
  repoOwner: string;
  repoName: string;
  imageCount: number;
  totalImageBytes: number;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (args: { title: string; description: string }) => void;
}

function SubmitPRModal({
  open,
  onClose,
  repoOwner,
  repoName,
  imageCount,
  totalImageBytes,
  submitting,
  errorMessage,
  onSubmit,
}: SubmitPRModalProps) {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const branch = useMemo(() => `gitdocs/readme-${nanoid(6).toLowerCase()}`, [open]);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Reset to defaults whenever modal opens
  useEffect(() => {
    if (!open) return;
    setTitle(DEFAULT_TITLE);
    setDescription(DEFAULT_DESCRIPTION);
    // Focus title field after mount
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const canSubmit = !submitting && title.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden"
        style={{
          boxShadow: "0 30px 80px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22] border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          </div>
          <div className="text-[10px] text-white/30 font-mono flex items-center gap-2">
            <span className="material-symbols-outlined text-[12px]">merge</span>
            create pull request
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-white/60">
            <span className="material-symbols-outlined text-[14px] text-[#27c93f]">fork_right</span>
            <span className="text-white/40">target</span>
            <span className="text-white truncate">{repoOwner}/{repoName}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-white/60">
            <span className="material-symbols-outlined text-[14px] text-white/40">commit</span>
            <span className="text-white/40">branch</span>
            <span className="text-white truncate">{branch}</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">
              PR title
            </label>
            <input
              ref={firstFieldRef}
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              className="w-full bg-[#0d1117] border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#27c93f]/40 focus:border-[#27c93f]/40 focus:outline-none px-3 py-2.5 placeholder-white/30 disabled:opacity-50"
              placeholder="docs: update README"
            />
            <div className="flex justify-between text-[10px] font-mono text-white/30">
              <span>required</span>
              <span>{title.length} / {TITLE_MAX}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">
              description
            </label>
            <textarea
              value={description}
              maxLength={DESC_MAX}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={5}
              className="w-full bg-[#0d1117] border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#27c93f]/40 focus:border-[#27c93f]/40 focus:outline-none px-3 py-2.5 placeholder-white/30 font-mono resize-y disabled:opacity-50"
              placeholder="Describe what's in this PR..."
            />
            <div className="flex justify-end text-[10px] font-mono text-white/30">
              {description.length} / {DESC_MAX}
            </div>
          </div>

          {/* Asset summary */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/60">
              <span className="material-symbols-outlined text-[14px]">image</span>
              {imageCount} {imageCount === 1 ? "image" : "images"} · {formatBytes(totalImageBytes)}
            </div>
            <span className="text-[10px] font-mono text-white/30">will be committed</span>
          </div>

          {/* Disclaimer chip */}
          <div className="flex items-start gap-2 px-3 py-2 bg-[#ffbd2e]/[0.06] border border-[#ffbd2e]/20 rounded-lg">
            <span className="material-symbols-outlined text-[14px] text-[#ffbd2e]/90 mt-0.5">warning</span>
            <span className="text-[11px] font-mono text-[#ffbd2e]/90 leading-relaxed">
              AI-generated content — review carefully on GitHub before merging.
            </span>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 px-3 py-2 bg-[#ffb4ab]/[0.06] border border-[#ffb4ab]/20 rounded-lg">
              <span className="material-symbols-outlined text-[14px] text-[#ffb4ab] mt-0.5">error</span>
              <span className="text-[11px] font-mono text-[#ffb4ab] leading-relaxed">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-white/50 hover:text-white text-sm font-mono px-3 py-2 transition-colors disabled:opacity-30"
          >
            cancel
          </button>
          <button
            onClick={() => onSubmit({ title: title.trim(), description })}
            disabled={!canSubmit}
            className="bg-white text-black px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 text-sm whitespace-nowrap shadow-[0_0_20px_rgba(39,201,63,0.18)] hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                Creating PR…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">merge</span>
                Create Pull Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmitPRModal;
