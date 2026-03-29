CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    CHECK (requester_id <> addressee_id),
    CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair
    ON friendships (
        LEAST(requester_id, addressee_id),
        GREATEST(requester_id, addressee_id)
    );

CREATE INDEX IF NOT EXISTS idx_friendships_requester
    ON friendships (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee
    ON friendships (addressee_id, status);
