const express = require('express');
const AuditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin only routes
router.get(
  '/logs',
  authenticate,
  authorize('admin'),
  AuditController.getAuditLogs
);

router.get(
  '/user-activity/:userId',
  authenticate,
  authorize('admin'),
  AuditController.getUserActivity
);

module.exports = router;