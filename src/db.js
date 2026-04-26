'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://banking:banking@localhost:5432/banking',
});

pool.on('error', (err) => {
  console.error('[support] Unexpected DB error', err);
});

async function initDb() {
  // Core tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    TEXT NOT NULL,
      subject    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      author_id  TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Extend tickets with realistic support fields (safe to run against existing schema)
  await pool.query(`
    ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS category     TEXT NOT NULL DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS priority     TEXT NOT NULL DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS assigned_to  TEXT,
      ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS resolved_at  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS closed_at    TIMESTAMPTZ
  `);

  // Read receipts on messages
  await pool.query(`
    ALTER TABLE ticket_messages
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE
  `);

  // Attachment metadata — tracks uploaded files linked to a ticket and optional message
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      message_id    UUID REFERENCES ticket_messages(id) ON DELETE SET NULL,
      uploader_id   TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name   TEXT NOT NULL,
      size          INTEGER NOT NULL,
      mime_type     TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // CSAT ratings — one per ticket, submitted by the owner after resolution
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_ratings (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id  UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL,
      rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log('[support] Database tables ready');
}

module.exports = { pool, initDb };
