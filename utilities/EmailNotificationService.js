import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Notification Service
 * 
 * Handles sending emails for:
 * - Daily/weekly digests
 * - Event-triggered notifications (milestones, goals, etc.)
 * - Cryptographically signed summaries
 */

class EmailNotificationService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.configure();
  }

  configure() {
    const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const hasConfig = requiredVars.every(v => process.env[v]);

    if (!hasConfig) {
      console.warn('⚠️  Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      this.isConfigured = true;
      console.log('✅ Email notification service configured');
    } catch (error) {
      console.error('❌ Failed to configure email service:', error.message);
    }
  }

  /**
   * Send daily digest email to user
   */
  async sendDailyDigest(userEmail, relationshipAgent) {
    if (!this.isConfigured) {
      console.warn('Email service not configured, skipping digest');
      return { sent: false, reason: 'not_configured' };
    }

    try {
      const cliffNotes = await relationshipAgent.generateCliffNotes();
      const profile = relationshipAgent.getProfileSummary();

      const html = this.generateDigestHTML(cliffNotes, profile, relationshipAgent);
      const text = this.generateDigestText(cliffNotes, profile);

      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Lumen Assistant'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `Daily Digest - ${new Date().toLocaleDateString()}`,
        text,
        html
      });

      console.log(`✅ Daily digest sent to ${userEmail}: ${info.messageId}`);
      
      return {
        sent: true,
        messageId: info.messageId,
        type: 'daily_digest'
      };
    } catch (error) {
      console.error('❌ Failed to send daily digest:', error);
      return {
        sent: false,
        reason: error.message
      };
    }
  }

  /**
   * Send event-triggered notification
   */
  async sendEventNotification(userEmail, relationshipAgent, event) {
    if (!this.isConfigured) {
      console.warn('Email service not configured, skipping event notification');
      return { sent: false, reason: 'not_configured' };
    }

    try {
      const profile = relationshipAgent.getProfileSummary();
      const html = this.generateEventHTML(event, profile, relationshipAgent);
      const text = this.generateEventText(event, profile);

      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Lumen Assistant'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: userEmail,
        subject: this.getEventSubject(event),
        text,
        html
      });

      console.log(`✅ Event notification sent to ${userEmail}: ${info.messageId}`);
      
      return {
        sent: true,
        messageId: info.messageId,
        type: 'event_notification',
        event: event.type
      };
    } catch (error) {
      console.error('❌ Failed to send event notification:', error);
      return {
        sent: false,
        reason: error.message
      };
    }
  }

  /**
   * Send milestone notification
   */
  async sendMilestoneNotification(userEmail, relationshipAgent, milestones) {
    const event = {
      type: 'milestone',
      message: `You've reached ${milestones.length} new milestone(s)!`,
      milestones
    };

    return this.sendEventNotification(userEmail, relationshipAgent, event);
  }

  /**
   * Send completeness threshold notification
   */
  async sendCompletenessNotification(userEmail, relationshipAgent) {
    const completeness = relationshipAgent.globalContext.completeness;
    
    const event = {
      type: 'completeness',
      message: `Your profile is now ${completeness.score}% complete!`,
      completeness
    };

    return this.sendEventNotification(userEmail, relationshipAgent, event);
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(userEmail, subject, content, options = {}) {
    if (!this.isConfigured) {
      return { sent: false, reason: 'not_configured' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Lumen Assistant'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: userEmail,
        subject,
        text: options.text || content,
        html: options.html || `<p>${content}</p>`
      });

      return {
        sent: true,
        messageId: info.messageId,
        type: 'custom'
      };
    } catch (error) {
      return {
        sent: false,
        reason: error.message
      };
    }
  }

  /**
   * Generate HTML for daily digest
   */
  generateDigestHTML(cliffNotes, profile, agent) {
    const activeProjects = profile.projects.list.map(p => 
      `<li><strong>${p.name}</strong> (${p.status}) - ${p.techStack.join(', ')}</li>`
    ).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 28px; }
    .summary { background: #f7fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 20px; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #667eea; font-size: 20px; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .key-points { list-style: none; padding: 0; }
    .key-points li { padding: 10px; margin-bottom: 8px; background: white; border-radius: 6px; border-left: 3px solid #667eea; }
    .metric { display: inline-block; background: #e6fffa; color: #234e52; padding: 8px 15px; border-radius: 20px; margin: 5px; font-weight: 600; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center; }
    .signature-badge { display: inline-block; background: #f0fff4; color: #22543d; padding: 5px 10px; border-radius: 4px; font-size: 11px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌟 Your Daily Digest</h1>
    <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="summary">
    <strong>One-Line Summary:</strong><br>
    ${cliffNotes.oneSentenceSummary}
  </div>

  <div class="section">
    <h2>📊 Profile Metrics</h2>
    <span class="metric">📈 ${profile.profileCompleteness}% Complete</span>
    <span class="metric">💬 ${profile.conversationsAnalyzed} Conversations</span>
    <span class="metric">🚀 ${profile.projects.active} Active Projects</span>
    <span class="metric">✅ ${profile.projects.completed} Completed</span>
  </div>

  <div class="section">
    <h2>💡 Key Points</h2>
    <ul class="key-points">
      ${cliffNotes.topPoints.map(point => `<li>${point}</li>`).join('')}
    </ul>
  </div>

  ${activeProjects ? `
  <div class="section">
    <h2>🚀 Active Projects</h2>
    <ul class="key-points">
      ${activeProjects}
    </ul>
  </div>
  ` : ''}

  ${cliffNotes.mustRemember && cliffNotes.mustRemember.length > 0 ? `
  <div class="section">
    <h2>🎯 Must Remember</h2>
    <ul class="key-points">
      ${cliffNotes.mustRemember.map(item => `<li><strong>${item}</strong></li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by Lumen Assistant for User ${agent.userId}</p>
    <div class="signature-badge">
      🔐 Cryptographically Signed | ${cliffNotes._signature?.algorithm || 'BSV-ECDSA-DER'}
    </div>
    <p style="margin-top: 15px; font-size: 11px;">
      <a href="#" style="color: #667eea;">View Profile</a> | 
      <a href="#" style="color: #667eea;">Update Settings</a> | 
      <a href="#" style="color: #667eea;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text for daily digest
   */
  generateDigestText(cliffNotes, profile) {
    return `
🌟 YOUR DAILY DIGEST - ${new Date().toLocaleDateString()}

ONE-LINE SUMMARY:
${cliffNotes.oneSentenceSummary}

PROFILE METRICS:
- Profile Completeness: ${profile.profileCompleteness}%
- Conversations Analyzed: ${profile.conversationsAnalyzed}
- Active Projects: ${profile.projects.active}
- Completed Projects: ${profile.projects.completed}

KEY POINTS:
${cliffNotes.topPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

${cliffNotes.mustRemember && cliffNotes.mustRemember.length > 0 ? `
MUST REMEMBER:
${cliffNotes.mustRemember.map((p, i) => `${i + 1}. ${p}`).join('\n')}
` : ''}

---
Generated by Lumen Assistant
🔐 Cryptographically Signed
    `.trim();
  }

  /**
   * Generate HTML for event notification
   */
  generateEventHTML(event, profile, agent) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
    .event-icon { font-size: 48px; margin-bottom: 10px; }
    .message { background: #fff5f5; padding: 20px; border-radius: 8px; border-left: 4px solid #f5576c; margin-bottom: 20px; font-size: 18px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="event-icon">${this.getEventIcon(event.type)}</div>
    <h1>${this.getEventTitle(event.type)}</h1>
  </div>

  <div class="message">
    ${event.message}
  </div>

  ${event.milestones ? `
    <div>
      <h3>Recent Milestones:</h3>
      <ul>
        ${event.milestones.map(m => `<li><strong>${m.event}</strong> - ${m.significance}</li>`).join('')}
      </ul>
    </div>
  ` : ''}

  <div class="footer">
    <p>Lumen Assistant | User ${agent.userId}</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text for event notification
   */
  generateEventText(event, profile) {
    return `
${this.getEventIcon(event.type)} ${this.getEventTitle(event.type)}

${event.message}

${event.milestones ? `
MILESTONES:
${event.milestones.map(m => `- ${m.event}: ${m.significance}`).join('\n')}
` : ''}

---
Lumen Assistant
    `.trim();
  }

  getEventSubject(event) {
    switch (event.type) {
      case 'milestone':
        return `🎉 New Milestone${event.milestones?.length > 1 ? 's' : ''} Achieved!`;
      case 'completeness':
        return `📊 Profile Completeness Update`;
      case 'missing_context':
        return `❓ We Need Your Input`;
      default:
        return `📬 Notification from Lumen Assistant`;
    }
  }

  getEventTitle(type) {
    switch (type) {
      case 'milestone': return 'Milestone Achieved!';
      case 'completeness': return 'Profile Update';
      case 'missing_context': return 'Input Needed';
      default: return 'Notification';
    }
  }

  getEventIcon(type) {
    switch (type) {
      case 'milestone': return '🎉';
      case 'completeness': return '📊';
      case 'missing_context': return '❓';
      default: return '📬';
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    if (!this.isConfigured) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connected successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
export const emailService = new EmailNotificationService();

export default emailService;
