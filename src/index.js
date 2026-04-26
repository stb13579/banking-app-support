'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { initDb } = require('./db');
const authMiddleware = require('./auth');
const ticketsRouter = require('./routes/tickets');
const messagesRouter = require('./routes/messages');
const attachmentsRouter = require('./routes/attachments');
const adminRouter = require('./routes/admin');
const ratingsRouter = require('./routes/ratings');

const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors({ origin: '*' }));
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'banking-app-support', timestamp: new Date().toISOString() });
});

app.use(authMiddleware);

app.use('/tickets', ticketsRouter);
app.use('/tickets/:id/messages', messagesRouter);
app.use('/tickets', ratingsRouter);
app.use('/attachments', attachmentsRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    details: err,
  });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[support] Listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
