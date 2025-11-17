
// Kitchorify Backend Server
// This is a sample Node.js server using the Express framework to handle Stripe webhooks.

// --- 1. SETUP ---
// To run this server, you need to:
// a. Create a `package.json` in the same directory: `npm init -y`
// b. Install dependencies: `npm install express stripe dotenv cors`
// c. Create a `.env` file in the same directory.
// d. Add your Stripe keys to the `.env` file:
//    STRIPE_SECRET_KEY=sk_test_...
//    STRIPE_WEBHOOK_SECRET=whsec_...
// e. Run the server: `node server.js`
// f. Use a tool like `ngrok` to expose your local server to the internet for testing webhooks: `ngrok http 4242`

require('dotenv').config();
const express = require('express');
const cors = require('cors');
// The Stripe secret key should be stored in an environment variable
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// --- MIDDLEWARE ---

// Enable CORS for your frontend application
// In production, you should restrict this to your actual frontend domain
app.use(cors({ origin: '*' }));

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('Kitchorify Backend Server is running.');
});

// This is the endpoint Stripe will send webhook events to.
// It uses `express.raw` because Stripe's signature verification needs the raw, unparsed request body.
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), (request, response) => {
  console.log('Webhook received!');
  
  // Get the signature from the headers
  const sig = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify the event came from Stripe using the webhook secret
    event = stripe.webhooks.constructEvent(request.body, sig, webhookSecret);
  } catch (err) {
    // On error, log and return a 400 error
    console.log(`❌ Error message: ${err.message}`);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  
  console.log(`✅ Success: Verified webhook event: ${event.id}`);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      
      // --- BUSINESS LOGIC ---
      // This is where you update your database.
      // 1. Find the customer in your database associated with this payment.
      //    You might have stored a `customerId` or `tenantId` in the PaymentIntent's metadata.
      //    const tenantId = paymentIntent.metadata.tenantId;
      
      // 2. Update the tenant's subscription status to 'ACTIVE'.
      //    e.g., db.tenants.update({ where: { id: tenantId } }, { subscriptionStatus: 'ACTIVE' });
      
      // 3. You could also store subscription end dates, etc.
      
      console.log('TODO: Update database subscription status for the customer.');
      
      break;
    
    // ... handle other event types you care about
    // e.g., 'customer.subscription.deleted', 'invoice.payment_failed'
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});


const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
