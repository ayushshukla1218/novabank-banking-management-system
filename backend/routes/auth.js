const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Account = require('../models/Account');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, accountType } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = new User({ fullName, email, phone, role: 'customer' });
    await user.setPassword(password);
    await user.save();

    // Auto-create a first bank account for the new customer
    let accountNumber;
    do {
      accountNumber = Account.generateAccountNumber();
      // eslint-disable-next-line no-await-in-loop
    } while (await Account.findOne({ accountNumber }));

    const account = new Account({
      accountNumber,
      owner: user._id,
      accountType: accountType === 'current' ? 'current' : 'savings',
      balance: 0,
    });
    await account.save();

    const token = signToken(user);
    res.status(201).json({ token, user: user.toSafeObject(), account: account.toSafeObject() });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'frozen') {
      return res.status(403).json({ error: 'Your account has been frozen. Contact support.' });
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
