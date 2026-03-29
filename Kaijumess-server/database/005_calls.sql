CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ended_by UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'calling',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (type IN ('audio', 'video')),
    CHECK (status IN ('calling', 'ongoing', 'ended', 'rejected', 'busy', 'missed'))
);

CREATE INDEX IF NOT EXISTS idx_calls_conversation_created
    ON calls (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_initiated_by_created
    ON calls (initiated_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_status_active
    ON calls (status, created_at DESC)
    WHERE status IN ('calling', 'ongoing');
