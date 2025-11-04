const express = require('express');
const TransactionController = require('../controllers/transactionController');
const { authenticate, authorize, audit } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validation');
const { transactionLimiter } = require('../middleware/security');

const router = express.Router();

// User routes
router.post(
  '/',
  authenticate,
  transactionLimiter,
  validateTransaction,
  audit('transaction_create', 'Transaction'),
  TransactionController.createTransaction
);

router.get(
  '/my-transactions',
  authenticate,
  TransactionController.getUserTransactions
);

router.get(
  '/:transactionId',
  authenticate,
  TransactionController.getTransactionById
);

// Approver/Admin routes
router.get(
  '/pending/approvals',
  authenticate,
  authorize('admin', 'approver'),
  TransactionController.getPendingApprovals
);

router.patch(
  '/:transactionId/approve',
  authenticate,
  authorize('admin', 'approver'),
  audit('transaction_approve', 'Transaction'),
  TransactionController.approveTransaction
);

router.patch(
  '/:transactionId/reject',
  authenticate,
  authorize('admin', 'approver'),
  audit('transaction_reject', 'Transaction'),
  TransactionController.rejectTransaction
);

module.exports = router;