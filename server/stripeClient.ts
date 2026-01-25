// Stripe Client - Supports both Replit connector and environment variables
// For Render/external deployment: Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY env vars

import Stripe from 'stripe';

let connectionSettings: any;
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;

async function getCredentials() {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // First, try environment variables (works on Render and other platforms)
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) {
    console.log('[Stripe] Using environment variable credentials');
    cachedCredentials = {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
    };
    return cachedCredentials;
  }

  // Fall back to Replit connector (works in Replit environment)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Stripe credentials not found. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables.');
  }

  const connectorName = 'stripe';
  const targetEnvironment = 'production';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  
  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe credentials not found. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables.`);
  }

  cachedCredentials = {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
  
  return cachedCredentials;
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}

export async function createInvoiceCheckoutSession(params: {
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  organizationId: number;
  organizationName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; paymentUrl: string }> {
  const stripe = await getUncachableStripeClient();
  
  const amountCents = Math.round(params.amount * 100);
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: params.customerEmail,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Invoice #${params.invoiceNumber}`,
          description: `Payment for invoice from ${params.organizationName}`,
        },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    metadata: {
      invoiceId: params.invoiceId.toString(),
      invoiceNumber: params.invoiceNumber,
      organizationId: params.organizationId.toString(),
      amountCents: amountCents.toString(),
      currency: 'usd',
      type: 'invoice_payment',
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return {
    sessionId: session.id,
    paymentUrl: session.url || '',
  };
}
