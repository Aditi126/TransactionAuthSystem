const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

class TwoFactorService {
  static async generateSecret(user) {
    const secret = speakeasy.generateSecret({
      name: `TransactionAuth (${user.email})`,
      issuer: 'Secure Transaction System'
    });

    await User.findByIdAndUpdate(user._id, {
      twoFactorSecret: secret.base32
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    return {
      secret: secret.base32,
      qrCodeUrl
    };
  }

  static async verifyToken(user, token) {
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 30 seconds before and after
    });

    return verified;
  }

  static async enable2FA(userId, token) {
    const user = await User.findById(userId);
    
    if (!user.twoFactorSecret) {
      throw new Error('2FA secret not generated');
    }

    const isValid = await this.verifyToken(user, token);
    
    if (!isValid) {
      throw new Error('Invalid 2FA token');
    }

    user.twoFactorEnabled = true;
    await user.save();

    return true;
  }

  static async disable2FA(userId) {
    await User.findByIdAndUpdate(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null
    });

    return true;
  }
}

module.exports = TwoFactorService;