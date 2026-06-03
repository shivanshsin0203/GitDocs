import { toast } from "react-toastify";

// Throttle: SSE polls and parallel requests can all hit 429 at once. Without
// a cooldown we'd stack a dozen identical toasts on screen.
const TOAST_COOLDOWN_MS = 5000;
let lastToastAt = 0;

function showRateLimitToast(retryAfterSeconds?: number, customError?: string) {
  const now = Date.now();
  if (now - lastToastAt < TOAST_COOLDOWN_MS) return;
  lastToastAt = now;

  const wait = retryAfterSeconds && retryAfterSeconds > 0
    ? formatWait(retryAfterSeconds)
    : "a moment";

  toast(
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[#ffd479] text-[22px] mt-0.5">
        hourglass_top
      </span>
      <div className="flex flex-col">
        <span className="font-bold text-[#ffd479] text-sm tracking-wide">
          Slow down
        </span>
        <span className="text-white/60 text-xs mt-1 leading-relaxed">
          {customError ?? `You're sending requests too fast. Try again in ${wait}.`}
        </span>
      </div>
    </div>
  );
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
  const hrs = Math.ceil(mins / 60);
  return `${hrs} hour${hrs === 1 ? "" : "s"}`;
}

// Wraps window.fetch once at app boot. On 429, surface a toast but pass the
// Response through unchanged so existing error handling keeps working.
export function installRateLimitInterceptor() {
  const original = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const res = await original(input, init);
    if (res.status !== 429) return res;

    // Clone before reading — callers may still want to read the body themselves.
    try {
      const data = await res.clone().json();
      showRateLimitToast(data?.retryAfterSeconds, data?.error);
    } catch {
      // Fall back to the Retry-After header if the body wasn't JSON.
      const header = res.headers.get("Retry-After");
      const retryAfter = header ? Number(header) : undefined;
      showRateLimitToast(Number.isFinite(retryAfter) ? retryAfter : undefined);
    }
    return res;
  };
}
