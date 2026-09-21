const express = require('express');
const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function loadOwnedAccount(accountId, userId, userRole) {
  if (!mongoose.Types.ObjectId.isValid(accountId)) return { error: 'Invalid account id.', status: 400 };
  const account = await Account.findById(accountId);
  if (!account) return { error: 'Account not found.', status: 404 };
  if (account.owner.toString() !== userId && userRole !== 'admin') {
    return { error: 'You do not have access to this account.', status: 403 };
  }
  if (account.status !== 'active') {
    return { error: `This account is ${account.status} and cannot transact.`, status: 400 };
  }
  return { account };
}

// POST /api/transactions/deposit  { accountId, amount, note }
router.post('/deposit', requireAuth, async (req, res) => {
  try {
    const { accountId, amount, note } = req.body;
    const amt = Number(amount);
    if (!accountId || !Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'A valid accountId and positive amount are required.' });
    }

    const result = await loadOwnedAccount(accountId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ error: result.error });
    const { account } = result;

    account.balance += amt;
    await account.save();

    const txn = await Transaction.create({
      type: 'deposit',
      account: account._id,
      amount: amt,
      balanceAfter: account.balance,
      note: note || '',
      reference: Transaction.generateReference(),
    });

    res.status(201).json({ account: account.toSafeObject(), transaction: txn });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Deposit failed. Please try again.' });
  }
});

// POST /api/transactions/withdraw  { accountId, amount, note }
router.post('/withdraw', requireAuth, async (req, res) => {
  try {
    const { accountId, amount, note } = req.body;
    const amt = Number(amount);
    if (!accountId || !Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'A valid accountId and positive amount are required.' });
    }

    const result = await loadOwnedAccount(accountId, req.user.id, req.user.role);
    if (result.error) return res.status(result.status).json({ error: result.error });
    const { account } = result;

    if (account.balance < amt) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    account.balance -= amt;
    await account.save();

    const txn = await Transaction.create({
      type: 'withdrawal',
      account: account._id,
      amount: amt,
      balanceAfter: account.balance,
      note: note || '',
      reference: Transaction.generateReference(),
    });

    res.status(201).json({ account: account.toSafeObject(), transaction: txn });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Withdrawal failed. Please try again.' });
  }
});

// POST /api/transactions/transfer  { fromAccountId, toAccountNumber, amount, note }
router.post('/transfer', requireAuth, async (req, res) => {
  try {
    const { fromAccountId, toAccountNumber, amount, note } = req.body;
    const amt = Number(amount);

    if (!fromAccountId || !toAccountNumber || !Number.isFinite(amt) || amt <= 0) {
      return res
        .status(400)
        .json({ error: 'fromAccountId, toAccountNumber and a positive amount are required.' });
    }

    const fromResult = await loadOwnedAccount(fromAccountId, req.user.id, req.user.role);
    if (fromResult.error) return res.status(fromResult.status).json({ error: fromResult.error });
    const fromAccount = fromResult.account;

    const toAccount = await Account.findOne({ accountNumber: String(toAccountNumber).trim() });
    if (!toAccount) return res.status(404).json({ error: 'Destination account number not found.' });
    if (toAccount.status !== 'active') {
      return res.status(400).json({ error: 'Destination account cannot receive funds.' });
    }
    if (toAccount._id.equals(fromAccount._id)) {
      return res.status(400).json({ error: 'Cannot transfer to the same account.' });
    }
    if (fromAccount.balance < amt) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // Note: for production use with a MongoDB replica set, wrap this in a
    // mongoose session + transaction for full atomicity. Standalone MongoDB
    // instances (common in local dev) do not support multi-document
    // transactions, so balances are updated sequentially here.
    fromAccount.balance -= amt;
    toAccount.balance += amt;
    await fromAccount.save();
    await toAccount.save();

    const reference = Transaction.generateReference();

    const [outTxn, inTxn] = await Promise.all([
      Transaction.create({
        type: 'transfer_out',
        account: fromAccount._id,
        counterpartyAccount: toAccount._id,
        amount: amt,
        balanceAfter: fromAccount.balance,
        note: note || '',
        reference,
      }),
      Transaction.create({
        type: 'transfer_in',
        account: toAccount._id,
        counterpartyAccount: fromAccount._id,
        amount: amt,
        balanceAfter: toAccount.balance,
        note: note || '',
        reference,
      }),
    ]);

    res.status(201).json({
      fromAccount: fromAccount.toSafeObject(),
      transaction: outTxn,
      reference,
    });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Transfer failed. Please try again.' });
  }
});

// GET /api/transactions/account/:accountId - history for one account
router.get('/account/:accountId', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.accountId)) {
      return res.status(400).json({ error: 'Invalid account id.' });
    }
    const account = await Account.findById(req.params.accountId);
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    if (account.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have access to this account.' });
    }

    const transactions = await Transaction.find({ account: account._id })
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ transactions });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Could not load transaction history.' });
  }
});

module.exports = router;
