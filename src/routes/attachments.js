'use strict';

const path = require('path');
const { Router } = require('express');
const multer = require('multer');

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.status(201).json({
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;

  // VULNERABILITY (Path Traversal): filename is taken from the URL and joined
  // with the uploads directory without sanitization.
  // Attacker payload: GET /attachments/download/../../etc/passwd
  // or:               GET /attachments/download/../../app/src/auth.js
  // Aikido SAST will flag path.join with unsanitized req.params input.
  const filePath = path.join(UPLOADS_DIR, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

module.exports = router;
