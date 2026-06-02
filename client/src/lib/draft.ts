const DRAFT_PREFIX = "gitdocs:draft:";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

// Matches paths produced by acceptImageFiles: readmeImages/img-<nanoid8>.<ext>.
// Mirrors the server's nanoid alphabet (see architecture §4.13).
const LOCAL_IMG_RE =
  /!\[([^\]]*)\]\(readmeImages\/img-[A-Za-z0-9_-]{8}\.(?:png|jpe?g|gif|webp)\)/g;

interface Envelope {
  md: string;
  updatedAt: number;
}

interface SweepProject {
  id: string;
  prUrl: string | null;
}

export function stripImageRefs(md: string): string {
  return md.replace(LOCAL_IMG_RE, (_full, alt: string) => {
    const label = alt.trim() || "image";
    return `<!-- re-attach image: ${label} -->`;
  });
}

export function saveDraft(projectId: string, md: string): void {
  const envelope: Envelope = { md: stripImageRefs(md), updatedAt: Date.now() };
  try {
    localStorage.setItem(DRAFT_PREFIX + projectId, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or denied — silent fail; submit still works from in-memory state.
  }
}

export interface LoadedDraft {
  md: string;
  updatedAt: number;
}

export function loadDraft(projectId: string): LoadedDraft | null {
  const key = DRAFT_PREFIX + projectId;
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as Envelope).md === "string" &&
      typeof (parsed as Envelope).updatedAt === "number"
    ) {
      const env = parsed as Envelope;
      if (Date.now() - env.updatedAt > FIVE_DAYS_MS) {
        try { localStorage.removeItem(key); } catch { /* noop */ }
        return null;
      }
      return { md: env.md, updatedAt: env.updatedAt };
    }
  } catch {
    // Not JSON — fall through to legacy handling below.
  }

  // Legacy raw-string draft from before envelopes existed. Re-envelope with a
  // fresh TTL clock and return the stripped form so the editor doesn't render
  // image refs whose blobs no longer exist.
  const now = Date.now();
  saveDraft(projectId, raw);
  return { md: stripImageRefs(raw), updatedAt: now };
}

export function clearDraft(projectId: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + projectId);
  } catch { /* noop */ }
}

export function sweepDrafts(projects: SweepProject[]): void {
  const validIds = new Set<string>();
  const lockedIds = new Set<string>();
  for (const p of projects) {
    validIds.add(p.id);
    if (p.prUrl) lockedIds.add(p.id);
  }

  const toDelete: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
      const id = key.slice(DRAFT_PREFIX.length);

      if (!validIds.has(id) || lockedIds.has(id)) {
        toDelete.push(key);
        continue;
      }

      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        const env = JSON.parse(raw) as Envelope;
        if (
          !env ||
          typeof env.md !== "string" ||
          typeof env.updatedAt !== "number" ||
          Date.now() - env.updatedAt > FIVE_DAYS_MS
        ) {
          toDelete.push(key);
        }
      } catch {
        toDelete.push(key);
      }
    }
    for (const k of toDelete) localStorage.removeItem(k);
  } catch { /* noop */ }
}
