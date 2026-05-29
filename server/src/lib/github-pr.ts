// GitHub PR creation via the Git Data API.
// Single-commit PR with README + image blobs in one tree.

const GH = "https://api.github.com"

type Headers = Record<string, string>

function authHeaders(token: string): Headers {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: {
      ...authHeaders(token),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers as Headers | undefined),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const err = new Error(`GitHub ${res.status} ${path}: ${text.slice(0, 200)}`)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export interface CreatePRInput {
  token: string
  owner: string
  repo: string
  markdown: string
  title: string
  description: string
  branch: string
  images: { path: string; contentBase64: string }[]
}

export interface CreatePRResult {
  prUrl: string
  prNumber: number
  branch: string
}

function toBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64")
}

export async function createReadmePR(input: CreatePRInput): Promise<CreatePRResult> {
  const { token, owner, repo, markdown, title, description, branch, images } = input

  // 1. Get default branch + HEAD
  const repoInfo = await gh<{ default_branch: string }>(token, `/repos/${owner}/${repo}`)
  const baseBranch = repoInfo.default_branch

  const baseRef = await gh<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
  )
  const parentCommitSha = baseRef.object.sha

  const parentCommit = await gh<{ tree: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/commits/${parentCommitSha}`,
  )
  const baseTreeSha = parentCommit.tree.sha

  // 2. Upload blobs (README + each image) in parallel
  const readmeBlobP = gh<{ sha: string }>(token, `/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: toBase64(markdown), encoding: "base64" }),
  })
  const imageBlobPs = images.map((img) =>
    gh<{ sha: string }>(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: img.contentBase64, encoding: "base64" }),
    }).then((blob) => ({ path: img.path, sha: blob.sha })),
  )
  const [readmeBlob, imageBlobs] = await Promise.all([
    readmeBlobP,
    Promise.all(imageBlobPs),
  ])

  // 3. Build tree with README + images
  const treeEntries = [
    { path: "README.md", mode: "100644", type: "blob", sha: readmeBlob.sha },
    ...imageBlobs.map((b) => ({
      path: b.path,
      mode: "100644",
      type: "blob",
      sha: b.sha,
    })),
  ]
  const newTree = await gh<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
    },
  )

  // 4. Create commit
  const newCommit = await gh<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message: "docs: update README via GitDocs",
        tree: newTree.sha,
        parents: [parentCommitSha],
      }),
    },
  )

  // 5. Create branch pointing at new commit
  await gh(token, `/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: newCommit.sha,
    }),
  })

  // 6. Open PR
  const pr = await gh<{ html_url: string; number: number }>(
    token,
    `/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        body: description,
        head: branch,
        base: baseBranch,
      }),
    },
  )

  return { prUrl: pr.html_url, prNumber: pr.number, branch }
}

export interface PRStatusResult {
  status: "open" | "merged" | "closed"
}

export async function getPRStatus(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRStatusResult> {
  const pr = await gh<{ state: "open" | "closed"; merged: boolean }>(
    token,
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
  )
  if (pr.state === "open") return { status: "open" }
  if (pr.merged) return { status: "merged" }
  return { status: "closed" }
}
