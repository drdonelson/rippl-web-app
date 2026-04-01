import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve Rippl frontend static files (production only — dev uses the Vite server)
if (process.env.NODE_ENV === "production") {
  const ripplDist = path.resolve(import.meta.dirname, "../../rippl/dist/public");
  app.use(express.static(ripplDist));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(ripplDist, "index.html"));
  });
}

export default app;
