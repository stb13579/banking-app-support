'use strict';

const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { subject } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'subject is required' });
    }

    const result = await pool.query(
      'INSERT INTO tickets (user_id, subject) VALUES ($1, $2) RETURNING *',
      [req.user.sub, subject]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.sub]
    );
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

    const messagesResult = await pool.query(
      'SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json({ ...ticketResult.rows[0], messages: messagesResult.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
