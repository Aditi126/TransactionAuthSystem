const Transaction = require('../models/Transaction');

class TransactionService {
  static async createTransaction(transactionData) {
    const transaction = new Transaction(transactionData);
    
    // Calculate risk score
    transaction.riskScore = await this.calculateRiskScore(transactionData);
    
    await transaction.save();
    return transaction;
  }

  static async calculateRiskScore(transactionData) {
    let riskScore = 0;

    // Amount-based risk
    if (transactionData.amount > 10000) riskScore += 40;
    else if (transactionData.amount > 5000) riskScore += 20;
    else if (transactionData.amount > 1000) riskScore += 10;

    // Time-based risk (transactions at unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) riskScore += 15;

    // Frequency-based risk (would need more data in real implementation)
    
    return Math.min(riskScore, 100);
  }

  static async getPendingApprovals(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const transactions = await Transaction.find({ 
      status: 'pending', 
      requiresApproval: true 
    })
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({ 
      status: 'pending', 
      requiresApproval: true 
    });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async approveTransaction(transactionId, approverId) {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction cannot be approved');
    }

    transaction.status = 'approved';
    transaction.approvedBy = approverId;
    transaction.approvedAt = new Date();
    
    await transaction.save();
    return transaction;
  }

  static async rejectTransaction(transactionId, approverId) {
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction cannot be rejected');
    }

    transaction.status = 'rejected';
    transaction.approvedBy = approverId;
    transaction.approvedAt = new Date();
    
    await transaction.save();
    return transaction;
  }

  static async getUserTransactions(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({ userId });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = TransactionService;