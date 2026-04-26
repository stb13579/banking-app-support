'use strict';

const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

const VALID_CATEGORIES = ['billing', 'fraud_dispute', 'account_access', 'card_issue', 'transfer_issue', 'technical', 'general'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES   = ['open', 'in_progress', 'pending_customer', 'resolved', 'closed'];

const SLA_HOURS = { urgent: 4, high: 8, medium: 24, low: 72 };

const AGENTS = ['agent_sarah_k', 'agent_michael_t', 'agent_priya_r', 'agent_james_w'];

router.post('/', async (req, res, next) => {
  try {
    const { subject, category = 'general', priority = 'medium' } = req.body;

    if (!subject) return res.status(400).json({ error: 'subject is required' });
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    const slaDeadline = new Date(Date.now() + SLA_HOURS[priority] * 60 * 60 * 1000);
    const assignedTo  = AGENTS[Math.floor(Math.random() * AGENTS.length)];

    const result = await pool.query(
      `INSERT INTO tickets (user_id, subject, category, priority, assigned_to, sla_deadline)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.sub, subject, category, priority, assignedTo, slaDeadline]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { status, category, priority } = req.query;

    const params = [req.user.sub];
    let query = 'SELECT * FROM tickets WHERE user_id = $1';

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND priority = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [req.params.id]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const [messagesResult, attachmentsResult, ratingResult] = await Promise.all([
      pool.query(
        'SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      ),
      pool.query(
        'SELECT * FROM ticket_attachments WHERE ticket_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      ),
      pool.query(
        'SELECT * FROM ticket_ratings WHERE ticket_id = $1',
        [req.params.id]
      ),
    ]);

    res.json({
      ...ticketResult.rows[0],
      messages:    messagesResult.rows,
      attachments: attachmentsResult.rows,
      rating:      ratingResult.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [req.params.id]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (ticketResult.rows[0].user_id !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query(
      `UPDATE tickets
       SET status       = $1,
           resolved_at  = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
           closed_at    = CASE WHEN $1 = 'closed'   THEN NOW() ELSE closed_at   END
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/attachments', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ticket_attachments WHERE ticket_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
