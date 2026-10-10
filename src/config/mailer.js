const nodemailer = require('nodemailer');

// SMTP transporter used to deliver contact-form messages. Works with Gmail
// (use an "App Password", not the normal account password - required since
// Gmail blocks plain-password SMTP logins) or any other SMTP provider
// (SendGrid, Mailgun, Outlook, etc.) by changing the SMTP_* env vars.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: String(process.env.SMTP_SECURE || 'true') === 'true', // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = transporter;
