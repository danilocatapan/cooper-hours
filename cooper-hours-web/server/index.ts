import dotenv from "dotenv";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createApp } from "./app";
import { RedmineClient } from "./redmine/client";
import { RedmineService } from "./redmine/service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: ".env.local" });
dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).optional(),
  REDMINE_API_PORT: z.coerce.number().int().positive().max(65_535).default(3001),
  REDMINE_BASE_URL: z.string().url().default("https://redmine.coopersystem.com.br"),
  REDMINE_API_KEY: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(8).optional(),
  ),
  REDMINE_PROJECT_ID: z.coerce.number().int().positive().default(333),
});

async function startServer() {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Configuração local inválida. Revise o arquivo .env.local.");
    process.exitCode = 1;
    return;
  }

  const config = parsed.data;
  const isProduction = config.NODE_ENV === "production";
  const redmineService = config.REDMINE_API_KEY
    ? new RedmineService(new RedmineClient({
        baseUrl: config.REDMINE_BASE_URL,
        apiKey: config.REDMINE_API_KEY,
      }), { projectId: config.REDMINE_PROJECT_ID })
    : null;
  const staticPath = isProduction ? path.resolve(__dirname, "public") : undefined;
  const app = createApp({ redmineService, serveStatic: isProduction, staticPath });
  const server = createServer(app);
  server.requestTimeout = 60_000;
  server.headersTimeout = 65_000;
  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  const port = config.PORT ?? (isProduction ? 3000 : config.REDMINE_API_PORT);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Cooper Hours local em http://127.0.0.1:${port}/`);
    console.log(redmineService ? "Integração Redmine configurada." : "Integração Redmine desativada: configure REDMINE_API_KEY.");
  });
}

startServer().catch(() => {
  console.error("Não foi possível iniciar o Cooper Hours local.");
  process.exitCode = 1;
});
