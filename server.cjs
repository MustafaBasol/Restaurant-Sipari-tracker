// Kitchorify Backend Server (Sample)
//
// NOTE:
// - This repo uses "type": "module" in package.json, so CommonJS needs a .cjs extension.
// - This server is OPTIONAL and not required for running the frontend demo.
//
// Setup:
// 1) npm init -y
// 2) npm install express stripe dotenv cors
// 3) Create .env:
//    STRIPE_SECRET_KEY=sk_test_...
//    STRIPE_WEBHOOK_SECRET=whsec_...
//    # Optional: comma-separated
//    CORS_ORIGINS=http://localhost:3000
//    PORT=4242
// 4) node server.cjs

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('[stripe] Missing STRIPE_SECRET_KEY.');
  console.error('Set it via Codespaces Secrets/Environment variables or a local .env file.');
  console.error('Example: STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.disable('x-powered-by');

// If you're behind a reverse proxy (Render, Fly, Nginx, etc.), this helps rate limiting
// use the correct client IP.
app.set('trust proxy', 1);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildOriginMatcher = (patterns) => {
  const exact = new Set();
  const wildcards = [];

  for (const raw of patterns) {
    const p = String(raw || '').trim();
    if (!p) continue;
    if (p.includes('*')) {
      const rx = new RegExp(`^${escapeRegExp(p).replace(/\\\*/g, '.*')}$`);
      wildcards.push(rx);
    } else {
      exact.add(p);
    }
  }

  return (origin) => {
    if (!origin) return true;
    if (exact.has(origin)) return true;
    return wildcards.some((rx) => rx.test(origin));
  };
};

const allowedOriginPatterns = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isOriginAllowed = buildOriginMatcher(allowedOriginPatterns);

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(
  helmet({
    // SPA + Stripe redirects often need to be embedded/redirected in various flows.
    // Keep default protections while explicitly disabling COEP to avoid surprising breaks.
    crossOriginEmbedderPolicy: false,
  }),
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isDevelopment ? 300 : 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const requireApiKeyIfConfigured = (req, res, next) => {
  const apiKey = String(process.env.API_KEY || '').trim();
  if (!apiKey) return next();

  const provided = String(req.header('x-api-key') || '').trim();
  if (provided && provided === apiKey) return next();
  return res.status(401).json({ error: 'Unauthorized' });
};

const isAllowedRedirectUrl = (value) => {
  try {
    const u = new URL(String(value));
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return isOriginAllowed(u.origin);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin header), e.g., Stripe webhooks.
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(
        new Error(
          `CORS blocked for origin: ${origin}. Allowed origins/patterns: ${allowedOriginPatterns.join(
            ', ',
          )}`,
        ),
      );
    },
  }),
);

app.get('/', (_req, res) => {
  res.send('Kitchorify Backend Server is running.');
});

const INTERNAL_API_BASE_URL = (process.env.INTERNAL_API_BASE_URL || 'http://api:4000/api').replace(
  /\/+$/,
  '',
);

const pushSubscriptionUpdateToApi = async ({
  tenantId,
  stripeStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}) => {
  const apiKey = String(process.env.API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('API_KEY_NOT_CONFIGURED');
  }
  if (!tenantId) {
    throw new Error('TENANT_ID_MISSING');
  }

  try {
    const resp = await fetch(`${INTERNAL_API_BASE_URL}/internal/stripe/subscription-updated`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        tenantId,
        stripeStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`API_NOTIFY_FAILED:${resp.status}:${text}`);
    }
  } catch (e) {
    console.error('[stripe] Failed to notify API', e);
    throw e;
  }
};

const getLatestSubscriptionForCustomer = async (customerId) => {
  if (!customerId) return null;
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
  const latest = (subs.data || []).sort((a, b) => (b.created || 0) - (a.created || 0))[0] || null;
  return latest;
};

// Stripe webhooks must use express.raw for signature verification.
app.post(
  '/stripe-webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (request, response) => {
    console.log('Webhook received!');

    const sig = request.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[stripe] Missing STRIPE_WEBHOOK_SECRET. Refusing to process webhooks.');
      response.status(500).send('Webhook misconfigured');
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
    } catch (err) {
      console.log(`❌ Error message: ${err.message}`);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    console.log(`✅ Success: Verified webhook event: ${event.id}`);

    const handleAsync = async () => {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const tenantId = session.client_reference_id || session?.metadata?.tenantId || '';

          if (!session.subscription) {
            console.log('[stripe] checkout.session.completed without subscription; ignoring');
            break;
          }

          const sub = await stripe.subscriptions.retrieve(session.subscription);

          console.log('[stripe] checkout.session.completed', {
            tenantId,
            subscriptionId: sub.id,
            status: sub.status,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
          });

          await pushSubscriptionUpdateToApi({
            tenantId,
            stripeStatus: sub.status,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          });

          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          const tenantId = sub?.metadata?.tenantId || '';

          console.log(`[stripe] ${event.type}`, {
            tenantId,
            subscriptionId: sub.id,
            status: sub.status,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
          });

          await pushSubscriptionUpdateToApi({
            tenantId,
            stripeStatus: sub.status,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          });
          break;
        }
        case 'invoice.paid': {
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;
          if (!subscriptionId) {
            console.log('[stripe] invoice.paid without subscription; ignoring');
            break;
          }

          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const tenantId = sub?.metadata?.tenantId || '';

          console.log('[stripe] invoice.paid', {
            tenantId,
            subscriptionId: sub.id,
            status: sub.status,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
          });

          await pushSubscriptionUpdateToApi({
            tenantId,
            stripeStatus: sub.status,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          });

          break;
        }
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    };

    try {
      await handleAsync();
      response.status(200).send('ok');
    } catch (e) {
      console.error('[stripe] Webhook handler failed', e);
      // Return non-2xx so Stripe retries.
      response.status(500).send('handler_failed');
    }
  },
);

