'use strict';

const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

const AGENTS = ['agent_sarah_k', 'agent_michael_t', 'agent_priya_r', 'agent_james_w'];

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.get('/tickets', requireAdmin, async (req, res, next) => {
  try {
    const { status, category, priority, user_id } = req.query;

    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`priority = $${params.length}`);
    }
    if (user_id) {
      params.push(user_id);
      conditions.push(`user_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM tickets ${where} ORDER BY created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/tickets/:id', requireAdmin, async (req, res, next) => {
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

router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const [byStatus, byCategory, byPriority, slaBreached] = await Promise.all([
      pool.query(`SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status`),
      pool.query(`SELECT category, COUNT(*)::int AS count FROM tickets GROUP BY category`),
      pool.query(`SELECT priority, COUNT(*)::int AS count FROM tickets GROUP BY priority`),
      pool.query(`SELECT COUNT(*)::int AS count FROM tickets WHERE sla_deadline < NOW() AND status NOT IN ('resolved', 'closed')`),
    ]);

    res.json({
      by_status:   byStatus.rows.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {}),
      by_category: byCategory.rows.reduce((acc, r) => ({ ...acc, [r.category]: r.count }), {}),
      by_priority: byPriority.rows.reduce((acc, r) => ({ ...acc, [r.priority]: r.count }), {}),
      sla_breached: slaBreached.rows[0].count,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/tickets/:id/assign', requireAdmin, async (req, res, next) => {
  try {
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ error: 'assigned_to is required' });
    }
    if (!AGENTS.includes(assigned_to)) {
      return res.status(400).json({ error: `assigned_to must be one of: ${AGENTS.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE tickets SET assigned_to = $1 WHERE id = $2 RETURNING *',
      [assigned_to, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
