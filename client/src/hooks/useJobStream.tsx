import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useUser } from "./useUser.tsx";

const API = "http://localhost:3000";

export type Stage = "queued" | "analyzing" | "generating" | "completed" | "failed" | "rejected";

export interface ActiveJob {
  jobId: string;
  userId?: string;
  repoOwner: string;
  repoName: string;
  stage: Stage;
  displayName?: string;
  shortDescription?: string;
  language?: string;
  errorMessage?: string;
  updatedAt?: string;
}

interface JobStreamContextValue {
  active: ActiveJob[];
}

const JobStreamContext = createContext<JobStreamContextValue>({ active: [] });

export function useJobStream() {
  return useContext(JobStreamContext);
}

function CompletedToast({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[#27c93f] text-[20px] mt-0.5">check_circle</span>
      <div className="flex flex-col">
        <span className="font-bold text-white text-sm tracking-wide">Generated</span>
        <span className="text-white/50 text-xs mt-1">{label} is ready.</span>
      </div>
    </div>
  );
}

function FailedToast({ label, error }: { label: string; error?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[#ffb4ab] text-[20px] mt-0.5">error</span>
      <div className="flex flex-col">
        <span className="font-bold text-white text-sm tracking-wide">Generation failed</span>
        <span className="text-white/50 text-xs mt-1">{label}: {error ?? "Unknown error"}</span>
      </div>
    </div>
  );
}

function RejectedToast({ label, error }: { label: string; error?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[#ffbd2e] text-[20px] mt-0.5">block</span>
      <div className="flex flex-col">
        <span className="font-bold text-white text-sm tracking-wide">Too large to generate</span>
        <span className="text-white/50 text-xs mt-1">{error ?? `${label} exceeds file limit.`}</span>
      </div>
    </div>
  );
}

export function JobStreamProvider({ children }: { children: ReactNode }) {
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveJob[]>([]);
  const connected = useRef(false);

  useEffect(() => {
    if (!user) {
      // user logged out — clear stale state and close any open stream
      setActive([]);
      return;
    }
    if (connected.current) return;
    connected.current = true;

    // seed via REST so an initial render before SSE attaches still has data
    fetch(`${API}/api/dashboard/active`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { active: [] }))
      .then((d) => setActive(d.active ?? []))
      .catch(() => {});

    const es = new EventSource(`${API}/api/status/stream`, { withCredentials: true });

    es.addEventListener("snapshot", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setActive(data.active ?? []);
    });

    es.addEventListener("update", (e) => {
      const u = JSON.parse((e as MessageEvent).data) as ActiveJob & { projectId?: string };
      const label = u.displayName || u.repoName;

      if (u.stage === "completed") {
        setActive((a) => a.filter((j) => j.jobId !== u.jobId));
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        toast(<CompletedToast label={label} />);
        return;
      }
      if (u.stage === "failed") {
        setActive((a) => a.filter((j) => j.jobId !== u.jobId));
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        toast(<FailedToast label={label} error={u.errorMessage} />);
        return;
      }
      if (u.stage === "rejected") {
        setActive((a) => a.filter((j) => j.jobId !== u.jobId));
        toast(<RejectedToast label={label} error={u.errorMessage} />);
        return;
      }
      // queued | analyzing | generating — upsert (newest first)
      setActive((a) => {
        const idx = a.findIndex((j) => j.jobId === u.jobId);
        if (idx === -1) return [u, ...a];
        const next = a.slice();
        next[idx] = { ...next[idx], ...u };
        return next;
      });
    });

    es.onerror = (err) => {
      console.warn("[sse] connection error (browser will auto-reconnect)", err);
    };

    return () => {
      es.close();
      connected.current = false;
    };
  }, [user, queryClient]);

  return (
    <JobStreamContext.Provider value={{ active }}>
      {children}
    </JobStreamContext.Provider>
  );
}
