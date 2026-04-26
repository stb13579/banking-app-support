'use strict';

const { Router } = require('express');
const { pool } = require('../db');

const router = Router();

router.post('/:id/rate', async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;
    const { rating, comment } = req.body;

    const ratingNum = parseInt(rating, 10);
    if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
    );
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    if (ticket.user_id !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!['resolved', 'closed'].includes(ticket.status)) {
      return res.status(400).json({ error: 'Can only rate resolved or closed tickets' });
    }

    // Upsert — allow updating a previously submitted rating
    const result = await pool.query(
      `INSERT INTO ticket_ratings (ticket_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ticket_id) DO UPDATE
         SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
       RETURNING *`,
      [ticketId, req.user.sub, ratingNum, comment || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
