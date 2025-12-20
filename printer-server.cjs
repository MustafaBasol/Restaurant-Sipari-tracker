// Optional Print Server for Kitchorify (demo)
//
// Purpose:
// - Receives print jobs from the frontend and writes them to stdout.
// - Can be extended to send ESC/POS over TCP, CUPS, etc.
//
// Setup:
//   npm install express cors dotenv
//   PORT=4243 CORS_ORIGINS=http://localhost:3000 node printer-server.cjs
//
// Frontend:
//   Set VITE_PRINT_SERVER_URL=http://localhost:4243
//
// NOTE: This repo primarily runs as a frontend-only demo (localStorage mock DB).

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  }),
);

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.send('Kitchorify Print Server is running.');
});

app.post('/api/print', (req, res) => {
  const { jobType, content } = req.body || {};

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ ok: false, message: 'content is required' });
  }

  const safeType = typeof jobType === 'string' ? jobType : 'unknown';
  console.log('--- PRINT JOB START ---');
  console.log(`type: ${safeType}`);
  console.log(content);
  console.log('--- PRINT JOB END ---');

  return res.json({ ok: true });
});

const PORT = process.env.PORT || 4243;
app.listen(PORT, () => console.log(`Print server listening on port ${PORT}`));