// JSON endpoints (keep AFTER webhook to avoid breaking signature verification).
app.use(express.json({ limit: '256kb' }));

// Protect API endpoints (webhook excluded above)
app.use(apiLimiter);
app.use(requireApiKeyIfConfigured);

// Manual sync fallback (useful if webhook delivery is delayed/misconfigured).
// Client should call this with Stripe's checkout `session_id` after redirect.
app.post('/sync-after-checkout', async (req, res) => {
  try {
    const sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const tenantId = session.client_reference_id || session?.metadata?.tenantId || '';

    let sub = session.subscription;
    if (!sub && session.customer) {
      sub = await getLatestSubscriptionForCustomer(session.customer);
    }

    if (!sub) {
      return res.status(409).json({ error: 'Subscription not ready for this session yet' });
    }

    await pushSubscriptionUpdateToApi({
      tenantId: tenantId || sub?.metadata?.tenantId || '',
      stripeStatus: sub.status,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to sync after checkout', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tenantId, customerEmail, successUrl, cancelUrl } = req.body || {};

    if (!process.env.STRIPE_PRICE_ID_MONTHLY) {
      return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID_MONTHLY' });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing successUrl/cancelUrl' });
    }

    if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
      return res.status(400).json({ error: 'Invalid successUrl/cancelUrl' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID_MONTHLY, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      client_reference_id: tenantId,
      subscription_data: {
        metadata: {
          tenantId: tenantId || '',
        },
      },
      metadata: {
        tenantId: tenantId || '',
      },
      allow_promotion_codes: true,
    });

    // Prefer returning URL for simpler client redirect.
    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Failed to create checkout session', err);
    return res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment ? { details: err?.message } : {}),
    });
  }
});

app.post('/create-portal-session', async (req, res) => {
  try {
    const { customerEmail, returnUrl } = req.body || {};
    if (!customerEmail) return res.status(400).json({ error: 'Missing customerEmail' });
    if (!returnUrl) return res.status(400).json({ error: 'Missing returnUrl' });

    if (!isAllowedRedirectUrl(returnUrl)) {
      return res.status(400).json({ error: 'Invalid returnUrl' });
    }

    // Demo-friendly lookup. In a production app, store customerId in your DB.
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customer = customers.data?.[0];
    if (!customer) return res.status(404).json({ error: 'Customer not found for email' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create portal session', err);
    return res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment ? { details: err?.message } : {}),
    });
  }
});

app.post('/get-subscription-status', async (req, res) => {
  try {
    const { customerEmail } = req.body || {};
    if (!customerEmail) return res.status(400).json({ error: 'Missing customerEmail' });

    // Demo-friendly lookup. In a production app, store customerId in your DB.
    const customers = await stripe.customers.list({ email: customerEmail, limit: 10 });
    const customer = customers.data?.[0];
    if (!customer) return res.status(404).json({ error: 'Customer not found for email' });

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    });

    const latest = (subs.data || []).sort((a, b) => (b.created || 0) - (a.created || 0))[0];
    if (!latest) return res.json({ subscription: null });

    return res.json({
      subscription: {
        id: latest.id,
        created: latest.created,
        start_date: latest.start_date,
        status: latest.status,
        cancel_at_period_end: !!latest.cancel_at_period_end,
        cancel_at: latest.cancel_at,
        current_period_start: latest.current_period_start,
        current_period_end: latest.current_period_end,
        canceled_at: latest.canceled_at,
        ended_at: latest.ended_at,
      },
    });
  } catch (err) {
    console.error('Failed to get subscription status', err);
    return res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment ? { details: err?.message } : {}),
    });
  }
});

app.post('/list-invoices', async (req, res) => {
  try {
    const { customerEmail, limit } = req.body || {};
    if (!customerEmail) return res.status(400).json({ error: 'Missing customerEmail' });

    // Demo-friendly lookup. In a production app, store customerId in your DB.
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    const customer = customers.data?.[0];
    if (!customer) return res.status(404).json({ error: 'Customer not found for email' });

    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: typeof limit === 'number' ? limit : 10,
    });

    return res.json({
      invoices: (invoices.data || []).map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        created: inv.created,
        currency: inv.currency,
        amount_paid: inv.amount_paid,
        amount_due: inv.amount_due,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
      })),
    });
  } catch (err) {
    console.error('Failed to list invoices', err);
    return res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment ? { details: err?.message } : {}),
    });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
