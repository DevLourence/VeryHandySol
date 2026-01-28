// Resend API Email Service
const https = require('https');

/**
 * Generic function to send email via Resend API
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  console.log(`📧 Attempting to send email to: ${to} via Resend...`);
  const payload = {
    from: 'VeryHandy Solution <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject: subject,
    html: html
  };

  const emailData = JSON.stringify(payload);

  const options = {
    hostname: 'api.resend.com',
    port: 443,
    path: '/emails',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(emailData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`📡 Resend API responded with status: ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const response = JSON.parse(data);
            console.log(`✅ Email sent successfully! Message ID:`, response.id);
            resolve({ success: true, messageId: response.id });
          } catch (e) {
            // Sometimes Resend might return a successful status code but no JSON body,
            // or a body that's not strictly JSON (e.g., just "OK").
            // In such cases, we still consider it a success.
            console.log(`✅ Email sent (but couldn't parse response body)`);
            resolve({ success: true });
          }
        } else {
          console.error('❌ Resend API error details:', data);
          reject(new Error(`Resend API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Network error while sending email:', error);
      reject(error);
    });

    req.write(emailData);
    req.end();
  });
};

const sendOTPEmail = async (email, otp, name = 'User') => {
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">VeryHandy Solution</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <h2>Hello ${name},</h2>
          <p>Your verification code is:</p>
          <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px;">${otp}</span>
          </div>
          <p>This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          © 2026 VeryHandy Solution. All rights reserved.
        </div>
      </div>
    `;
  return sendEmail({ to: email, subject: 'Email Verification - VeryHandy Solution', html });
};

const sendBookingUpdateEmail = async (email, name, bookingId, status) => {
  const statusColors = {
    pending: '#f59e0b',
    approved: '#10b981',
    completed: '#3b82f6',
    cancelled: '#ef4444'
  };

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">VeryHandy Solution</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <h2>Booking Status Updated</h2>
          <p>Hi ${name},</p>
          <p>Your booking <strong>#${bookingId.toString().slice(-6).toUpperCase()}</strong> has been updated to:</p>
          <div style="display: inline-block; padding: 8px 16px; border-radius: 20px; background: ${statusColors[status] || '#6b7280'}; color: white; font-weight: bold; text-transform: uppercase; font-size: 14px; margin: 10px 0;">
            ${status}
          </div>
          <p>You can check your dashboard for more details.</p>
          © 2026 VeryHandy Solution. All rights reserved.
        </div>
      </div>
    `;
  return sendEmail({ to: email, subject: `Booking Status: ${status.toUpperCase()} - VeryHandy Solution`, html });
};

// Verify Resend API key on startup
console.log('✅ Resend email service initialized');
if (process.env.RESEND_API_KEY) {
  console.log('✅ Resend API key configured');
} else {
  console.error('❌ RESEND_API_KEY not found in environment variables');
}

module.exports = { sendOTPEmail, sendBookingUpdateEmail, sendEmail };
