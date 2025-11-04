const AuditLog = require('../models/AuditLog');

class AuditController {
  static async getAuditLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        action, 
        userId, 
        startDate, 
        endDate 
      } = req.query;

      const filter = {};
      
      if (action) filter.action = action;
      if (userId) filter.userId = userId;
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      
      const logs = await AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await AuditLog.countDocuments(filter);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching audit logs',
        error: error.message
      });
    }
  }

  static async getUserActivity(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;
      
      const logs = await AuditLog.find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await AuditLog.countDocuments({ userId });

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching user activity',
        error: error.message
      });
    }
  }
}

module.exports = AuditController;