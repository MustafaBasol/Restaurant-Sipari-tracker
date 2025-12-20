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

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
