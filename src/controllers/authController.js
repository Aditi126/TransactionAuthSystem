const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const TwoFactorService = require('../services/twoFactorService');
const config = require('../config/environment');

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create user
      const user = new User({ email, password, role });
      await user.save();

      // Create audit log
      await AuditLog.create({
        action: 'user_create',
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { userId: user._id, email: user.email, role: user.role }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error registering user',
        error: error.message
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account temporarily locked. Please try again later.'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Reset login attempts on successful login
      await User.findByIdAndUpdate(user._id, {
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date()
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      // Create audit log
      await AuditLog.create({
        action: 'login',
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      const response = {
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            twoFactorEnabled: user.twoFactorEnabled
          }
        }
      };

      // If 2FA is enabled, require token verification
      if (user.twoFactorEnabled) {
        response.data.requires2FA = true;
        response.message = '2FA verification required';
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: error.message
      });
    }
  }

  static async verify2FA(req, res) {
    try {
      const { token } = req.body;
      const user = req.user;

      const isValid = await TwoFactorService.verifyToken(user, token);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Generate new JWT with 2FA verification flag
      const authToken = jwt.sign(
        { 
          userId: user._id, 
          email: user.email, 
          role: user.role,
          twoFactorVerified: true 
        },
        config.jwtSecret,
        { expiresIn: '12h' }
      );

      res.json({
        success: true,
        message: '2FA verification successful',
        data: {
          token: authToken,
          user: {
            id: user._id,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error during 2FA verification',
        error: error.message
      });
    }
  }

  static async setup2FA(req, res) {
    try {
      const user = req.user;

      if (user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: '2FA is already enabled'
        });
      }

      const twoFactorData = await TwoFactorService.generateSecret(user);

      res.json({
        success: true,
        message: '2FA secret generated',
        data: twoFactorData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error setting up 2FA',
        error: error.message
      });
    }
  }

  static async enable2FA(req, res) {
    try {
      const { token } = req.body;
      const user = req.user;

      await TwoFactorService.enable2FA(user._id, token);

      // Create audit log
      await AuditLog.create({
        action: '2fa_enable',
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: '2FA enabled successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  static async disable2FA(req, res) {
    try {
      const user = req.user;

      await TwoFactorService.disable2FA(user._id);

      // Create audit log
      await AuditLog.create({
        action: '2fa_disable',
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error disabling 2FA',
        error: error.message
      });
    }
  }
}

module.exports = AuthController;