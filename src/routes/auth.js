const express = require('express');
const AuthController = require('../controllers/authController');
const { validateUserRegistration, validateLogin } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

const router = express.Router();

router.post('/register', validateUserRegistration, AuthController.register);
router.post('/login', authLimiter, validateLogin, AuthController.login);
router.post('/verify-2fa', authenticate, AuthController.verify2FA);
router.post('/setup-2fa', authenticate, AuthController.setup2FA);
router.post('/enable-2fa', authenticate, AuthController.enable2FA);
router.post('/disable-2fa', authenticate, AuthController.disable2FA);

module.exports = router;