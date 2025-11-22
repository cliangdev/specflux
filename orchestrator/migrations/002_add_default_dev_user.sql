-- UP
-- ============================================================================
-- Add default development user for optional auth mode
-- This user (ID 1) is used when no X-User-Id header is provided
-- ============================================================================

INSERT OR IGNORE INTO users (id, email, display_name)
VALUES (1, 'dev@specflux.local', 'Development User');

-- DOWN
DELETE FROM users WHERE id = 1 AND email = 'dev@specflux.local';
