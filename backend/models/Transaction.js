const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer_out', 'transfer_in'],
      required: true,
    },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    // For transfers, the account on the other side of the transaction
    counterpartyAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    amount: { type: Number, required: true, min: 0.01 },
    balanceAfter: { type: Number, required: true },
    note: { type: String, trim: true, default: '' },
    reference: { type: String, required: true }, // human-friendly transaction id shown to users
  },
  { timestamps: true }
);

transactionSchema.statics.generateReference = function () {
  return 'TXN' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);
};

module.exports = mongoose.model('Transaction', transactionSchema);
