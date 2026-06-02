import { z } from "zod"

// Parsed once at module load. Because index.ts imports "dotenv/config" before
// any other module, process.env is already populated by the time this runs.
const envSchema = z
  .object({
    PORT:         z.coerce.number().int().positive().default(3000),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),

    DATABASE_URL: z.string().min(1),
    REDIS_URL:    z.string().min(1),

    JWT_SECRET:   z.string().min(1),

    GITHUB_CLIENT_ID:     z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GITHUB_CALLBACK_URL:  z.string().url(),

    // Either name works — code historically read both.
    DEEPSEEK_API_KEY: z.string().min(1).optional(),
    apiKey:           z.string().min(1).optional(),
  })
  .refine((e) => e.DEEPSEEK_API_KEY || e.apiKey, {
    message: "DEEPSEEK_API_KEY (or apiKey) is required",
    path:    ["DEEPSEEK_API_KEY"],
  })

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error("[env] invalid environment:")
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = {
  ...parsed.data,
  // Single resolved value so callers don't have to repeat the fallback.
  DEEPSEEK_API_KEY: parsed.data.DEEPSEEK_API_KEY ?? parsed.data.apiKey!,
}
