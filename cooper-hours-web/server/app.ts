import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import helmet from "helmet";
import path from "node:path";
import {
  REDMINE_REQUEST_HEADER,
  REDMINE_REQUEST_HEADER_VALUE,
  automationPreviewRequestSchema,
  automationSubmitRequestSchema,
  type RedmineConnectionStatus,
} from "../shared/redmine";
import { RedmineError } from "./redmine/client";
import type { RedmineService } from "./redmine/service";

interface CreateAppOptions {
  redmineService: Pick<RedmineService, "getStatus" | "createPreview" | "submitPreview"> | null;
  serveStatic?: boolean;
  staticPath?: string;
}

export function createApp({ redmineService, serveStatic = false, staticPath }: CreateAppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
  }));

  app.use("/api/redmine", requireLocalAppRequest);
  app.use("/api/redmine", express.json({ limit: "256kb", strict: true }));

  app.get("/api/redmine/status", async (_req, res, next) => {
    if (!redmineService) {
      const status: RedmineConnectionStatus = {
        configured: false,
        connected: false,
        message: "Configure REDMINE_API_KEY no arquivo .env.local para ativar a automação.",
        trackers: [],
        statuses: [],
        activities: [],
        versions: [],
      };
      res.json(status);
      return;
    }
    try {
      res.json(await redmineService.getStatus());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/redmine/preview", async (req, res, next) => {
    if (!redmineService) {
      res.status(503).json({ error: "A integração Redmine não está configurada." });
      return;
    }
    const parsed = automationPreviewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Os dados da prévia são inválidos.",
        details: parsed.error.issues.map((issue) => issue.message).slice(0, 10),
      });
      return;
    }
    try {
      res.json(await redmineService.createPreview(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/redmine/submit", async (req, res, next) => {
    if (!redmineService) {
      res.status(503).json({ error: "A integração Redmine não está configurada." });
      return;
    }
    const parsed = automationSubmitRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "O identificador da prévia é inválido." });
      return;
    }
    try {
      res.json(await redmineService.submitPreview(parsed.data.previewId));
    } catch (error) {
      next(error);
    }
  });

  if (serveStatic && staticPath) {
    app.use(express.static(staticPath, { dotfiles: "deny", index: false }));
    app.get("*", (_req, res) => {
      res.sendFile("index.html", { root: path.resolve(staticPath), dotfiles: "deny" });
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: "Rota não encontrada." });
    });
  }

  app.use(errorHandler);
  return app;
}

const requireLocalAppRequest: RequestHandler = (req, res, next) => {
  if (req.get(REDMINE_REQUEST_HEADER) !== REDMINE_REQUEST_HEADER_VALUE) {
    res.status(403).json({ error: "Solicitação local não autorizada." });
    return;
  }

  const origin = req.get("origin");
  if (origin) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch (_error) {
      res.status(403).json({ error: "Origem inválida." });
      return;
    }
    if ((parsedOrigin.hostname !== "127.0.0.1" && parsedOrigin.hostname !== "localhost") || parsedOrigin.protocol !== "http:") {
      res.status(403).json({ error: "A integração aceita apenas a aplicação executada localmente." });
      return;
    }
  }

  next();
};

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof RedmineError) {
    const status = error.status >= 400 && error.status < 600 ? error.status : 502;
    res.status(status).json({ error: error.message, ...(error.details.length > 0 ? { details: error.details } : {}) });
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "O corpo JSON da solicitação é inválido." });
    return;
  }

  console.error("Erro interno da integração Redmine.", { name: error instanceof Error ? error.name : "UnknownError" });
  res.status(500).json({ error: "Não foi possível concluir a operação sem expor detalhes internos." });
};
