// Stripe Webhook Handlers
// Reference: connection:conn_stripe_01KBR6VNRM1YXQ0MFRV5N4NKP1

import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import type { SubscriptionTier } from '@shared/schema';
import { sendTrialEndingEmail, sendInvoicePaymentConfirmationEmail } from './email';

// Map Stripe metadata tier to our subscription tier
function mapMetadataToTier(metadata: Record<string, string> | null | undefined): SubscriptionTier | null {
  const tier = metadata?.tier;
  if (tier && ['free', 'core', 'professional', 'growth', 'enterprise'].includes(tier)) {
    return tier as SubscriptionTier;
  }
  return null;
}

// Get tier from price, checking price metadata first, then product metadata
async function getTierFromPrice(stripe: any, priceId: string): Promise<SubscriptionTier> {
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    
    // First check price metadata
    const priceTier = mapMetadataToTier(price.metadata);
    if (priceTier) {
      return priceTier;
    }
    
    // Then check product metadata
    if (price.product && typeof price.product === 'object') {
      const productTier = mapMetadataToTier(price.product.metadata);
      if (productTier) {
        return productTier;
      }
    }
    
    return 'free';
  } catch (error) {
    console.error('Error retrieving price/product:', error);
    return 'free';
  }
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
      case 'customer.subscription.trial_will_end':
        await WebhookHandlers.handleTrialWillEnd(event.data.object);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  static async handleCheckoutComplete(session: any, stripe: any): Promise<void> {
    console.log('Processing checkout.session.completed:', session.id);

    const { userId, tier, interval, invoiceId, type } = session.metadata || {};
    
    // Handle invoice payment completion
    if (type === 'invoice_payment' && invoiceId) {
      console.log('Processing invoice payment:', invoiceId);
      try {
        // Validate payment was completed
        if (session.payment_status !== 'paid') {
          console.log('Payment not yet completed, skipping');
          return;
        }

        const invoice = await storage.getInvoice(parseInt(invoiceId));
        if (!invoice) {
          console.error('Invoice not found:', invoiceId);
          return;
        }

        // Validate organization ID matches
        const { organizationId, amountCents, currency } = session.metadata || {};
        if (organizationId && parseInt(organizationId) !== invoice.organizationId) {
          console.error('Organization ID mismatch in webhook - possible fraud attempt');
          return;
        }

        // Validate amount matches (within 1 cent tolerance for rounding)
        const expectedAmountCents = Math.round(Number(invoice.totalAmount) * 100);
        const sessionAmountCents = session.amount_total || parseInt(amountCents || '0');
        if (Math.abs(expectedAmountCents - sessionAmountCents) > 1) {
          console.error(`Amount mismatch: expected ${expectedAmountCents}, got ${sessionAmountCents}`);
          return;
        }

        // Validate checkout session ID matches what we stored
        if (invoice.stripeCheckoutSessionId && invoice.stripeCheckoutSessionId !== session.id) {
          console.error('Checkout session ID mismatch - possible fraud attempt');
          return;
        }

        const paidAt = new Date();
        await storage.updateInvoice(parseInt(invoiceId), {
          status: 'paid',
          stripePaymentIntentId: session.payment_intent,
          paidAt
        });
        console.log(`Invoice ${invoiceId} marked as paid - amount: $${(sessionAmountCents / 100).toFixed(2)}`);
        
        // Send payment confirmation email to the customer
        try {
          const client = invoice.clientId ? await storage.getClient(invoice.clientId) : null;
          const organization = await storage.getOrganization(invoice.organizationId);
          
          if (client?.email && organization) {
            await sendInvoicePaymentConfirmationEmail({
              to: client.email,
              clientName: client.name,
              invoiceNumber: invoice.invoiceNumber,
              amount: Number(invoice.totalAmount).toFixed(2),
              organizationName: organization.name,
              paidAt
            });
            console.log(`Payment confirmation email sent for invoice ${invoiceId}`);
          } else {
            console.log(`No client email found for invoice ${invoiceId}, skipping confirmation email`);
          }
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
          // Don't throw - email failure shouldn't break webhook processing
        }
      } catch (error) {
        console.error('Error updating invoice payment status:', error);
      }
      return;
    }

    if (!userId) {
      console.log('No userId in session metadata, skipping');
      return;
    }

    // Get subscription details if it's a subscription checkout
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Get the tier from the price/product metadata
      const priceId = subscription.items.data[0]?.price?.id;
      let subscriptionTier: SubscriptionTier = 'free';
      
      if (priceId) {
        subscriptionTier = await getTierFromPrice(stripe, priceId);
      }

      // If tier was passed in session metadata, use that as override
      if (tier && ['core', 'professional', 'growth', 'enterprise'].includes(tier)) {
        subscriptionTier = tier as SubscriptionTier;
      }

      // Determine if this is a trial subscription
      const isTrialing = subscription.status === 'trialing';
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

      // Update user subscription info - grant full tier access even during trial
      await storage.updateUser(userId, {
        stripeSubscriptionId: session.subscription,
        subscriptionTier: subscriptionTier as SubscriptionTier,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: trialEnd || new Date(subscription.current_period_end * 1000),
        billingInterval: interval || (subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'),
      });
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

    // Get the tier from the price/product metadata
    const priceId = subscription.items.data[0]?.price?.id;
    let subscriptionTier: SubscriptionTier = 'free';

    if (priceId) {
      subscriptionTier = await getTierFromPrice(stripe, priceId);
    }

    // Update user subscription info
    await storage.updateUser(user.id, {
      subscriptionTier: subscriptionTier as SubscriptionTier,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      billingInterval: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
    });

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

  static async handleTrialWillEnd(subscription: any): Promise<void> {
    console.log('Trial ending soon for subscription:', subscription.id);
    
    // Find user by subscription ID
    const user = await storage.getUserByStripeSubscriptionId(subscription.id);
    if (!user) {
      console.log('No user found for subscription, skipping trial reminder');
      return;
    }

    // Calculate days remaining
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
    const daysRemaining = trialEnd 
      ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    console.log(`User ${user.email} trial ending in ${daysRemaining} days`);
    
    // Get tier name for email
    const tierNames: Record<string, string> = {
      'core': 'Core',
      'professional': 'Professional',
      'growth': 'Growth',
      'enterprise': 'Enterprise',
      'free': 'Free'
    };
    const tierName = tierNames[user.subscriptionTier] || 'Professional';
    
    // Send trial ending reminder email
    if (user.email && trialEnd) {
      try {
        // Determine the base URL for manage subscription link
        const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://complybook.net';
        const manageUrl = `${baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl}/settings`;
        
        await sendTrialEndingEmail({
          to: user.email,
          firstName: user.firstName || undefined,
          daysRemaining,
          trialEndDate: trialEnd,
          tierName,
          manageSubscriptionUrl: manageUrl
        });
        
        console.log(`Trial reminder email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send trial reminder email:', emailError);
        // Don't throw - email failure shouldn't break webhook processing
      }
    }
  }
}
