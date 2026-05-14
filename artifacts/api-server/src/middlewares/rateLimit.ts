import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { logger } from "../lib/logger";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn({ value }, "Invalid rate limit env value, using fallback");
    return fallback;
  }
  return parsed;
}

const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const max = parsePositiveInt(process.env.RATE_LIMIT_MAX, 30);

export const apiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs,
  limit: max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
