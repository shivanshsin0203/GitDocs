export type FetchedFile = { path: string; content: string }

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  githubToken: string,
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers: { Authorization: `Bearer ${githubToken}` } },
  )
  const data: any = await res.json()
  if (data.message === 'Not Found' || !data.content) return null
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  const lines = content.split('\n')
  if (lines.length > 300) {
    return lines.slice(0, 300).join('\n') + '\n... (truncated)'
  }
  return content
}

export async function fetchAllFiles(
  owner: string,
  repo: string,
  filesToRead: string[],
  githubToken: string,
): Promise<FetchedFile[]> {
  console.log(`[stage2a] fetching ${filesToRead.length} files in parallel for ${owner}/${repo}`)
  const results = await Promise.allSettled(
    filesToRead.map(async (path) => {
      const content = await fetchFileContent(owner, repo, path, githubToken)
      return { path, content }
    }),
  )
  const files: FetchedFile[] = []
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.content !== null) {
      files.push({ path: r.value.path, content: r.value.content })
      console.log(`[stage2a]   OK   ${r.value.path}`)
    } else if (r.status === 'fulfilled') {
      console.log(`[stage2a]   SKIP ${r.value.path} (not found)`)
    } else {
      console.log(`[stage2a]   FAIL ${r.reason?.message ?? 'unknown'}`)
    }
  }
  console.log(`[stage2a] fetched ${files.length}/${filesToRead.length} files`)
  return files
}

export function buildFilesBlock(files: FetchedFile[]): string {
  return files
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n')
}
