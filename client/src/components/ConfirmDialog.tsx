import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass = destructive
    ? "bg-[#ffb4ab] text-black hover:bg-[#ffc8c0] shadow-[0_0_20px_rgba(255,180,171,0.2)]"
    : "bg-white text-black hover:bg-neutral-200 shadow-[0_0_20px_rgba(39,201,63,0.18)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={() => !busy && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden"
        style={{
          boxShadow: "0 30px 80px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
            <span
              className="font-mono text-[#27c93f] leading-none"
              style={{ textShadow: "0 0 12px rgba(39,201,63,0.35)" }}
            >
              ❯
            </span>
            {title}
          </h3>
        </div>

        <div className="px-5 sm:px-6 py-5">
          <p className="text-sm text-white/60 leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-white/50 hover:text-white text-sm font-mono px-3 py-2 transition-colors disabled:opacity-30"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-sm whitespace-nowrap transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${confirmClass}`}
          >
            {busy ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
