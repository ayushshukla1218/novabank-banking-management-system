const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountType: { type: String, enum: ['savings', 'current'], default: 'savings' },
    balance: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['active', 'closed', 'frozen'], default: 'active' },
  },
  { timestamps: true }
);

// Generates a pseudo-unique 12 digit account number, e.g. 400123456789
accountSchema.statics.generateAccountNumber = function () {
  const prefix = '40';
  let rest = '';
  for (let i = 0; i < 10; i++) rest += Math.floor(Math.random() * 10);
  return prefix + rest;
};

accountSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    accountNumber: this.accountNumber,
    accountType: this.accountType,
    balance: this.balance,
    currency: this.currency,
    status: this.status,
    owner: this.owner,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Account', accountSchema);
