import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const PRODUCTION_DEFAULT_ORIGINS = [
  "https://skulls206-creator.github.io",
  "/^https?:\\/\\/.*\\.replit\\.dev$/",
];

const DEV_ONLY_ORIGINS = [
  "/^http:\\/\\/localhost(:\\d+)?$/",
];

const DEFAULT_CORS_ORIGINS = (
  process.env.NODE_ENV === "production"
    ? PRODUCTION_DEFAULT_ORIGINS
    : [...PRODUCTION_DEFAULT_ORIGINS, ...DEV_ONLY_ORIGINS]
).join(",");

function parseOriginEntry(entry: string): string | RegExp | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    const lastSlash = trimmed.lastIndexOf("/");
    const pattern = trimmed.slice(1, lastSlash);
    const flags = trimmed.slice(lastSlash + 1);
    try {
      return new RegExp(pattern, flags);
    } catch {
      logger.warn({ entry: trimmed }, "Invalid CORS regex origin, ignoring");
      return null;
    }
  }
  return trimmed;
}

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? DEFAULT_CORS_ORIGINS)
  .split(",")
  .map(parseOriginEntry)
  .filter((v): v is string | RegExp => v !== null);

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
