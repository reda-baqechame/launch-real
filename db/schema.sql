-- LaunchReel Phase 10 schema (Postgres)
-- Run: psql $DATABASE_URL -f db/schema.sql

CREATE TABLE IF NOT EXISTS app_users (
  clerk_id TEXT PRIMARY KEY,
  email TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  clerk_id TEXT NOT NULL REFERENCES app_users(clerk_id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_clerk ON projects(clerk_id);

CREATE TABLE IF NOT EXISTS render_jobs (
  id TEXT PRIMARY KEY,
  clerk_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  trigger_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_clerk ON render_jobs(clerk_id, created_at DESC);

CREATE TABLE IF NOT EXISTS oauth_connections (
  clerk_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (clerk_id, provider)
);

CREATE TABLE IF NOT EXISTS share_views (
  project_id TEXT PRIMARY KEY,
  view_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_events (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_events_project ON share_events(project_id, event_type);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
