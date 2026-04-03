import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── Logging ─────────────────────────────────────────────────────────────────
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

// ── Block known attack paths ─────────────────────────────────────────────────
const BLOCKED_PATHS = [
  "/phpinfo.php", "/info.php", "/test.php",
  "/.aws/credentials", "/.aws/config", "/aws.json",
  "/.s3cfg", "/wp-admin", "/wp-login.php",
  "/.env", "/config.php", "/admin.php",
  "/shell.php", "/cmd.php", "/.git/config",
];

app.use((req: Request, res: Response, next: NextFunction) => {
  if (BLOCKED_PATHS.some(p => req.path.startsWith(p))) {
    res.status(404).end();
    return;
  }
  next();
});

// ── Rate limiting on all API routes ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

app.use("/api/", apiLimiter);

// ── Body parsing & CORS ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API routes ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Frontend static files (production only) ──────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const ripplDist = path.resolve(import.meta.dirname, "../../rippl/dist/public");
  app.use(express.static(ripplDist));
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(ripplDist, "index.html"));
  });
} else {
  // Catch-all 404 for unmatched routes in non-production
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });
}

// ── Global error handler (must be last, must have 4 params) ──────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, url: req.url, method: req.method }, "[server] Unhandled error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

export default app;
