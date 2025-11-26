/**
 * User Registration & Management Service
 * Handles user registration, email verification, and tier management
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

class UserService {
  constructor(mongoService) {
    this.mongoService = mongoService;
    this.db = null;
    this.collections = {};
    
    // Email transporter (configure in .env)
    this.transporter = null;
    this.initEmailTransporter();
  }

  /**
   * Initialize MongoDB collections (call after DB is connected)
   */
  initCollections() {
    if (this.mongoService && this.mongoService.db) {
      this.db = this.mongoService.db;
      this.collections = {
        users: this.db.collection('verified_users'),
        pending: this.db.collection('pending_users'),
        verificationTokens: this.db.collection('verification_tokens')
      };
      return true;
    }
    return false;
  }

  /**
   * Ensure collections are initialized
   */
  ensureCollections() {
    if (!this.collections.users) {
      this.initCollections();
    }
    if (!this.collections.users) {
      throw new Error('Database not connected. Please try again later.');
    }
  }

  /**
   * Initialize email transporter
   */
  initEmailTransporter() {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('✅ Email transporter initialized');
      
      // Verify connection on startup (non-blocking)
      this.transporter.verify((error, success) => {
        if (error) {
          console.warn('⚠️  SMTP connection test failed:', error.message);
          console.warn('   Emails will be logged to console instead');
        } else {
          console.log('✅ SMTP connection verified');
        }
      });
    } else {
      console.warn('⚠️  Email not configured. Set SMTP_USER and SMTP_PASS in .env');
    }
  }

  /**
   * Register a new user (pending email verification)
   * @param {Object} userData - { email, publicKey, password }
   * @returns {Promise<Object>} Registration result
   */
  async registerUser({ email, publicKey, password }) {
    try {
      this.ensureCollections();
      
      // Validate inputs
      if (!email || !publicKey || !password) {
        throw new Error('Email, publicKey, and password are required');
      }

      // Check if email already exists
      const existingUser = await this.collections.users.findOne({ email });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const existingPending = await this.collections.pending.findOne({ email });
      if (existingPending) {
        throw new Error('Email already pending verification. Check your inbox.');
      }

      // Check if publicKey already exists
      const existingPubKey = await this.collections.users.findOne({ publicKey });
      if (existingPubKey) {
        throw new Error('Public key already registered');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create pending user
      const pendingUser = {
        email,
        publicKey,
        passwordHash,
        verificationToken,
        tokenExpiry,
        createdAt: new Date(),
        tier: 'free',
        requestCount: 0,
        monthlyLimit: 100,
        resetDate: this.getNextMonthDate()
      };

      await this.collections.pending.insertOne(pendingUser);

      // Send verification email (non-blocking - don't fail registration if email fails)
      this.sendVerificationEmail(email, verificationToken).catch(err => {
        console.error('[UserService] Failed to send verification email:', err.message);
      });

      return {
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        email,
        publicKey,
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
      };
    } catch (error) {
      console.error('[UserService] Registration error:', error);
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, token) {
    if (!this.transporter) {
      console.warn('[UserService] Email not configured, skipping verification email');
      // In development, log the token
      console.log(`\n📧 Verification URL: ${process.env.BASE_URL || 'http://localhost:3000'}/api/users/verify?token=${token}\n`);
      return;
    }

    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/users/verify?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: '🔐 Verify Your Lumen Bridge Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Welcome to Lumen Bridge!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      display: inline-block;
                      font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this URL into your browser:</p>
          <p style="background: #f4f4f4; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
      console.error('[UserService] Email send error:', error.message);
      // Log the verification URL for development/debugging
      console.log(`\n📧 Manual verification URL: ${verificationUrl}\n`);
      // Don't throw - let registration succeed even if email fails
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    try {
      this.ensureCollections();
      
      const pendingUser = await this.collections.pending.findOne({ verificationToken: token });

      if (!pendingUser) {
        throw new Error('Invalid verification token');
      }

      if (new Date() > pendingUser.tokenExpiry) {
        throw new Error('Verification token expired');
      }

      // Move to verified users
      const verifiedUser = {
        email: pendingUser.email,
        publicKey: pendingUser.publicKey,
        passwordHash: pendingUser.passwordHash,
        tier: pendingUser.tier,
        requestCount: 0,
        monthlyLimit: pendingUser.monthlyLimit,
        resetDate: pendingUser.resetDate,
        verifiedAt: new Date(),
        createdAt: pendingUser.createdAt
      };

      await this.collections.users.insertOne(verifiedUser);
      await this.collections.pending.deleteOne({ verificationToken: token });

      console.log(`✅ User verified: ${verifiedUser.email}`);

      return {
        success: true,
        message: 'Email verified successfully! You can now use your account.',
        user: {
          email: verifiedUser.email,
          publicKey: verifiedUser.publicKey,
          tier: verifiedUser.tier,
          monthlyLimit: verifiedUser.monthlyLimit
        }
      };
    } catch (error) {
      console.error('[UserService] Verification error:', error);
      throw error;
    }
  }

  /**
   * Get user by public key
   */
  async getUserByPublicKey(publicKey) {
    this.ensureCollections();
    return await this.collections.users.findOne({ publicKey });
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    this.ensureCollections();
    return await this.collections.users.findOne({ email });
  }

  /**
   * Authenticate user (login)
   */
  async authenticateUser(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      return {
        success: true,
        user: {
          email: user.email,
          publicKey: user.publicKey,
          tier: user.tier,
          monthlyLimit: user.monthlyLimit,
          requestCount: user.requestCount
        }
      };
    } catch (error) {
      console.error('[UserService] Authentication error:', error);
      throw error;
    }
  }

  /**
   * Increment user request count
   */
  async incrementRequestCount(publicKey) {
    this.ensureCollections();
    
    const user = await this.getUserByPublicKey(publicKey);
    
    if (!user) return;

    // Check if month has rolled over
    if (new Date() > user.resetDate) {
      await this.collections.users.updateOne(
        { publicKey },
        {
          $set: {
            requestCount: 1,
            resetDate: this.getNextMonthDate()
          }
        }
      );
    } else {
      await this.collections.users.updateOne(
        { publicKey },
        { $inc: { requestCount: 1 } }
      );
    }
  }

  /**
   * Upgrade user tier
   */
  async upgradeUserTier(publicKey, newTier) {
    this.ensureCollections();
    
    const tierLimits = {
      free: 100,
      pro: 10000,
      enterprise: -1 // unlimited
    };

    const limit = tierLimits[newTier];
    if (limit === undefined) {
      throw new Error('Invalid tier');
    }

    await this.collections.users.updateOne(
      { publicKey },
      {
        $set: {
          tier: newTier,
          monthlyLimit: limit,
          upgradedAt: new Date()
        }
      }
    );

    console.log(`✅ User upgraded to ${newTier} tier`);
  }

  /**
   * Get next month date for reset
   */
  getNextMonthDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Get user stats
   */
  async getUserStats(publicKey) {
    const user = await this.getUserByPublicKey(publicKey);
    
    if (!user) {
      throw new Error('User not found');
    }

    const remaining = user.monthlyLimit === -1 
      ? 'unlimited' 
      : user.monthlyLimit - user.requestCount;

    return {
      email: user.email,
      publicKey: user.publicKey,
      tier: user.tier,
      requestCount: user.requestCount,
      monthlyLimit: user.monthlyLimit === -1 ? 'unlimited' : user.monthlyLimit,
      remaining,
      resetDate: user.resetDate,
      verifiedAt: user.verifiedAt
    };
  }
}

export default UserService;
