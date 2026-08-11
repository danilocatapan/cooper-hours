import { Pool } from "pg";
import type { AutomationPreview, AutomationPreviewRequest, AutomationSubmissionResult } from "../../shared/redmine";
import type { RedmineUser } from "./client";

export interface PreviewRecord {
  preview: AutomationPreview;
  request: AutomationPreviewRequest;
  user: RedmineUser;
  versionId: number | null;
  ownerHash: string;
  keyFingerprint: string;
  submitting: boolean;
  result?: AutomationSubmissionResult;
}

export interface ManagedResource {
  ownerHash: string;
  redmineUserId: number;
  resourceType: "issue" | "time-entry";
  sourceKey: string;
  redmineId: number;
  projectId: number;
  marker: string;
  snapshot: Record<string, string | number | null>;
}

export interface AuditEvent {
  ownerHash: string;
  operation: "create" | "update" | "reuse" | "blocked";
  resourceType: "issue" | "time-entry" | "preview";
  redmineId?: number | null;
  outcome: "success" | "failure";
}

export interface AutomationStore {
  savePreview(record: PreviewRecord): Promise<void>;
  getPreview(previewId: string): Promise<PreviewRecord | null>;
  beginSubmission(previewId: string): Promise<boolean>;
  finishSubmission(previewId: string, result: AutomationSubmissionResult): Promise<void>;
  releaseSubmission(previewId: string): Promise<void>;
  getManagedResource(ownerHash: string, resourceType: ManagedResource["resourceType"], sourceKey: string): Promise<ManagedResource | null>;
  listManagedResources(ownerHash: string, resourceType: ManagedResource["resourceType"]): Promise<ManagedResource[]>;
  saveManagedResource(resource: ManagedResource): Promise<void>;
  writeAudit(event: AuditEvent): Promise<void>;
  cleanup(): Promise<void>;
  close?(): Promise<void>;
}

export class MemoryAutomationStore implements AutomationStore {
  private readonly previews = new Map<string, PreviewRecord>();
  private readonly resources = new Map<string, ManagedResource>();

  async savePreview(record: PreviewRecord): Promise<void> { this.previews.set(record.preview.previewId, structuredClone(record)); }
  async getPreview(previewId: string): Promise<PreviewRecord | null> {
    const record = this.previews.get(previewId);
    if (!record || Date.parse(record.preview.expiresAt) <= Date.now()) {
      this.previews.delete(previewId);
      return null;
    }
    return structuredClone(record);
  }
  async beginSubmission(previewId: string): Promise<boolean> {
    const record = this.previews.get(previewId);
    if (!record || record.submitting) return false;
    record.submitting = true;
    return true;
  }
  async finishSubmission(previewId: string, result: AutomationSubmissionResult): Promise<void> {
    const record = this.previews.get(previewId);
    if (record) { record.result = structuredClone(result); record.submitting = false; }
  }
  async releaseSubmission(previewId: string): Promise<void> {
    const record = this.previews.get(previewId);
    if (record) record.submitting = false;
  }
  async getManagedResource(ownerHash: string, resourceType: ManagedResource["resourceType"], sourceKey: string): Promise<ManagedResource | null> {
    return structuredClone(this.resources.get(resourceKey(ownerHash, resourceType, sourceKey)) ?? null);
  }
  async listManagedResources(ownerHash: string, resourceType: ManagedResource["resourceType"]): Promise<ManagedResource[]> {
    return Array.from(this.resources.values())
      .filter((resource) => resource.ownerHash === ownerHash && resource.resourceType === resourceType)
      .map((resource) => structuredClone(resource));
  }
  async saveManagedResource(resource: ManagedResource): Promise<void> {
    this.resources.set(resourceKey(resource.ownerHash, resource.resourceType, resource.sourceKey), structuredClone(resource));
  }
  async writeAudit(_event: AuditEvent): Promise<void> {}
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [id, record] of Array.from(this.previews.entries())) if (Date.parse(record.preview.expiresAt) <= now) this.previews.delete(id);
  }
}

