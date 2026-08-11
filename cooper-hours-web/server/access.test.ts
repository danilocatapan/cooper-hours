import { generateKeyPair, SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";
import { createCloudflareAccessMiddleware } from "./access";

const issuer = "https://cooper-hours.cloudflareaccess.com";
const audience = "application-audience-for-tests";

describe("Cloudflare Access", () => {
  it("aceita JWT assinado com issuer e audience corretos", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({ email: "user@coopersystem.com.br" }).setProtectedHeader({ alg: "RS256" })
      .setSubject("entra-subject").setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("5m").sign(privateKey);
    const outcome = await runMiddleware(token, publicKey);
    expect(outcome.next).toHaveBeenCalledOnce();
    expect(outcome.locals.accessIdentity).toEqual({ subject: "entra-subject", email: "user@coopersystem.com.br" });
  });

  it.each([
    ["ausente", undefined],
    ["audience incorreta", "wrong-audience"],
    ["expirado", "expired"],
  ])("rejeita JWT %s", async (_label, mode) => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    let token: string | undefined;
    if (mode) {
      token = await new SignJWT({}).setProtectedHeader({ alg: "RS256" }).setSubject("entra-subject").setIssuer(issuer)
        .setAudience(mode === "wrong-audience" ? "other-app" : audience).setIssuedAt()
        .setExpirationTime(mode === "expired" ? "0s" : "5m").sign(privateKey);
    }
    const outcome = await runMiddleware(token, publicKey);
    expect(outcome.next).not.toHaveBeenCalled();
    expect(outcome.statusCode).toBe(403);
  });
});

async function runMiddleware(token: string | undefined, publicKey: CryptoKey) {
  const next = vi.fn();
  const locals: Record<string, unknown> = {};
  let statusCode = 200;
  const req = { get: (name: string) => name === "cf-access-jwt-assertion" ? token : undefined } as any;
  const res = {
    locals,
    status(code: number) { statusCode = code; return this; },
    json: vi.fn(),
  } as any;
  await createCloudflareAccessMiddleware(issuer, audience, publicKey)(req, res, next);
  return { next, locals, get statusCode() { return statusCode; } };
}
