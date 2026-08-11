import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import {
  REDMINE_AUTH_SCHEME,
  REDMINE_REQUEST_HEADER,
  REDMINE_REQUEST_HEADER_VALUE,
  automationPreviewRequestSchema,
  automationSubmitRequestSchema,
} from "../shared/redmine";
import type { AccessIdentity } from "./access";
import { RedmineError } from "./redmine/client";
import type { RedmineService } from "./redmine/service";

interface CreateAppOptions {
  serviceFactory: (apiKey: string, identity: AccessIdentity) => Pick<RedmineService, "getStatus" | "createPreview" | "submitPreview">;
  accessMiddleware: RequestHandler;
  appOrigin?: string;
  serveStatic?: boolean;
  staticPath?: string;
}

export function createApp({ serviceFactory, accessMiddleware, appOrigin, serveStatic = false, staticPath }: CreateAppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], objectSrc: ["'none'"],
        baseUri: ["'self'"], frameAncestors: ["'none'"], formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
  }));

  app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
  app.use(requireExpectedHost(appOrigin));
  app.use(accessMiddleware);

  const generalLimiter = createLimiter(60, "Muitas solicitações. Aguarde um minuto.");
  app.use("/api/redmine", generalLimiter, requireTrustedAppRequest(appOrigin), express.json({ limit: "256kb", strict: true }), noStore);

  app.post("/api/redmine/connection", createLimiter(10, "Muitas tentativas de conexão."), async (req, res, next) => {
    try { res.json(await serviceForRequest(req, res, serviceFactory).getStatus()); } catch (error) { next(error); }
  });

  app.post("/api/redmine/preview", createLimiter(5, "Muitas prévias em pouco tempo."), async (req, res, next) => {
    const parsed = automationPreviewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Os dados da prévia são inválidos.", details: parsed.error.issues.map((issue) => issue.message).slice(0, 10) });
      return;
    }
    try { res.json(await serviceForRequest(req, res, serviceFactory).createPreview(parsed.data)); } catch (error) { next(error); }
  });

  app.post("/api/redmine/submit", createLimiter(2, "Aguarde antes de iniciar outro envio."), async (req, res, next) => {
    const parsed = automationSubmitRequestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "O identificador da prévia é inválido." }); return; }
    try { res.json(await serviceForRequest(req, res, serviceFactory).submitPreview(parsed.data.previewId)); } catch (error) { next(error); }
  });

  if (serveStatic && staticPath) {
    app.use(express.static(staticPath, { dotfiles: "deny", index: false, fallthrough: true }));
    app.get("*", (_req, res) => res.sendFile("index.html", { root: path.resolve(staticPath), dotfiles: "deny" }));
  } else {
    app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));
  }

  app.use(errorHandler);
  return app;
}

function requireExpectedHost(appOrigin?: string): RequestHandler {
  if (!appOrigin) return (_req, _res, next) => next();
  const expectedHost = new URL(appOrigin).host.toLowerCase();
  return (req, res, next) => {
    if ((req.get("host") ?? "").toLowerCase() !== expectedHost) {
      res.status(403).json({ error: "Host não autorizado." });
      return;
    }
    next();
  };
}

function serviceForRequest(
  req: express.Request,
  res: express.Response,
  factory: CreateAppOptions["serviceFactory"],
) {
  const header = req.get("authorization") ?? "";
  const match = header.match(new RegExp(`^${REDMINE_AUTH_SCHEME} ([A-Za-z0-9_-]{8,256})$`));
  if (!match) throw new RedmineError("Informe uma API key Redmine válida.", 401);
  const identity = res.locals.accessIdentity as AccessIdentity | undefined;
  if (!identity?.subject) throw new RedmineError("Identidade corporativa ausente.", 403);
  return factory(match[1], identity);
}

function requireTrustedAppRequest(appOrigin?: string): RequestHandler {
  const expectedProductionOrigin = appOrigin ? new URL(appOrigin).origin : null;
  const allowedOrigins = new Set(["http://127.0.0.1:3000", "http://localhost:3000", ...(expectedProductionOrigin ? [expectedProductionOrigin] : [])]);
  return (req, res, next) => {
    if (req.get(REDMINE_REQUEST_HEADER) !== REDMINE_REQUEST_HEADER_VALUE) {
      res.status(403).json({ error: "Solicitação não autorizada." }); return;
    }
    const origin = req.get("origin");
    if ((expectedProductionOrigin && origin !== expectedProductionOrigin) || (origin && !allowedOrigins.has(origin))) {
      res.status(403).json({ error: "Origem não autorizada." }); return;
    }
    const fetchSite = req.get("sec-fetch-site");
    if ((expectedProductionOrigin && fetchSite !== "same-origin")
      || (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site" && fetchSite !== "none")) {
      res.status(403).json({ error: "Contexto de navegação não autorizado." }); return;
    }
    next();
  };
}

function createLimiter(limit: number, message: string): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      const identity = (res.locals.accessIdentity as AccessIdentity | undefined)?.subject ?? "anonymous";
      return `${identity}:${ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown")}`;
    },
    handler: (_req, res) => res.status(429).json({ error: message }),
  });
}

const noStore: RequestHandler = (_req, res, next) => { res.set("Cache-Control", "no-store, max-age=0"); res.set("Pragma", "no-cache"); next(); };

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof RedmineError) {
    const status = error.status >= 400 && error.status < 600 ? error.status : 502;
    res.status(status).json({ error: error.message, ...(error.details.length ? { details: error.details } : {}) });
    return;
  }
  if (error instanceof SyntaxError) { res.status(400).json({ error: "O corpo JSON da solicitação é inválido." }); return; }
  console.error("Erro interno da integração Redmine.", { name: error instanceof Error ? error.name : "UnknownError" });
  res.status(500).json({ error: "Não foi possível concluir a operação sem expor detalhes internos." });
};
