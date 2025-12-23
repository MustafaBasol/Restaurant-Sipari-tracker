type MailerSendEmailRequest = {
  from: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  text?: string;
  html?: string;
};

const MAILERSEND_ENABLED = (process.env.MAILERSEND_ENABLED ?? '').toLowerCase() === 'true';
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY ?? '';
const MAILERSEND_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL ?? '';
const MAILERSEND_FROM_NAME = process.env.MAILERSEND_FROM_NAME ?? 'Kitchorify';

export const isMailerSendEnabled = (): boolean => {
  if (!MAILERSEND_ENABLED) return false;
  return Boolean(MAILERSEND_API_KEY && MAILERSEND_FROM_EMAIL);
};

export const sendEmail = async (params: {
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> => {
  if (!MAILERSEND_ENABLED) return;
  if (!MAILERSEND_API_KEY || !MAILERSEND_FROM_EMAIL) {
    throw new Error('MAILERSEND_MISCONFIGURED');
  }

  const payload: MailerSendEmailRequest = {
    from: { email: MAILERSEND_FROM_EMAIL, name: MAILERSEND_FROM_NAME },
    to: [{ email: params.toEmail, name: params.toName }],
    subject: params.subject,
    text: params.text,
    html: params.html,
  };

  const resp = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${MAILERSEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `MAILERSEND_HTTP_${resp.status}`);
  }
};
