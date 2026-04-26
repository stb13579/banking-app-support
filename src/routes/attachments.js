'use strict';

const path = require('path');
const { Router } = require('express');
const multer = require('multer');
const { pool } = require('../db');

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: `File type not allowed. Accepted types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      });
    }

    const { ticket_id = null, message_id = null } = req.body;

    const result = await pool.query(
      `INSERT INTO ticket_attachments
         (ticket_id, message_id, uploader_id, original_name, stored_name, size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        ticket_id,
        message_id || null,
        req.user.sub,
        req.file.originalname,
        req.file.filename,
        req.file.size,
        req.file.mimetype,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

module.exports = router;
