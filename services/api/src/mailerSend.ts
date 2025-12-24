type MailerSendEmailRequest = {
  from: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  text?: string;
  html?: string;
};

const env = (key: string): string | undefined => {
  const raw = process.env[key];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed ? trimmed : undefined;
};

const MAILERSEND_ENABLED_RAW = (process.env.MAILERSEND_ENABLED ?? '').trim().toLowerCase();
const MAILERSEND_API_KEY = env('MAILERSEND_API_KEY') ?? '';

// Backward-compatible env names:
// - preferred: MAILERSEND_FROM_EMAIL / MAILERSEND_FROM_NAME
// - legacy:   MAILERSEND_SENDER_EMAIL / MAILERSEND_SENDER_NAME
const MAILERSEND_FROM_EMAIL = env('MAILERSEND_FROM_EMAIL') ?? env('MAILERSEND_SENDER_EMAIL') ?? '';
const MAILERSEND_FROM_NAME =
  env('MAILERSEND_FROM_NAME') ?? env('MAILERSEND_SENDER_NAME') ?? 'Kitchorify';

// Ergonomic default: if user provided an API key and didn't explicitly disable, consider enabled.
const MAILERSEND_ENABLED =
  MAILERSEND_ENABLED_RAW.length > 0
    ? MAILERSEND_ENABLED_RAW === 'true'
    : Boolean(MAILERSEND_API_KEY);

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
    const bodyText = await resp.text().catch(() => '');
    const snippet = bodyText.trim().slice(0, 2000);
    const requestId =
      resp.headers.get('x-request-id') ??
      resp.headers.get('x-requestid') ??
      resp.headers.get('x-correlation-id') ??
      resp.headers.get('cf-ray') ??
      '';

    const suffix = [requestId ? `requestId=${requestId}` : '', snippet ? `body=${snippet}` : '']
      .filter(Boolean)
      .join(' ');

    throw new Error(
      suffix ? `MAILERSEND_HTTP_${resp.status}: ${suffix}` : `MAILERSEND_HTTP_${resp.status}`,
    );
  }
};
