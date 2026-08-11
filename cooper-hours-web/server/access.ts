import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AccessIdentity {
  subject: string;
  email?: string;
}

export function createCloudflareAccessMiddleware(teamDomain: string, audience: string, verificationKey?: CryptoKey): RequestHandler {
  const issuer = normalizeTeamDomain(teamDomain);
  const jwks = verificationKey ?? createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  return async (req, res, next) => {
    const token = req.get("cf-access-jwt-assertion");
    if (!token) {
      res.status(403).json({ error: "Autenticação corporativa obrigatória." });
      return;
    }
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience });
      if (!payload.sub) throw new Error("JWT sem subject");
      res.locals.accessIdentity = { subject: payload.sub, ...(typeof payload.email === "string" ? { email: payload.email } : {}) } satisfies AccessIdentity;
      next();
    } catch (_error) {
      res.status(403).json({ error: "Identidade corporativa inválida ou expirada." });
    }
  };
}

export const localAccessMiddleware: RequestHandler = (_req, res, next) => {
  res.locals.accessIdentity = { subject: "local-development" } satisfies AccessIdentity;
  next();
};

function normalizeTeamDomain(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".cloudflareaccess.com")) {
    throw new Error("CLOUDFLARE_ACCESS_TEAM_DOMAIN inválido.");
  }
  return url.origin;
}
