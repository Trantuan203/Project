CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address INET,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(40)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
    ON user_sessions (user_id, last_seen_at DESC)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at
    ON user_sessions (created_at DESC);
