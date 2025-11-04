const TransactionService = require('../services/transactionService');
const TwoFactorService = require('../services/twoFactorService');

class TransactionController {
  static async createTransaction(req, res) {
    try {
      const transactionData = {
        ...req.body,
        userId: req.user._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      // Check if 2FA is required and verified
      if (req.body.amount > 1000 && !req.user.twoFactorVerified) {
        return res.status(403).json({
          success: false,
          message: '2FA verification required for high-value transactions'
        });
      }

      const transaction = await TransactionService.createTransaction(transactionData);

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating transaction',
        error: error.message
      });
    }
  }

  static async getPendingApprovals(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const result = await TransactionService.getPendingApprovals(
        parseInt(page), 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching pending approvals',
        error: error.message
      });
    }
  }

  static async approveTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      
      const transaction = await TransactionService.approveTransaction(
        transactionId, 
        req.user._id
      );

      res.json({
        success: true,
        message: 'Transaction approved successfully',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async rejectTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      
      const transaction = await TransactionService.rejectTransaction(
        transactionId, 
        req.user._id
      );

      res.json({
        success: true,
        message: 'Transaction rejected successfully',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getUserTransactions(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const result = await TransactionService.getUserTransactions(
        req.user._id,
        parseInt(page), 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching transactions',
        error: error.message
      });
    }
  }

  static async getTransactionById(req, res) {
    try {
      const { transactionId } = req.params;
      
      const transaction = await Transaction.findById(transactionId)
        .populate('userId', 'email')
        .populate('approvedBy', 'email');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Check if user has permission to view this transaction
      if (req.user.role === 'user' && transaction.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this transaction'
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching transaction',
        error: error.message
      });
    }
  }
}

module.exports = TransactionController;