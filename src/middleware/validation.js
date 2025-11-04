const Joi = require('joi');

const transactionSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be positive',
    'any.required': 'Amount is required'
  }),
  currency: Joi.string().length(3).uppercase().default('USD'),
  type: Joi.string().valid('transfer', 'withdrawal', 'payment', 'deposit').required(),
  fromAccount: Joi.string().min(5).max(50).required(),
  toAccount: Joi.string().min(5).max(50).required(),
  description: Joi.string().max(500).optional()
});

const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin', 'approver').default('user')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  };
};

module.exports = {
  validateTransaction: validate(transactionSchema),
  validateUserRegistration: validate(userRegistrationSchema),
  validateLogin: validate(loginSchema)
};