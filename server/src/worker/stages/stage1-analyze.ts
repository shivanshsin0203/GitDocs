import OpenAI from 'openai'

if (!process.env.DEEPSEEK_API_KEY && !process.env.apiKey) {
  console.warn('[stage1] WARNING: DEEPSEEK_API_KEY (or apiKey) not set in env')
}

const client = new OpenAI({
  apiKey:  process.env.DEEPSEEK_API_KEY ?? process.env.apiKey ?? '',
  baseURL: 'https://api.deepseek.com',
})

const IGNORE = ['node_modules', '.git', 'dist', 'build', 'package-lock.json']

export const MAX_FILES = 200

const stage1_systemPrompt = `You are GitDocs, an expert code analyst that helps generate professional README files.

In this stage you will receive:
- The repository name
- A complete flat list of all file paths in the repository

Your job is to deeply analyze the file structure and return a structured report that will be passed to Stage 2 to generate the README.

CRITICAL RULES:
- Only pick files that exist in the provided file list
- Return ONLY a raw JSON object, no markdown, no backticks, no explanation
- JSON must be valid and parseable

Return exactly this JSON shape and nothing else:
{
  "message": "A detailed technical report about this repository. Include: name of repository give just name not the username included, primary language, framework, project type (frontend/backend/fullstack/cli/library/monorepo), package manager, whether it has a database/docker/CI-CD/testing/env config, folder architecture explanation, what each major folder does, any monorepo or turborepo setup, notable config files found, and a clear summary of what this project does and how it is structured. This should be detailed enough that Stage 2 can write an accurate README without needing to re-analyze the structure.",
  "displayName": "A human-friendly display name for the project. Convert repo slugs into readable titles. Examples: 2d_metaverse → 2D Metaverse, assignment → Student Management Dashboard (infer from context), TicTacToe → Tic Tac Toe. Use the project purpose to craft a meaningful name if the repo name is generic.",
  "shortDescription": "One single sentence (max 120 chars) describing what this project does in plain language for an end-user. No markdown, no quotes, just the sentence.",
  "language": "The primary programming language of the project, exactly one of: TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Swift, C, C++, C#, PHP, Ruby, Dart, Scala, Elixir, Haskell, Clojure, R, Lua, Shell, HTML, CSS, Markdown. Pick the dominant one — for a Node/TS project pick TypeScript over JavaScript if .ts files dominate; for a Next.js app pick TypeScript or JavaScript based on which extensions appear most. If genuinely unclear, return an empty string.",
  "hasEnvExample": true or false (whether a .env.example or .env.sample file exists in the file list),
  "filesToRead": ["path1", "path2", "path3", "path4", "path5"]
}

For filesToRead prioritize in this order:
- Dependency manifest (package.json, go.mod, pom.xml, Cargo.toml, requirements.txt)
- Main entry point (index.ts, main.go, app.py, server.js, main.py)
- Database schema or ORM config (schema.prisma, schema.ts, models.py)
- Environment config (.env.example)
- Docker or CI config (Dockerfile, docker-compose.yml, .github/workflows/*.yml)
- Framework config (next.config.js, vite.config.ts, turbo.json)

VERY IMPORTANT NOTE:
If the repository is large and there are more than 5 important files, you can include those paths in filesToRead array.
Minimum 5 paths and maximum 10 to 18 paths depending upon repository size and complexity.`

export type Stage1Result = {
  message:          string
  displayName:      string
  shortDescription: string
  language:         string
  hasEnvExample:    boolean
  filesToRead:      string[]
}

export async function getFileTree(
  owner: string,
  repo: string,
  githubToken: string,
): Promise<string[]> {
  console.log(`[stage0] fetching file tree for ${owner}/${repo}`)
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers: { Authorization: `bearer ${githubToken}` } },
  )
  const data: any = await res.json()
  if (!data.tree) {
    console.error(`[stage0] failed to fetch tree for ${owner}/${repo}:`, data)
    throw new Error(`Could not fetch tree: ${data.message ?? 'unknown error'}`)
  }
  const paths: string[] = data.tree
    .filter((item: any) => item.type === 'blob')
    .map((item: any) => item.path)
    .filter((path: string) => !IGNORE.some((ig) => path.includes(ig)))
  console.log(`[stage0] ${owner}/${repo} has ${paths.length} files after filter`)
  return paths
}

export async function analyzeWithDeepSeek(
  owner: string,
  repo: string,
  paths: string[],
): Promise<Stage1Result> {
  console.log(`[stage1] sending ${paths.length} paths to DeepSeek for ${owner}/${repo}`)
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0.3,
    messages: [
      { role: 'system', content: stage1_systemPrompt },
      {
        role: 'user',
        content: `Repository name: ${owner}/${repo}\n\nFile structure:\n${paths.join('\n')}`,
      },
    ],
    response_format: { type: 'json_object' },
  })
  const usage = response.usage
  console.log(`[stage1] DeepSeek tokens in=${usage?.prompt_tokens} out=${usage?.completion_tokens}`)
  const raw = response.choices[0].message.content ?? '{}'
  const result = JSON.parse(raw) as Stage1Result
  console.log(`[stage1] displayName="${result.displayName}" language="${result.language ?? ''}" shortDescription="${result.shortDescription}" filesToRead=${result.filesToRead.length}`)
  return result
}
