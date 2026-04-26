'use strict';

const { Router } = require('express');
const { pool } = require('../db');

const router = Router({ mergeParams: true });

router.post('/', async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'body is required' });
    }

    const ticket = await pool.query('SELECT id FROM tickets WHERE id = $1', [ticketId]);
    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const result = await pool.query(
      'INSERT INTO ticket_messages (ticket_id, author_id, body) VALUES ($1, $2, $3) RETURNING *',
      [ticketId, req.user.sub, body]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/:messageId/read', async (req, res, next) => {
  try {
    const { id: ticketId, messageId } = req.params;

    const ticketResult = await pool.query(
      'SELECT user_id FROM tickets WHERE id = $1',
      [ticketId]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const msgResult = await pool.query(
      'SELECT * FROM ticket_messages WHERE id = $1 AND ticket_id = $2',
      [messageId, ticketId]
    );
    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const isTicketOwner = ticketResult.rows[0].user_id === req.user.sub;
    const isAuthor      = msgResult.rows[0].author_id === req.user.sub;

    if (!isTicketOwner && !isAuthor) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await pool.query(
      'UPDATE ticket_messages SET is_read = TRUE WHERE id = $1 RETURNING *',
      [messageId]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
