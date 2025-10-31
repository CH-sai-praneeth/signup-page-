const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  transactionId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  claimId: String,
  amount: Number,
  status: String, // COMPLETED, CANCELLED, FAILED
  payerEmail: String,
  appName: String,
  metadata: Object
}, {
  timestamps: true
});

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);