const express = require('express');
const mongoose = require('mongoose');
const Account = require('../models/Account');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/accounts/me - all accounts belonging to the logged-in user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const accounts = await Account.find({ owner: req.user.id }).sort({ createdAt: 1 });
    res.json({ accounts: accounts.map((a) => a.toSafeObject()) });
  } catch (err) {
    console.error('Fetch accounts error:', err);
    res.status(500).json({ error: 'Could not load accounts.' });
  }
});

// POST /api/accounts - open an additional account for the logged-in user
router.post('/', requireAuth, async (req, res) => {
  try {
    const { accountType } = req.body;

    let accountNumber;
    do {
      accountNumber = Account.generateAccountNumber();
      // eslint-disable-next-line no-await-in-loop
    } while (await Account.findOne({ accountNumber }));

    const account = new Account({
      accountNumber,
      owner: req.user.id,
      accountType: accountType === 'current' ? 'current' : 'savings',
      balance: 0,
    });
    await account.save();
    res.status(201).json({ account: account.toSafeObject() });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ error: 'Could not open a new account.' });
  }
});

// GET /api/accounts/:id - single account (must belong to the user, unless admin)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid account id.' });
    }
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found.' });

    if (account.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have access to this account.' });
    }
    res.json({ account: account.toSafeObject() });
  } catch (err) {
    console.error('Fetch account error:', err);
    res.status(500).json({ error: 'Could not load account.' });
  }
});

module.exports = router;
