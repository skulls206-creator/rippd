import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

const ORIGINAL_ENV = { ...process.env };

async function loadApp(env: Record<string, string>): Promise<Express> {
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }
  vi.resetModules();
  const mod = await import("../app");
  return mod.default;
}

describe("API rate limiting", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("returns 429 after exceeding RATE_LIMIT_MAX within RATE_LIMIT_WINDOW_MS", async () => {
    const max = 3;
    const app = await loadApp({
      RATE_LIMIT_MAX: String(max),
      RATE_LIMIT_WINDOW_MS: "60000",
      NODE_ENV: "test",
    });

    for (let i = 0; i < max; i += 1) {
      const res = await request(app).get("/api/healthz");
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get("/api/healthz");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      error: "Too many requests, please try again later.",
    });
  });

  it("counts distinct IPs independently when trust proxy is enabled", async () => {
    const max = 2;
    const app = await loadApp({
      RATE_LIMIT_MAX: String(max),
      RATE_LIMIT_WINDOW_MS: "60000",
      TRUST_PROXY: "1",
      NODE_ENV: "test",
    });

    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";

    for (let i = 0; i < max; i += 1) {
      const res = await request(app)
        .get("/api/healthz")
        .set("X-Forwarded-For", ipA);
      expect(res.status).toBe(200);
    }

    const blockedA = await request(app)
      .get("/api/healthz")
      .set("X-Forwarded-For", ipA);
    expect(blockedA.status).toBe(429);

    for (let i = 0; i < max; i += 1) {
      const res = await request(app)
        .get("/api/healthz")
        .set("X-Forwarded-For", ipB);
      expect(res.status).toBe(
        200,
      );
    }

    const blockedB = await request(app)
      .get("/api/healthz")
      .set("X-Forwarded-For", ipB);
    expect(blockedB.status).toBe(429);
  });
});
