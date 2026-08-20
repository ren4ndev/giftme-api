import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found-handler";
import { routes } from "./routes/index";

export const app = express();

// Confia em 1 hop de proxy reverso em produção (topologia esperada: LB/proxy -> API), para
// req.ip refletir o cliente real não o proxy.
// Em dev/test, sem proxy na frente, não confia em nenhum (comportamento default do Express).
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existingId = req.headers["x-request-id"];
      const id = typeof existingId === "string" ? existingId : randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
  }),
);

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);
