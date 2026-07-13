function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.EMAIL_FROM || 'ReClaim <no-reply@reclaim.app>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error('Email could not be sent');
    error.cause = detail.slice(0, 300);
    throw error;
  }
  return true;
}

function sendPasswordResetEmail({ to, name, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Reset your ReClaim password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
        <h1 style="font-size:24px">Reset your password</h1>
        <p>Hello ${escapeHtml(name)},</p>
        <p>A password reset was requested for your ReClaim account. This link expires in 30 minutes and can only be used once.</p>
        <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:white;text-decoration:none;font-weight:700">Reset password</a></p>
        <p style="font-size:13px;color:#64748b">If you did not request this, you can safely ignore this email. Your password has not changed.</p>
      </div>
    `,
  });
}

function sendEmailVerificationEmail({ to, name, verificationUrl }) {
  return sendEmail({
    to,
    subject: 'Verify your ReClaim email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
        <h1 style="font-size:24px">Verify your email</h1>
        <p>Hello ${escapeHtml(name)},</p>
        <p>Confirm this email address to activate your ReClaim account. This link expires in 24 hours and can only be used once.</p>
        <p><a href="${escapeHtml(verificationUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#2563eb;color:white;text-decoration:none;font-weight:700">Verify email</a></p>
        <p style="font-size:13px;color:#64748b">If you did not create this account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendEmailVerificationEmail, sendPasswordResetEmail };
