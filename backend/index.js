const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

const frontend = process.env.FRONTEND_URL || "http://localhost:5173";

/* ================= CORS FIX FOR RENDER ================= */

const allowedOrigins = [
  frontend,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000"
];

console.log("CORS allowed origins:", allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {

    // allow Postman / server requests
    if (!origin) return callback(null, true);

    // allow exact origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // allow render deployed frontends
    if (origin.endsWith(".onrender.com")) {
      return callback(null, true);
    }

    console.warn("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* ================= SERVE FRONTEND (OPTIONAL) ================= */

const frontDir = path.join(__dirname, '..', '1234.html');

if (fs.existsSync(frontDir)) {
  app.use('/', express.static(frontDir));
  app.get('/', (req, res) =>
    res.sendFile(path.join(frontDir, '1234.html'))
  );
  console.log('Serving frontend from', frontDir);
}

/* ================= MONGODB ================= */

const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/cld_event';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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

    /* ================= SIGNUP ================= */

    app.post('/api/signup', async (req, res) => {
      try {
        const { email, password, name } = req.body;

        if (!email || !password)
          return res.status(400).json({ ok: false, error: 'Email and password required' });

        const exists = await usersColl.findOne({ email });
        if (exists)
          return res.status(400).json({ ok: false, error: 'User exists' });

        const hash = await bcrypt.hash(password, 10);

        const result = await usersColl.insertOne({
          email,
          passwordHash: hash,
          name: name || '',
          createdAt: new Date()
        });

        const token = jwt.sign(
          { id: result.insertedId, email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({ ok: true, token });

      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    /* ================= LOGIN ================= */

    app.post('/api/login', async (req, res) => {
      try {
        const { email, password } = req.body;

        const user = await usersColl.findOne({ email });
        if (!user)
          return res.status(400).json({ ok: false, error: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.passwordHash || '');
        if (!ok)
          return res.status(400).json({ ok: false, error: 'Invalid credentials' });

        const token = jwt.sign(
          { id: user._id.toString(), email: user.email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({ ok: true, token });

      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    /* ================= GOOGLE SIGNIN ================= */

    app.post('/api/google-signin', async (req, res) => {
      try {
        const { idToken } = req.body;
        if (!idToken)
          return res.status(400).json({ ok: false, error: 'idToken required' });

        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        let user = await usersColl.findOne({ email });

        if (!user) {
          const r = await usersColl.insertOne({
            email,
            name: payload.name || '',
            googleId: payload.sub,
            createdAt: new Date()
          });
          user = { _id: r.insertedId, email };
        }

        const token = jwt.sign(
          { id: user._id.toString(), email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.json({ ok: true, token });

      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    /* ================= AUTH MIDDLEWARE ================= */

    function authMiddleware(req, res, next) {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) return next();

      try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
      } catch (e) {}

      next();
    }

    app.use(authMiddleware);

    /* ================= SUBMIT ================= */

    app.post('/api/submit', async (req, res) => {
      try {
        const payload = req.body;
        payload.createdAt = new Date();
        if (req.user?.id) payload.userId = req.user.id;

        const r = await submissionsColl.insertOne(payload);
        res.json({ ok: true, id: r.insertedId });

      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    /* ================= GET SUBMISSIONS ================= */

    app.get('/api/submissions', async (req, res) => {
      try {
        const q = {};
        if (req.query.user === 'me' && req.user?.id) {
          q.userId = req.user.id;
        }

        const list = await submissionsColl
          .find(q)
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray();

        res.json({ ok: true, submissions: list });

      } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
      }
    });

    /* ================= CONFIG ================= */

    app.get('/api/config', (req, res) => {
      res.json({
        ok: true,
        googleClientId: GOOGLE_CLIENT_ID
      });
    });

    app.listen(port, () =>
      console.log(`API running on port ${port}`)
    );

  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  if (dbClient) await dbClient.close();
  process.exit(0);
});
