import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL é obrigatória para executar migrations.");

const pool = new Pool({ connectionString, max: 1 });

async function migrate() {
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS automation_previews (
      id uuid PRIMARY KEY,
      owner_hash text NOT NULL,
      key_fingerprint text NOT NULL,
      redmine_user_id integer NOT NULL,
      expires_at timestamptz NOT NULL,
      payload jsonb NOT NULL,
      submitting boolean NOT NULL DEFAULT false,
      result jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS automation_previews_expiry_idx ON automation_previews (expires_at);

    CREATE TABLE IF NOT EXISTS managed_redmine_resources (
      owner_hash text NOT NULL,
      redmine_user_id integer NOT NULL,
      resource_type text NOT NULL CHECK (resource_type IN ('issue', 'time-entry')),
      source_key text NOT NULL,
      redmine_id integer NOT NULL CHECK (redmine_id > 0),
      project_id integer NOT NULL CHECK (project_id = 333),
      marker text NOT NULL,
      snapshot jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (owner_hash, resource_type, source_key),
      UNIQUE (owner_hash, resource_type, redmine_id)
    );
    CREATE INDEX IF NOT EXISTS managed_resources_retention_idx ON managed_redmine_resources (updated_at);

    CREATE TABLE IF NOT EXISTS automation_audit (
      id bigserial PRIMARY KEY,
      owner_hash text NOT NULL,
      operation text NOT NULL CHECK (operation IN ('create', 'update', 'reuse', 'blocked')),
      resource_type text NOT NULL CHECK (resource_type IN ('issue', 'time-entry', 'preview')),
      redmine_id integer,
      outcome text NOT NULL CHECK (outcome IN ('success', 'failure')),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS automation_audit_retention_idx ON automation_audit (created_at);
  `);
  console.log("Migrations concluídas.");
} finally {
  await pool.end();
}
}

migrate().catch(() => {
  console.error("Não foi possível aplicar as migrations.");
  process.exitCode = 1;
});
