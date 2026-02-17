const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [frontend, 'http://127.0.0.1:5173', 'http://localhost:5173', 'http://localhost:3000'];
console.log('CORS allowed origins:', allowedOrigins);
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser tools or same-origin
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    console.warn('Blocked CORS origin:', origin);
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json());
// Serve frontend files so the app can be loaded from the same origin (required for Google Identity)
const frontDir = path.join(__dirname, '..', '1234.html');
if (fs.existsSync(frontDir)) {
  app.use('/', express.static(frontDir));
  app.get('/', (req, res) => res.sendFile(path.join(frontDir, '1234.html')));
  console.log('Serving frontend from', frontDir);
} else {
  console.warn('Frontend directory not found at', frontDir);
}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cld_event';
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  console.warn('MONGO_URI not set in environment — defaulting to localhost:', mongoUri);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Ensure GOOGLE_CLIENT_ID is available: prefer env, fall back to .env or .env.example file
let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
if (!GOOGLE_CLIENT_ID) {
  try {
    const tryFiles = [path.join(__dirname, '.env'), path.join(__dirname, '.env.example')];
    for (const f of tryFiles) {
      if (!fs.existsSync(f)) continue;
      const content = fs.readFileSync(f, 'utf8');
      const m = content.match(/^\s*GOOGLE_CLIENT_ID\s*=\s*(.+)\s*$/m);
      if (m && m[1]) {
        // remove optional quotes
        GOOGLE_CLIENT_ID = m[1].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        break;
      }
    }
  } catch (err) {
    console.warn('Could not read env files for GOOGLE_CLIENT_ID', err && err.message);
  }
}
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

let dbClient;
let submissionsColl;

async function start() {
  try {
    dbClient = new MongoClient(mongoUri);
    await dbClient.connect();
    const db = dbClient.db(process.env.MONGO_DB || 'cld_event');
    submissionsColl = db.collection('submissions');
    const usersColl = db.collection('users');
    console.log('Connected to MongoDB');

    // Signup
    app.post('/api/signup', async (req, res) => {
      try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });
        const exists = await usersColl.findOne({ email });
        if (exists) return res.status(400).json({ ok: false, error: 'User exists' });
        const hash = await bcrypt.hash(password, 10);
        const u = { email, passwordHash: hash, name: name || '', createdAt: new Date() };
        const r = await usersColl.insertOne(u);
        const user = { id: r.insertedId, email };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
        res.json({ ok: true, token });
      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Login
    app.post('/api/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });
        const user = await usersColl.findOne({ email });
        if (!user) return res.status(400).json({ ok: false, error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.passwordHash || '');
        if (!ok) return res.status(400).json({ ok: false, error: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ ok: true, token });
      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Google sign-in (client sends idToken)
    app.post('/api/google-signin', async (req, res) => {
      try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ ok: false, error: 'idToken required' });
        const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID || undefined });
        const payload = ticket.getPayload();
        const email = payload.email;
        let user = await usersColl.findOne({ email });
        if (!user) {
          const newUser = { email, name: payload.name || '', googleId: payload.sub, createdAt: new Date() };
          const r = await usersColl.insertOne(newUser);
          user = Object.assign(newUser, { _id: r.insertedId });
        }
        const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ ok: true, token });
      } catch (err) {
        console.error('Google sign-in failed', err && err.message ? err.message : err);
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Server-side OAuth flow: redirect to Google
    app.get('/auth/google', (req, res) => {
      try {
        const oauth2Client = new OAuth2Client(
          GOOGLE_CLIENT_ID || undefined,
          process.env.GOOGLE_CLIENT_SECRET || undefined,
          process.env.GOOGLE_CALLBACK_URL || undefined
        );
        const url = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['profile', 'email'],
        });
        res.redirect(url);
      } catch (err) {
        console.error('Failed to start Google OAuth', err && err.message ? err.message : err);
        res.status(500).send('Google OAuth error');
      }
    });

    // OAuth callback: exchange code, create/find user, return JWT (redirect to frontend with token)
    app.get('/auth/google/callback', async (req, res) => {
      try {
        const code = req.query.code;
        if (!code) return res.status(400).send('Missing code');
        const oauth2Client = new OAuth2Client(
          GOOGLE_CLIENT_ID || undefined,
          process.env.GOOGLE_CLIENT_SECRET || undefined,
          process.env.GOOGLE_CALLBACK_URL || undefined
        );
        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens || !tokens.id_token) return res.status(400).send('No id_token returned');
        const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID || undefined });
        const payload = ticket.getPayload();
        const email = payload.email;
        let user = await usersColl.findOne({ email });
        if (!user) {
          const newUser = { email, name: payload.name || '', googleId: payload.sub, createdAt: new Date() };
          const r = await usersColl.insertOne(newUser);
          user = Object.assign(newUser, { _id: r.insertedId });
        }
        const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        const redirectTo = (process.env.FRONTEND_URL || frontend) + `/?token=${encodeURIComponent(token)}`;
        res.redirect(redirectTo);
      } catch (err) {
        console.error('Google OAuth callback failed', err && err.message ? err.message : err);
        res.status(500).send('Google OAuth callback error');
      }
    });

    // Middleware to decode JWT and attach userId
    function authMiddleware(req, res, next) {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) return next();
      const token = auth.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
      } catch (err) {
        // ignore invalid token
      }
      next();
    }

    app.use(authMiddleware);

    // Submit endpoint (stores user if authenticated)
    app.post('/api/submit', async (req, res) => {
      try {
        const payload = req.body || {};
        payload.createdAt = new Date();
        if (req.user && req.user.id) payload.userId = req.user.id;
        const r = await submissionsColl.insertOne(payload);
        res.json({ ok: true, id: r.insertedId, payload });
      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    // Get submissions (optionally only current user)
    app.get('/api/submissions', async (req, res) => {
      try {
        const q = {};
        if (req.query.user === 'me' && req.user && req.user.id) {
          q.userId = req.user.id;
        }
        const list = await submissionsColl.find(q).sort({ createdAt: -1 }).limit(100).toArray();
        res.json({ ok: true, submissions: list });
      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
    // expose small config for frontend (e.g., Google client id)
    app.get('/api/config', (req, res) => {
      res.json({ ok: true, googleClientId: GOOGLE_CLIENT_ID || '' });
    });
  } catch (err) {
    console.error('Failed to start server:', err && err.message ? err.message : err);
    if (err && err.name === 'MongoNetworkError') {
      console.error('Cannot connect to MongoDB. Ensure mongod is running and MONGO_URI is correct.');
    }
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  if (dbClient) await dbClient.close();
  process.exit(0);
});
