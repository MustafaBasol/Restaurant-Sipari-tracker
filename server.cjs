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

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('[stripe] Missing STRIPE_SECRET_KEY.');
  console.error('Set it via Codespaces Secrets/Environment variables or a local .env file.');
  console.error('Example: STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin header), e.g., Stripe webhooks.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  }),
);

app.get('/', (_req, res) => {
  res.send('Kitchorify Backend Server is running.');
});

// Stripe webhooks must use express.raw for signature verification.
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), (request, response) => {
  console.log('Webhook received!');

  const sig = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
  } catch (err) {
    console.log(`❌ Error message: ${err.message}`);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log(`✅ Success: Verified webhook event: ${event.id}`);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      console.log('TODO: Update database subscription status for the customer.');
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  response.send();
});

// JSON endpoints (keep AFTER webhook to avoid breaking signature verification).
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tenantId, customerEmail, successUrl, cancelUrl } = req.body || {};

    if (!process.env.STRIPE_PRICE_ID_MONTHLY) {
      return res.status(500).json({ error: 'Missing STRIPE_PRICE_ID_MONTHLY' });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing successUrl/cancelUrl' });
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
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
});

app.post('/create-portal-session', async (req, res) => {
  try {
    const { customerEmail, returnUrl } = req.body || {};
    if (!customerEmail) return res.status(400).json({ error: 'Missing customerEmail' });
    if (!returnUrl) return res.status(400).json({ error: 'Missing returnUrl' });

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
    return res.status(500).json({ error: err?.message || 'Unknown error' });
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
    return res.status(500).json({ error: err?.message || 'Unknown error' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
