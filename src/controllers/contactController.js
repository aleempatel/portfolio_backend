const Profile = require('../models/Profile');
const asyncHandler = require('../utils/asyncHandler');
const transporter = require('../config/mailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact  (public)
// Sends the contact-form submission by email. The recipient is always read
// fresh from the Profile document (Profile.email) - whatever address the
// admin currently has set in the admin panel - so changing it there
// immediately changes where new messages go. No code change needed.
const sendContactMessage = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').toString().trim();
  const email = (req.body.email || '').toString().trim();
  const subject = (req.body.subject || '').toString().trim();
  const message = (req.body.message || '').toString().trim();

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, subject and message are all required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }
  if (message.length > 5000 || name.length > 200 || subject.length > 300) {
    return res.status(400).json({ success: false, message: 'One of the fields is too long.' });
  }

  const profile = await Profile.findOne();
  const to = (profile && profile.email) || process.env.CONTACT_FALLBACK_EMAIL;

  if (!to) {
    return res.status(500).json({
      success: false,
      message: 'No destination email is configured. Set the profile email in the admin panel, or CONTACT_FALLBACK_EMAIL in .env.',
    });
  }

  // NOTE: Gmail's SMTP will only actually send as your own authenticated
  // address (SMTP_USER) - it can't truly "send as" the visitor's address,
  // that's a Gmail/anti-spoofing restriction, not something fixable in code.
  // Because the From address is your own account, Gmail's inbox will still
  // label it "me" in some views - that label is tied to the address, not the
  // display name, so it can't be removed from that specific spot. What we
  // CAN control is the display name and the reply-to, so we put the
  // visitor's name front and center there instead - that's what shows when
  // you open the email, hover the sender, or hit reply.
  await transporter.sendMail({
    from: `"${name} (via Portfolio)" <${process.env.SMTP_USER}>`,
    to,
    replyTo: `"${name}" <${email}>`,
    subject: `${name} sent you a message: ${subject}`,
    text: `New message from your portfolio contact form.\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
    html: `
      <div style="font-family: sans-serif; font-size: 14px; color: #111;">
        <h2 style="margin-bottom: 4px;">New message from ${escapeHtml(name)}</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
    `,
  });

  res.json({ success: true, message: 'Message sent successfully.' });
});

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sendContactMessage };