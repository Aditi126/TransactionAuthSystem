require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/transaction_auth?authSource=admin';

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
})
.then(() => {
  console.log('✅ MongoDB Connected!');
  console.log('📊 Database:', mongoose.connection.name);
})
.catch(error => {
  console.log('❌ MongoDB Connection Failed:', error.message);
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['transfer', 'withdrawal', 'deposit'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  fromAccount: { type: String, required: true },
  toAccount: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Transaction Auth System API',
    endpoints: {
      'GET /health': 'Server health check',
      'POST /api/auth/register': 'Register new user',
      'POST /api/auth/login': 'User login',
      'POST /api/transactions': 'Create transaction',
      'GET /api/transactions': 'Get user transactions',
      'GET /api/users': 'Get all users (debug)'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    success: true,
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;
    
    console.log('Registration attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user exists
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

    console.log('User registered successfully:', email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    console.log('Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
});

// Create Transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { amount, type, fromAccount, toAccount, description } = req.body;
    
    if (!amount || !type || !fromAccount || !toAccount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, type, fromAccount, toAccount'
      });
    }

    // Get first user as creator (for demo)
    const user = await User.findOne();
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'No users found. Please register first.'
      });
    }

    const transaction = new Transaction({
      userId: user._id,
      amount,
      type,
      fromAccount,
      toAccount,
      description: description || '',
      status: amount > 5000 ? 'pending' : 'completed'
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });

  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating transaction',
      error: error.message
    });
  }
});

// Get User Transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().populate('userId', 'email');
    
    res.json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
});

// Debug: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/transactions`);
  console.log(`   GET  /api/transactions`);
  console.log(`   GET  /api/users`);
});