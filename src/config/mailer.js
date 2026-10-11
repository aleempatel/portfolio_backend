const nodemailer = require('nodemailer');

// SMTP transporter used to deliver contact-form messages. Works with Gmail
// (use an "App Password", not the normal account password - required since
// Gmail blocks plain-password SMTP logins) or any other SMTP provider
// (SendGrid, Mailgun, Outlook, etc.) by changing the SMTP_* env vars.
//
// Credentials are cleaned up first: Google shows App Passwords as
// "abcd efgh ijkl mnop" - the spaces, stray quotes or Windows line endings
// must not be part of the password.
const clean = (v) => String(v || '').replace(/^["']|["']$/g, '').trim();

const SMTP_USER = clean(process.env.SMTP_USER);
const SMTP_PASS = clean(process.env.SMTP_PASS).replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  host: clean(process.env.SMTP_HOST) || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: clean(process.env.SMTP_SECURE || 'true') === 'true', // true for port 465, false for 587
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// Log once at startup whether the SMTP login works, so a bad App Password
// shows up in the server logs immediately instead of when a visitor submits.
transporter.verify().then(
  () => console.log(`[mail] SMTP login OK as ${SMTP_USER}`),
  (err) => console.error(`[mail] SMTP login FAILED for ${SMTP_USER}: ${err.message}`)
);

transporter.smtpUser = SMTP_USER;
module.exports = transporter;