export class PostgresAutomationStore implements AutomationStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 5 });
  }

  async savePreview(record: PreviewRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO automation_previews (id, owner_hash, key_fingerprint, redmine_user_id, expires_at, payload, submitting, result)
       VALUES ($1,$2,$3,$4,$5,$6,false,NULL)
       ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload, expires_at=EXCLUDED.expires_at`,
      [record.preview.previewId, record.ownerHash, record.keyFingerprint, record.user.id, record.preview.expiresAt, JSON.stringify(record)],
    );
  }

  async getPreview(previewId: string): Promise<PreviewRecord | null> {
    const result = await this.pool.query<{ payload: PreviewRecord; submitting: boolean; result: AutomationSubmissionResult | null }>(
      `SELECT payload, submitting, result FROM automation_previews WHERE id=$1 AND expires_at > now()`, [previewId],
    );
    if (!result.rowCount) return null;
    return { ...result.rows[0].payload, submitting: result.rows[0].submitting, ...(result.rows[0].result ? { result: result.rows[0].result } : {}) };
  }

  async beginSubmission(previewId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE automation_previews SET submitting=true WHERE id=$1 AND expires_at > now() AND submitting=false RETURNING id`, [previewId],
    );
    return Boolean(result.rowCount);
  }

  async finishSubmission(previewId: string, result: AutomationSubmissionResult): Promise<void> {
    await this.pool.query(`UPDATE automation_previews SET submitting=false, result=$2 WHERE id=$1`, [previewId, JSON.stringify(result)]);
  }

  async releaseSubmission(previewId: string): Promise<void> {
    await this.pool.query(`UPDATE automation_previews SET submitting=false WHERE id=$1`, [previewId]);
  }

  async getManagedResource(ownerHash: string, resourceType: ManagedResource["resourceType"], sourceKey: string): Promise<ManagedResource | null> {
    const result = await this.pool.query<{
      owner_hash: string; redmine_user_id: number; resource_type: ManagedResource["resourceType"]; source_key: string;
      redmine_id: number; project_id: number; marker: string; snapshot: Record<string, string | number | null>;
    }>(
      `SELECT owner_hash, redmine_user_id, resource_type, source_key, redmine_id, project_id, marker, snapshot
       FROM managed_redmine_resources
       WHERE owner_hash=$1 AND resource_type=$2 AND source_key=$3 AND updated_at > now() - interval '90 days'`,
      [ownerHash, resourceType, sourceKey],
    );
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return { ownerHash: row.owner_hash, redmineUserId: row.redmine_user_id, resourceType: row.resource_type, sourceKey: row.source_key, redmineId: row.redmine_id, projectId: row.project_id, marker: row.marker, snapshot: row.snapshot };
  }

  async listManagedResources(ownerHash: string, resourceType: ManagedResource["resourceType"]): Promise<ManagedResource[]> {
    const result = await this.pool.query<{
      owner_hash: string; redmine_user_id: number; resource_type: ManagedResource["resourceType"]; source_key: string;
      redmine_id: number; project_id: number; marker: string; snapshot: Record<string, string | number | null>;
    }>(
      `SELECT owner_hash, redmine_user_id, resource_type, source_key, redmine_id, project_id, marker, snapshot
       FROM managed_redmine_resources
       WHERE owner_hash=$1 AND resource_type=$2 AND updated_at > now() - interval '90 days'`,
      [ownerHash, resourceType],
    );
    return result.rows.map((row) => ({ ownerHash: row.owner_hash, redmineUserId: row.redmine_user_id, resourceType: row.resource_type,
      sourceKey: row.source_key, redmineId: row.redmine_id, projectId: row.project_id, marker: row.marker, snapshot: row.snapshot }));
  }

  async saveManagedResource(resource: ManagedResource): Promise<void> {
    await this.pool.query(
      `INSERT INTO managed_redmine_resources (owner_hash, redmine_user_id, resource_type, source_key, redmine_id, project_id, marker, snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (owner_hash, resource_type, source_key) DO UPDATE SET
         redmine_user_id=EXCLUDED.redmine_user_id, redmine_id=EXCLUDED.redmine_id, project_id=EXCLUDED.project_id,
         marker=EXCLUDED.marker, snapshot=EXCLUDED.snapshot, updated_at=now()`,
      [resource.ownerHash, resource.redmineUserId, resource.resourceType, resource.sourceKey, resource.redmineId, resource.projectId, resource.marker, JSON.stringify(resource.snapshot)],
    );
  }

  async writeAudit(event: AuditEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO automation_audit (owner_hash, operation, resource_type, redmine_id, outcome) VALUES ($1,$2,$3,$4,$5)`,
      [event.ownerHash, event.operation, event.resourceType, event.redmineId ?? null, event.outcome],
    );
  }

  async cleanup(): Promise<void> {
    await this.pool.query(`DELETE FROM automation_previews WHERE expires_at <= now()`);
    await this.pool.query(`DELETE FROM managed_redmine_resources WHERE updated_at <= now() - interval '90 days'`);
    await this.pool.query(`DELETE FROM automation_audit WHERE created_at <= now() - interval '90 days'`);
  }

  async close(): Promise<void> { await this.pool.end(); }
}

function resourceKey(ownerHash: string, resourceType: ManagedResource["resourceType"], sourceKey: string): string {
  return `${ownerHash}:${resourceType}:${sourceKey}`;
}
