-- Notebook + conversation sharing
CREATE TABLE notes (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled note',
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notes_user ON notes(user_id);

ALTER TABLE conversations ADD COLUMN share_token VARCHAR(64) UNIQUE;
