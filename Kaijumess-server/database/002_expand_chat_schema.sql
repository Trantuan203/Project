CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE users
    ALTER COLUMN username TYPE CITEXT USING username::citext,
    ALTER COLUMN email TYPE CITEXT USING email::citext;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE users
SET
    full_name = COALESCE(full_name, username::text),
    display_name = COALESCE(display_name, username::text),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE full_name IS NULL
   OR display_name IS NULL
   OR updated_at IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_status_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_status_check;
    END IF;

    ALTER TABLE users
        ADD CONSTRAINT users_status_check
        CHECK (status IN ('online', 'offline', 'away', 'dnd'));
END $$;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS topic VARCHAR(160),
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS participant_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE conversations
SET
    owner_id = COALESCE(owner_id, created_by),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE owner_id IS NULL
   OR updated_at IS NULL;

ALTER TABLE participants
    ADD COLUMN IF NOT EXISTS nickname VARCHAR(120),
    ADD COLUMN IF NOT EXISTS last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_delivered_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notification_level VARCHAR(20) NOT NULL DEFAULT 'all',
    ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'participants_role_check'
    ) THEN
        ALTER TABLE participants DROP CONSTRAINT participants_role_check;
    END IF;

    ALTER TABLE participants
        ADD CONSTRAINT participants_role_check
        CHECK (role IN ('owner', 'admin', 'member'));
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'participants_notification_level_check'
    ) THEN
        ALTER TABLE participants DROP CONSTRAINT participants_notification_level_check;
    END IF;

    ALTER TABLE participants
        ADD CONSTRAINT participants_notification_level_check
        CHECK (notification_level IN ('all', 'mentions', 'none'));
END $$;

UPDATE participants p
SET
    role = 'owner',
    updated_at = COALESCE(p.updated_at, p.joined_at, NOW())
FROM conversations c
WHERE p.conversation_id = c.id
  AND p.user_id = c.created_by
  AND p.role <> 'owner';

UPDATE participants
SET updated_at = COALESCE(updated_at, joined_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS client_message_id TEXT,
    ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS forwarded_from_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'sent',
    ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'messages_type_check'
    ) THEN
        ALTER TABLE messages DROP CONSTRAINT messages_type_check;
    END IF;

    ALTER TABLE messages
        ADD CONSTRAINT messages_type_check
        CHECK (type IN ('text', 'image', 'file', 'audio', 'video', 'system'));
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'messages_status_check'
    ) THEN
        ALTER TABLE messages DROP CONSTRAINT messages_status_check;
    END IF;

    ALTER TABLE messages
        ADD CONSTRAINT messages_status_check
        CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed'));
END $$;

UPDATE messages
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE attachments
    ALTER COLUMN size_bytes TYPE BIGINT USING size_bytes::BIGINT;

ALTER TABLE attachments
    ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) NOT NULL DEFAULT 'cloudinary',
    ADD COLUMN IF NOT EXISTS bucket_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS storage_key TEXT,
    ADD COLUMN IF NOT EXISTS public_id TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS preview_url TEXT,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS file_extension VARCHAR(20),
    ADD COLUMN IF NOT EXISTS width INTEGER,
    ADD COLUMN IF NOT EXISTS height INTEGER,
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'attachments_storage_provider_check'
    ) THEN
        ALTER TABLE attachments DROP CONSTRAINT attachments_storage_provider_check;
    END IF;

    ALTER TABLE attachments
        ADD CONSTRAINT attachments_storage_provider_check
        CHECK (storage_provider IN ('cloudinary', 'supabase', 'external'));
END $$;

