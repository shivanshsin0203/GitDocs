import { nanoid } from "nanoid";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const MIME_EXT: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/gif":  "gif",
  "image/webp": "webp",
};

export interface AcceptResult {
  accepted: { path: string; file: File }[];
  rejected: { name: string; reason: string }[];
}

export function generateImagePath(mime: string): string {
  const ext = MIME_EXT[mime] ?? "png";
  return `readmeImages/img-${nanoid(8)}.${ext}`;
}

export function acceptImageFiles(
  files: ArrayLike<File>,
  currentTotalBytes: number,
): AcceptResult {
  const accepted: AcceptResult["accepted"] = [];
  const rejected: AcceptResult["rejected"] = [];
  let runningTotal = currentTotalBytes;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;

    if (!file.type.startsWith("image/")) {
      rejected.push({ name: file.name || "file", reason: "only images can be attached" });
      continue;
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      rejected.push({ name: file.name || "file", reason: "use png, jpg, gif, or webp" });
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      rejected.push({ name: file.name || "file", reason: "exceeds 5 MB limit" });
      continue;
    }
    if (runningTotal + file.size > MAX_TOTAL_BYTES) {
      rejected.push({ name: file.name || "file", reason: "would exceed 25 MB total" });
      continue;
    }

    accepted.push({ path: generateImagePath(file.type), file });
    runningTotal += file.size;
  }

  return { accepted, rejected };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function altFromFilename(name: string | undefined): string {
  if (!name) return "image";
  return name.replace(/\.[^.]+$/, "").slice(0, 60) || "image";
}
