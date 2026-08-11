import dotenv from "dotenv";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createCloudflareAccessMiddleware, localAccessMiddleware, type AccessIdentity } from "./access";
import { createApp } from "./app";
import { RedmineClient } from "./redmine/client";
import { AutomationSigner } from "./redmine/security";
import { RedmineService } from "./redmine/service";
import { MemoryAutomationStore, PostgresAutomationStore, type AutomationStore } from "./redmine/store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.local" });
dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).optional(),
  REDMINE_API_PORT: z.coerce.number().int().positive().max(65_535).default(3001),
  REDMINE_WRITE_MODE: z.enum(["disabled", "create", "create-update"]).default("disabled"),
  APP_ORIGIN: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  AUTOMATION_SIGNING_KEY: z.string().min(32).optional(),
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: z.string().url().optional(),
  CLOUDFLARE_ACCESS_AUD: z.string().min(10).optional(),
});

async function startServer() {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) { console.error("Configuração inválida. Revise as variáveis do ambiente."); process.exitCode = 1; return; }
  const config = parsed.data;
  const isProduction = config.NODE_ENV === "production";
  if (isProduction && (!config.APP_ORIGIN || !config.DATABASE_URL || !config.AUTOMATION_SIGNING_KEY
    || !config.CLOUDFLARE_ACCESS_TEAM_DOMAIN || !config.CLOUDFLARE_ACCESS_AUD)) {
    console.error("Produção exige APP_ORIGIN, DATABASE_URL, AUTOMATION_SIGNING_KEY e configuração Cloudflare Access.");
    process.exitCode = 1;
    return;
  }

  const signingKey = config.AUTOMATION_SIGNING_KEY ?? "local-development-signing-key-change-me";
  const signer = new AutomationSigner(signingKey);
  const store: AutomationStore = config.DATABASE_URL ? new PostgresAutomationStore(config.DATABASE_URL) : new MemoryAutomationStore();
  const accessMiddleware = isProduction
    ? createCloudflareAccessMiddleware(config.CLOUDFLARE_ACCESS_TEAM_DOMAIN!, config.CLOUDFLARE_ACCESS_AUD!)
    : localAccessMiddleware;
  const serviceFactory = (apiKey: string, identity: AccessIdentity) => new RedmineService(new RedmineClient({ apiKey }), {
    store,
    signer,
    ownerHash: signer.fingerprintOwner(identity.subject),
    keyFingerprint: signer.fingerprintCredential(apiKey),
    writeMode: config.REDMINE_WRITE_MODE,
  });

  const staticPath = isProduction ? path.resolve(__dirname, "public") : undefined;
  const app = createApp({ serviceFactory, accessMiddleware, appOrigin: config.APP_ORIGIN, serveStatic: isProduction, staticPath });
  const server = createServer(app);
  server.requestTimeout = 130_000;
  server.headersTimeout = 135_000;
  server.keepAliveTimeout = 5_000;
  server.on("clientError", (_error, socket) => socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"));

  const port = config.PORT ?? (isProduction ? 3000 : config.REDMINE_API_PORT);
  const host = isProduction ? "0.0.0.0" : "127.0.0.1";
  server.listen(port, host, () => console.log(`Cooper Hours disponível em http://${host}:${port}/`));

  const cleanupTimer = setInterval(() => void store.cleanup().catch(() => console.error("Falha na limpeza do ledger.")), 24 * 60 * 60_000);
  cleanupTimer.unref();
  const shutdown = () => server.close(async () => { clearInterval(cleanupTimer); await store.close?.(); process.exit(0); });
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

startServer().catch(() => { console.error("Não foi possível iniciar o Cooper Hours."); process.exitCode = 1; });
