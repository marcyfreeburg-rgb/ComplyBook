// Stripe Webhook Handlers
// Reference: connection:conn_stripe_01KBR6VNRM1YXQ0MFRV5N4NKP1

import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import type { SubscriptionTier } from '@shared/schema';

// Map Stripe price metadata tier to our subscription tier
function mapPriceToTier(priceMetadata: Record<string, string> | null | undefined): SubscriptionTier {
  const tier = priceMetadata?.tier;
  if (tier && ['free', 'core', 'professional', 'growth', 'enterprise'].includes(tier)) {
    return tier as SubscriptionTier;
  }
  return 'free';
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    try {
      // Try to process with stripeSync if available
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature, uuid);
    } catch (syncError) {
      // Fall back to manual processing if sync fails
      console.warn('Stripe sync processing failed, using manual handling:', syncError);
    }

    // Also do manual event handling for subscription updates
    try {
      const stripe = await getUncachableStripeClient();
      const event = JSON.parse(payload.toString());

      await WebhookHandlers.handleEvent(event, stripe);
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  static async handleEvent(event: any, stripe: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutComplete(event.data.object, stripe);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionUpdate(event.data.object, stripe);
        break;
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await WebhookHandlers.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await WebhookHandlers.handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  static async handleCheckoutComplete(session: any, stripe: any): Promise<void> {
    console.log('Processing checkout.session.completed:', session.id);

    const { userId, tier, interval } = session.metadata || {};
    if (!userId) {
      console.log('No userId in session metadata, skipping');
      return;
    }

    // Get subscription details if it's a subscription checkout
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Get the tier from the price metadata
      const priceId = subscription.items.data[0]?.price?.id;
      let subscriptionTier: SubscriptionTier = 'free';
      
      if (priceId) {
        const price = await stripe.prices.retrieve(priceId);
        subscriptionTier = mapPriceToTier(price.metadata);
      }

      // If tier was passed in session metadata, use that
      if (tier && ['core', 'professional', 'growth', 'enterprise'].includes(tier)) {
        subscriptionTier = tier as SubscriptionTier;
      }

      // Update user subscription info
      await storage.updateUser(userId, {
        stripeSubscriptionId: session.subscription,
        subscriptionTier,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        billingInterval: interval || (subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'),
      });

      console.log(`Updated user ${userId} to tier ${subscriptionTier}`);
    }
  }

  static async handleSubscriptionUpdate(subscription: any, stripe: any): Promise<void> {
    console.log('Processing subscription update:', subscription.id);

    // Find user by subscription ID
    const user = await storage.getUserByStripeSubscriptionId(subscription.id);
    if (!user) {
      console.log('No user found for subscription, skipping');
      return;
    }

    // Get the tier from the price metadata
    const priceId = subscription.items.data[0]?.price?.id;
    let subscriptionTier: SubscriptionTier = 'free';

    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      subscriptionTier = mapPriceToTier(price.metadata);
    }

    // Update user subscription info
    await storage.updateUser(user.id, {
      subscriptionTier,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      billingInterval: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
    });

    console.log(`Updated user ${user.id} subscription to tier ${subscriptionTier}, status ${subscription.status}`);
  }

  static async handleSubscriptionDeleted(subscription: any): Promise<void> {
    console.log('Processing subscription deleted:', subscription.id);

    // Find user by subscription ID
    const user = await storage.getUserByStripeSubscriptionId(subscription.id);
    if (!user) {
      console.log('No user found for subscription, skipping');
      return;
    }

    // Downgrade to free tier
    await storage.updateUser(user.id, {
      subscriptionTier: 'free',
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
      subscriptionCurrentPeriodEnd: null,
      billingInterval: null,
    });

    console.log(`Downgraded user ${user.id} to free tier after subscription cancellation`);
  }

  static async handleInvoicePaid(invoice: any): Promise<void> {
    console.log('Invoice paid:', invoice.id);
    // Could send confirmation email, update usage stats, etc.
  }

  static async handlePaymentFailed(invoice: any): Promise<void> {
    console.log('Payment failed for invoice:', invoice.id);
    // Could send notification email, update subscription status, etc.
  }
}
