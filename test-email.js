/**
 * Test email configuration
 * Run: node test-email.js
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  debug: true,
  logger: true
};

console.log('📧 Testing email configuration...\n');
console.log('Configuration:');
console.log(`  Host: ${emailConfig.host}`);
console.log(`  Port: ${emailConfig.port}`);
console.log(`  Secure: ${emailConfig.secure}`);
console.log(`  User: ${emailConfig.auth.user}`);
console.log(`  Pass: ${emailConfig.auth.pass ? '***' + emailConfig.auth.pass.slice(-4) : 'NOT SET'}\n`);

const transporter = nodemailer.createTransport(emailConfig);

// Test connection
console.log('🔌 Testing SMTP connection...\n');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } else {
    console.log('✅ SMTP connection successful!\n');
    
    // Send test email
    console.log('📨 Sending test email...\n');
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to self
      subject: '🔐 Lumen Bridge - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Email Test Successful!</h2>
          <p>This is a test email from Lumen Bridge.</p>
          <p>If you receive this, your email configuration is working correctly.</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Configuration:</strong><br>
            Host: ${emailConfig.host}<br>
            Port: ${emailConfig.port}<br>
            Secure: ${emailConfig.secure}<br>
            From: ${emailConfig.auth.user}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Failed to send test email:', err.message);
        console.error('\nFull error:', err);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('\nResponse:', info.response);
        console.log(`Message ID: ${info.messageId}`);
        console.log(`\nCheck inbox: ${process.env.SMTP_USER}`);
        process.exit(0);
      }
    });
  }
});
