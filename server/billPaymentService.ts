import { storage } from "./storage";
import type { Bill, ScheduledPayment, AutoPayRule } from "@shared/schema";

export interface PaymentResult {
  success: boolean;
  paymentId?: number;
  stripePaymentIntentId?: string;
  error?: string;
}

type PaymentMethod = 'ach' | 'card' | 'check' | 'manual';

export class BillPaymentService {
  async schedulePaymentFromRule(bill: Bill, rule: AutoPayRule, userId: string): Promise<ScheduledPayment> {
    const billDueDate = new Date(bill.dueDate);
    const daysBeforeDue = rule.daysBeforeDue || 0;
    
    const scheduledDate = new Date(billDueDate);
    scheduledDate.setDate(scheduledDate.getDate() - daysBeforeDue);
    
    if (scheduledDate < new Date()) {
      scheduledDate.setTime(Date.now());
    }

    return storage.createScheduledPayment({
      organizationId: bill.organizationId,
      billId: bill.id,
      autoPayRuleId: rule.id,
      scheduledDate,
      amount: bill.totalAmount,
      paymentMethod: rule.paymentMethod as PaymentMethod,
      status: 'pending',
      reminderSent: false,
      createdBy: userId,
    } as any);
  }

  async processPayment(scheduledPaymentId: number, userId: string): Promise<PaymentResult> {
    const scheduledPayment = await storage.getScheduledPayment(scheduledPaymentId);
    if (!scheduledPayment) {
      return { success: false, error: "Scheduled payment not found" };
    }

    if (scheduledPayment.status !== 'pending') {
      return { success: false, error: `Cannot process payment with status: ${scheduledPayment.status}` };
    }

    const bill = await storage.getBill(scheduledPayment.billId);
    if (!bill) {
      return { success: false, error: "Bill not found" };
    }

    try {
      await storage.processScheduledPayment(scheduledPaymentId);

      let stripePaymentIntentId: string | undefined;

      if (scheduledPayment.paymentMethod === 'card') {
        const stripeResult = await this.processStripePayment(scheduledPayment, bill);
        if (!stripeResult.success) {
          await storage.updateScheduledPayment(scheduledPaymentId, {
            status: 'failed',
          } as any);
          return stripeResult;
        }
        stripePaymentIntentId = stripeResult.stripePaymentIntentId;
      }

      const payment = await storage.createBillPayment({
        organizationId: bill.organizationId,
        billId: bill.id,
        scheduledPaymentId,
        amount: scheduledPayment.amount,
        paymentDate: new Date(),
        paymentMethod: scheduledPayment.paymentMethod as PaymentMethod,
        stripePaymentIntentId,
        createdBy: userId,
      } as any);

      await storage.updateScheduledPayment(scheduledPaymentId, {
        status: 'completed',
      } as any);

      return {
        success: true,
        paymentId: payment.id,
        stripePaymentIntentId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      await storage.updateScheduledPayment(scheduledPaymentId, {
        status: 'failed',
      } as any);

      return { success: false, error: errorMessage };
    }
  }

  async processStripePayment(scheduledPayment: ScheduledPayment, bill: Bill): Promise<PaymentResult> {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const amountInCents = Math.round(parseFloat(scheduledPayment.amount) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          billId: bill.id.toString(),
          billNumber: bill.billNumber || '',
          scheduledPaymentId: scheduledPayment.id.toString(),
          organizationId: bill.organizationId.toString(),
        },
        description: `Payment for Bill #${bill.billNumber || bill.id}`,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      if (paymentIntent.status === 'requires_payment_method') {
        return {
          success: false,
          error: "Payment requires a payment method. Please add a payment method to complete this payment.",
          stripePaymentIntentId: paymentIntent.id,
        };
      }

      return {
        success: true,
        stripePaymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Stripe payment failed";
      return { success: false, error: errorMessage };
    }
  }

  async recordManualPayment(
    billId: number,
    organizationId: number,
    amount: string,
    paymentMethod: PaymentMethod,
    userId: string,
    details?: {
      checkNumber?: string;
      achTransactionId?: string;
      referenceNumber?: string;
      notes?: string;
    }
  ): Promise<PaymentResult> {
    try {
      const bill = await storage.getBill(billId);
      if (!bill) {
        return { success: false, error: "Bill not found" };
      }

      if (bill.organizationId !== organizationId) {
        return { success: false, error: "Bill does not belong to this organization" };
      }

      const payment = await storage.createBillPayment({
        organizationId,
        billId,
        amount,
        paymentDate: new Date(),
        paymentMethod,
        checkNumber: details?.checkNumber,
        achTransactionId: details?.achTransactionId,
        referenceNumber: details?.referenceNumber,
        notes: details?.notes,
        createdBy: userId,
      } as any);

      return {
        success: true,
        paymentId: payment.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to record payment";
      return { success: false, error: errorMessage };
    }
  }

  async checkAndScheduleAutoPay(billId: number, userId: string): Promise<ScheduledPayment[]> {
    const bill = await storage.getBill(billId);
    if (!bill) {
      throw new Error("Bill not found");
    }

    if (bill.status === 'paid') {
      return [];
    }

    const existingScheduledPayments = await storage.getScheduledPaymentsByBill(billId);
    const hasPendingPayment = existingScheduledPayments.some(p => p.status === 'pending' || p.status === 'processing');
    
    if (hasPendingPayment) {
      return existingScheduledPayments.filter(p => p.status === 'pending');
    }

    const matchingRules = await storage.getMatchingAutoPayRules(bill);
    
    if (matchingRules.length === 0) {
      return [];
    }

    const bestRule = matchingRules[0];

    if (bestRule.requiresApproval) {
      return [];
    }

    const scheduledPayment = await this.schedulePaymentFromRule(bill, bestRule, userId);
    return [scheduledPayment];
  }

  async getUpcomingPayments(organizationId: number, days: number = 7): Promise<Array<ScheduledPayment & { billNumber: string; vendorName: string | null; billTotalAmount: string }>> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    
    return storage.getPendingScheduledPayments(organizationId, targetDate);
  }
}

export const billPaymentService = new BillPaymentService();
