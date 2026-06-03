import { toast } from "react-toastify";

type ToastTone = "error" | "warn" | "success" | "info";

const TONE: Record<ToastTone, { color: string; icon: string }> = {
  error:   { color: "#ffb4ab", icon: "error" },
  warn:    { color: "#ffd479", icon: "warning" },
  success: { color: "#27c93f", icon: "check_circle" },
  info:    { color: "#aec6ff", icon: "info" },
};

function show(tone: ToastTone, title: string, subtitle: React.ReactNode) {
  const t = TONE[tone];
  toast(
    <div className="flex items-start gap-3">
      <span
        className="material-symbols-outlined text-[20px] mt-0.5"
        style={{ color: t.color }}
      >
        {t.icon}
      </span>
      <div className="flex flex-col">
        <span
          className="font-bold text-sm tracking-wide"
          style={{ color: tone === "warn" || tone === "error" ? t.color : "#ffffff" }}
        >
          {title}
        </span>
        <span className="text-white/60 text-xs mt-1 leading-relaxed">{subtitle}</span>
      </div>
    </div>
  );
}

export const toastError   = (title: string, subtitle: React.ReactNode) => show("error",   title, subtitle);
export const toastWarn    = (title: string, subtitle: React.ReactNode) => show("warn",    title, subtitle);
export const toastSuccess = (title: string, subtitle: React.ReactNode) => show("success", title, subtitle);
export const toastInfo    = (title: string, subtitle: React.ReactNode) => show("info",    title, subtitle);
