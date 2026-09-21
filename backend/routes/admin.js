const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map((u) => u.toSafeObject()) });
});

// GET /api/admin/accounts
router.get('/accounts', async (req, res) => {
  const accounts = await Account.find().populate('owner', 'fullName email').sort({ createdAt: -1 });
  res.json({ accounts });
});

// GET /api/admin/transactions
router.get('/transactions', async (req, res) => {
  const transactions = await Transaction.find()
    .populate('account', 'accountNumber')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json({ transactions });
});

// PATCH /api/admin/users/:id/status  { status: 'active' | 'frozen' }
router.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'frozen'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or frozen.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.status = status;
  await user.save();
  res.json({ user: user.toSafeObject() });
});

// PATCH /api/admin/accounts/:id/status  { status: 'active' | 'closed' | 'frozen' }
router.patch('/accounts/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'closed', 'frozen'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid account id.' });
  }
  const account = await Account.findById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  account.status = status;
  await account.save();
  res.json({ account: account.toSafeObject() });
});

module.exports = router;