UPDATE attachments
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_user_id),
    CHECK (blocker_id <> blocked_user_id)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_conversation_stats(target_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE conversations c
    SET
        participant_count = COALESCE((
            SELECT COUNT(*)
            FROM participants p
            WHERE p.conversation_id = target_conversation_id
              AND p.left_at IS NULL
              AND p.removed_at IS NULL
        ), 0),
        message_count = COALESCE((
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = target_conversation_id
              AND m.is_deleted = FALSE
        ), 0),
        last_message_id = (
            SELECT m.id
            FROM messages m
            WHERE m.conversation_id = target_conversation_id
              AND m.is_deleted = FALSE
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ),
        last_message_at = (
            SELECT m.created_at
            FROM messages m
            WHERE m.conversation_id = target_conversation_id
              AND m.is_deleted = FALSE
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ),
        updated_at = NOW()
    WHERE c.id = target_conversation_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_message_attachment_state(target_message_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE messages
    SET
        has_attachments = EXISTS (
            SELECT 1
            FROM attachments a
            WHERE a.message_id = target_message_id
        ),
        updated_at = NOW()
    WHERE id = target_message_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_conversation_stats_from_messages()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_conversation_stats(OLD.conversation_id);
        RETURN NULL;
    END IF;

    PERFORM refresh_conversation_stats(NEW.conversation_id);

    IF TG_OP = 'UPDATE' AND OLD.conversation_id IS DISTINCT FROM NEW.conversation_id THEN
        PERFORM refresh_conversation_stats(OLD.conversation_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_conversation_stats_from_participants()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_conversation_stats(OLD.conversation_id);
        RETURN NULL;
    END IF;

    PERFORM refresh_conversation_stats(NEW.conversation_id);

    IF TG_OP = 'UPDATE' AND OLD.conversation_id IS DISTINCT FROM NEW.conversation_id THEN
        PERFORM refresh_conversation_stats(OLD.conversation_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_message_attachment_state()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_message_attachment_state(OLD.message_id);
        RETURN NULL;
    END IF;

    PERFORM refresh_message_attachment_state(NEW.message_id);

    IF TG_OP = 'UPDATE' AND OLD.message_id IS DISTINCT FROM NEW.message_id THEN
        PERFORM refresh_message_attachment_state(OLD.message_id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_users_set_updated_at'
    ) THEN
        CREATE TRIGGER trg_users_set_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_conversations_set_updated_at'
    ) THEN
        CREATE TRIGGER trg_conversations_set_updated_at
        BEFORE UPDATE ON conversations
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_participants_set_updated_at'
    ) THEN
        CREATE TRIGGER trg_participants_set_updated_at
        BEFORE UPDATE ON participants
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_messages_set_updated_at'
    ) THEN
        CREATE TRIGGER trg_messages_set_updated_at
        BEFORE UPDATE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_attachments_set_updated_at'
    ) THEN
        CREATE TRIGGER trg_attachments_set_updated_at
        BEFORE UPDATE ON attachments
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_messages_refresh_conversation_stats'
    ) THEN
        CREATE TRIGGER trg_messages_refresh_conversation_stats
        AFTER INSERT OR UPDATE OR DELETE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION trg_refresh_conversation_stats_from_messages();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_participants_refresh_conversation_stats'
    ) THEN
        CREATE TRIGGER trg_participants_refresh_conversation_stats
        AFTER INSERT OR UPDATE OR DELETE ON participants
        FOR EACH ROW
        EXECUTE FUNCTION trg_refresh_conversation_stats_from_participants();
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_attachments_refresh_message_state'
    ) THEN
        CREATE TRIGGER trg_attachments_refresh_message_state
        AFTER INSERT OR UPDATE OR DELETE ON attachments
        FOR EACH ROW
        EXECUTE FUNCTION trg_refresh_message_attachment_state();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_status_last_seen
    ON users (status, last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
    ON conversations (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_participants_active_conversation
    ON participants (conversation_id, user_id)
    WHERE left_at IS NULL AND removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_active_conv_time
    ON messages (conversation_id, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_message_id
    ON messages (client_message_id)
    WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at
    ON messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
    ON messages (reply_to_message_id);

CREATE INDEX IF NOT EXISTS idx_attachments_storage_key
    ON attachments (storage_key);

CREATE INDEX IF NOT EXISTS idx_attachments_public_id
    ON attachments (public_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_user
    ON message_reads (user_id, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
    ON message_reactions (message_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
    ON user_blocks (blocker_id);

SELECT refresh_conversation_stats(id) FROM conversations;
SELECT refresh_message_attachment_state(id) FROM messages;
