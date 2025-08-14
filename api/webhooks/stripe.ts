/**
 * Vercel API Route for Stripe Webhooks
 * Handles incoming webhook events from Stripe
 */

import { handleStripeWebhook } from '../../src/api/stripe-webhook';

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body for signature verification
  },
};

export default handleStripeWebhook;