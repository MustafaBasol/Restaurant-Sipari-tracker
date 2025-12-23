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
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const net = require('net');
const { spawn } = require('child_process');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  }),
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isDevelopment ? 600 : 240,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const requireApiKeyIfConfigured = (req, res, next) => {
  const apiKey = String(process.env.API_KEY || '').trim();
  if (!apiKey) return next();

  const provided = String(req.header('x-api-key') || '').trim();
  if (provided && provided === apiKey) return next();
  return res.status(401).json({ ok: false, message: 'Unauthorized' });
};

function getPrintTransport() {
  const value = String(process.env.PRINT_TRANSPORT || 'stdout')
    .trim()
    .toLowerCase();

  if (value === 'stdout' || value === 'tcp9100' || value === 'cups') return value;
  return 'stdout';
}

function toEscPosBuffer(text) {
  // Minimal ESC/POS payload:
  // - Initialize printer
  // - Print text
  // - Feed & cut
  // Notes:
  // - Many thermal printers expect a legacy code page (e.g., CP437/CP1254).
  // - UTF-8 works on some modern ESC/POS firmware.
  const init = Buffer.from([0x1b, 0x40]);
  const body = Buffer.from(String(text || ''), 'utf8');
  const lf = Buffer.from('\n', 'utf8');
  const feed = Buffer.from([0x1b, 0x64, 0x03]); // ESC d n (feed n lines)
  const cut = Buffer.from([0x1d, 0x56, 0x00]); // GS V 0 (full cut)
  return Buffer.concat([init, body, lf, feed, cut]);
}

function sendToTcp9100({ host, port, payload }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

    socket.once('error', reject);
    socket.connect(port, host, () => {
      socket.write(payload, (err) => {
        if (err) return reject(err);
        socket.end();
        return resolve();
      });
    });
  });
}

function sendToCups({ printerName, payload }) {
  return new Promise((resolve, reject) => {
    const args = ['-d', printerName, '-o', 'raw'];
    const child = spawn('lp', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve();
      return reject(new Error(stderr || `lp exited with code ${code}`));
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

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

app.use(apiLimiter);
app.use(requireApiKeyIfConfigured);

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    name: 'Kitchorify Print Server',
    transport: getPrintTransport(),
  });
});

app.post('/api/print', async (req, res) => {
  const { jobType, content } = req.body || {};

  if (typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ ok: false, message: 'content is required' });
  }

  const safeType = typeof jobType === 'string' ? jobType : 'unknown';
  const transport = getPrintTransport();

  try {
    if (transport === 'stdout') {
      console.log('--- PRINT JOB START ---');
      console.log(`type: ${safeType}`);
      console.log(content);
      console.log('--- PRINT JOB END ---');
    }

    if (transport === 'tcp9100') {
      const host = String(process.env.PRINTER_HOST || '').trim();
      const port = Number(process.env.PRINTER_PORT || 9100);
      if (!host) {
        return res.status(500).json({
          ok: false,
          message: 'PRINTER_HOST is required for tcp9100 transport',
        });
      }

      const payload = toEscPosBuffer(content);
      await sendToTcp9100({ host, port, payload });
    }

    if (transport === 'cups') {
      const printerName = String(process.env.PRINTER_NAME || '').trim();
      if (!printerName) {
        return res.status(500).json({
          ok: false,
          message: 'PRINTER_NAME is required for cups transport',
        });
      }

      const payload = toEscPosBuffer(content);
      await sendToCups({ printerName, payload });
    }

    return res.json({ ok: true, transport });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'print failed';
    return res.status(500).json({ ok: false, message, transport });
  }
});

const PORT = process.env.PORT || 4243;
app.listen(PORT, () => console.log(`Print server listening on port ${PORT}`));
