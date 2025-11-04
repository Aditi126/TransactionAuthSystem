const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  type: {
    type: String,
    enum: ['transfer', 'withdrawal', 'payment', 'deposit'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
    default: 'pending'
  },
  fromAccount: {
    type: String,
    required: true
  },
  toAccount: {
    type: String,
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  twoFactorVerified: {
    type: Boolean,
    default: false
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ requiresApproval: 1 });
transactionSchema.index({ amount: -1 });
transactionSchema.index({ createdAt: -1 });

// Virtual for high-value transactions
transactionSchema.virtual('isHighValue').get(function() {
  return this.amount > 10000; // Threshold for high-value transactions
});

// Pre-save middleware to set requiresApproval
transactionSchema.pre('save', function(next) {
  if (this.amount > 5000) { // Approval threshold
    this.requiresApproval = true;
    this.status = 'pending';
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);