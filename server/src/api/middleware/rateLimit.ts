import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Request } from "express";
import { redis } from "../../lib/redis";

// Backs every limiter with the shared ioredis client. The `prefix` is what
// keeps separate limiters from sharing buckets — each limiter passes its own.
function store(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<any>,
  });
}

// Authenticated requests get bucketed by userId so users can't share a bucket
// across IPs. Falls back to IP for routes that run before `authenticate`.
function userOrIpKey(req: Request): string {
  const uid = (req as Request & { userId?: string }).userId;
  if (uid) return `u:${uid}`;
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

// Standardized 429 payload so the client can show a consistent toast.
const handler: Options["handler"] = (_req, res, _next, options) => {
  res.status(options.statusCode).json({
    error: "Too many requests. Please slow down and try again shortly.",
    retryAfterSeconds: Math.ceil(options.windowMs / 1000),
  });
};

const common = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  handler,
};

// Coarse net on /api/* by IP. Catches scraping / naive flooding before
// requests reach business logic.
export const globalApiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  store: store("rl:global:"),
});

// Auth endpoints are the credential-stuffing target. Strict, by IP.
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  store: store("rl:auth:"),
});

// /generate hits the LLM — real money per call. Per-user.
export const generateLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: userOrIpKey,
  store: store("rl:generate:"),
});

// PR creation hits GitHub with the user's token. Per-user.
export const prLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator: userOrIpKey,
  store: store("rl:pr:"),
});

// Dashboard / status get polled by the UI (SSE, refresh). Generous, per-user.
export const readLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 200,
  keyGenerator: userOrIpKey,
  store: store("rl:read:"),
});
