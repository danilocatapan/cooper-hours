import { createHmac, timingSafeEqual } from "node:crypto";

export class AutomationSigner {
  constructor(private readonly key: string, private readonly keyId = "v1") {
    if (key.length < 32) throw new Error("AUTOMATION_SIGNING_KEY deve possuir ao menos 32 caracteres.");
  }

  fingerprintCredential(apiKey: string): string {
    return this.hmac(`credential|${apiKey}`);
  }

  fingerprintOwner(subject: string): string {
    return this.hmac(`owner|${subject}`);
  }

  createMarker(type: "issue" | "time-entry", redmineId: number, projectId: number, redmineUserId: number, sourceKey: string): string {
    const payload = markerPayload(type, redmineId, projectId, redmineUserId, sourceKey);
    return `cooper-hours:${this.keyId}:${type}:${redmineId}:${this.hmac(payload).slice(0, 32)}`;
  }

  verifyMarker(marker: string, type: "issue" | "time-entry", redmineId: number, projectId: number, redmineUserId: number, sourceKey: string): boolean {
    const expected = this.createMarker(type, redmineId, projectId, redmineUserId, sourceKey);
    const actualBuffer = Buffer.from(marker);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private hmac(value: string): string {
    return createHmac("sha256", this.key).update(value).digest("hex");
  }
}

export function appendIssueMarker(description: string, marker: string): string {
  const withoutOldMarker = description.replace(/\n?Cooper Hours ID: cooper-hours:[^\n]+/g, "").trimEnd();
  return `${withoutOldMarker}${withoutOldMarker ? "\n\n" : ""}Cooper Hours ID: ${marker}`;
}

export function extractMarker(value: string | undefined): string | null {
  return value?.match(/cooper-hours:v\d+:(?:issue|time-entry):\d+:[a-f0-9]{32}/)?.[0] ?? null;
}

function markerPayload(type: "issue" | "time-entry", redmineId: number, projectId: number, redmineUserId: number, sourceKey: string): string {
  return [type, redmineId, projectId, redmineUserId, sourceKey].join("|");
}
