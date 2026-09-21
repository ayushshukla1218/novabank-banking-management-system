require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const User = require('./models/User');
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
app.use(express.json());

// Basic rate limiting on auth endpoints to slow down brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbState: mongoose.connection.readyState });
});

// Generic error handler (e.g. malformed JSON bodies)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(400).json({ error: 'Bad request.' });
});

const PORT = process.env.PORT || 5000;

async function bootstrapAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await User.findOne({ email });
  if (existing) return;

  const admin = new User({ fullName: 'Bank Administrator', email, role: 'admin' });
  await admin.setPassword(password);
  await admin.save();
  console.log(`Bootstrap admin account created: ${email}`);
}

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    await bootstrapAdmin();
    app.listen(PORT, '0.0.0.0', () => console.log(`API server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
