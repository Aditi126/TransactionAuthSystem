const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const config = require('../config/environment');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user inactive.' 
      });
    }

    if (user.isLocked()) {
      return res.status(423).json({ 
        success: false, 
        message: 'Account temporarily locked due to too many failed attempts.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

const audit = (action, resourceType = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        const response = JSON.parse(data);
        
        if (response.success) {
          AuditLog.create({
            action,
            userId: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            resourceId: response.data?._id || req.params.id,
            resourceType,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            metadata: {
              method: req.method,
              url: req.originalUrl,
              ...(req.body && Object.keys(req.body).length > 0 && { body: req.body })
            }
          }).catch(console.error);
        }
      } catch (error) {
        // Silent fail for audit logging
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  audit
};