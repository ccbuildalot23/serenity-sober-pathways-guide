/**
 * Payment Gateway Service
 * Handles Stripe integration for subscription payments and billing
 * Ensures PCI compliance and secure payment processing
 */

import Stripe from 'stripe';
import { supabase } from '@/integrations/supabase/client';
import { enhancedSecurityAuditService } from './EnhancedSecurityAuditService';
import { FinancialModelService } from './FinancialModelService';
import { ROIValidationService } from './ROIValidationService';

// Initialize Stripe with secret key (should be in environment variables)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
  typescript: true,
});

export interface PaymentMethod {
  id: string;
  type: 'card' | 'ach_debit' | 'wire_transfer';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Subscription {
  id: string;
  customerId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  plan: SubscriptionPlan;
  quantity: number;
  mrr: number;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, any>;
}

export interface SubscriptionPlan {
  id: string;
  name: 'professional' | 'practice' | 'enterprise';
  interval: 'month' | 'year';
  amount: number;
  currency: string;
  features: string[];
  limits: {
    patients: number | 'unlimited';
    providers: number;
    storage: string;
    apiCalls: number;
  };
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  dueDate: Date;
  paidAt?: Date;
  items: InvoiceItem[];
  metadata: Record<string, any>;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 
          'processing' | 'succeeded' | 'canceled';
  clientSecret?: string;
  metadata: Record<string, any>;
}

interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
}

export class PaymentGatewayService {
  private static instance: PaymentGatewayService;
  private financialModel: FinancialModelService;
  private roiService: ROIValidationService;
  private webhookSecret: string;

  private constructor() {
    this.financialModel = new FinancialModelService();
    this.roiService = new ROIValidationService();
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  static getInstance(): PaymentGatewayService {
    if (!PaymentGatewayService.instance) {
      PaymentGatewayService.instance = new PaymentGatewayService();
    }
    return PaymentGatewayService.instance;
  }

  /**
   * Create a new customer in Stripe
   */
  async createCustomer(data: {
    email: string;
    name: string;
    organizationId: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          organization_id: data.organizationId,
          platform: 'serenity',
          ...data.metadata
        }
      });

      // Store customer ID in database
      await supabase
        .from('billing_customers')
        .insert({
          organization_id: data.organizationId,
          stripe_customer_id: customer.id,
          email: data.email,
          name: data.name
        });

      // Audit log
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'customer_created',
        userId: data.organizationId,
        metadata: {
          stripe_customer_id: customer.id,
          email: data.email
        }
      });

      return customer.id;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Add a payment method to a customer
   */
  async addPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    setAsDefault: boolean = false
  ): Promise<PaymentMethod> {
    try {
      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      if (setAsDefault) {
        // Set as default payment method
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Get payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      const method: PaymentMethod = {
        id: paymentMethod.id,
        type: paymentMethod.type as PaymentMethod['type'],
        last4: paymentMethod.card?.last4 || '',
        brand: paymentMethod.card?.brand,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
        isDefault: setAsDefault
      };

      // Store in database
      await supabase
        .from('payment_methods')
        .insert({
          stripe_payment_method_id: paymentMethodId,
          stripe_customer_id: customerId,
          type: method.type,
          last4: method.last4,
          is_default: setAsDefault
        });

      // Audit log
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'payment_method_added',
        userId: customerId,
        metadata: {
          payment_method_id: paymentMethodId,
          type: method.type,
          last4: method.last4
        }
      });

      return method;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw new Error('Failed to add payment method');
    }
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(data: {
    customerId: string;
    planId: string;
    quantity?: number;
    trialDays?: number;
    metadata?: Record<string, any>;
  }): Promise<Subscription> {
    try {
      // Get plan details
      const plan = this.getSubscriptionPlan(data.planId);

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: data.customerId,
        items: [{
          price: this.getStripePriceId(data.planId),
          quantity: data.quantity || 1
        }],
        trial_period_days: data.trialDays,
        metadata: {
          plan_id: data.planId,
          ...data.metadata
        },
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent']
      });

      // Calculate MRR
      const mrr = plan.amount * (data.quantity || 1);

      // Store subscription in database
      await supabase
        .from('subscriptions')
        .insert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: data.customerId,
          plan_id: data.planId,
          status: subscription.status,
          quantity: data.quantity || 1,
          mrr,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000)
        });

      // Update financial model
      await this.financialModel.addCustomer({
        customerId: data.customerId,
        tier: data.planId as any,
        mrr,
        startDate: new Date()
      });

      // Audit log
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'subscription_created',
        userId: data.customerId,
        metadata: {
          subscription_id: subscription.id,
          plan_id: data.planId,
          mrr,
          trial_days: data.trialDays
        }
      });

      return {
        id: subscription.id,
        customerId: data.customerId,
        status: subscription.status as Subscription['status'],
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        plan,
        quantity: data.quantity || 1,
        mrr,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        metadata: subscription.metadata
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(
    subscriptionId: string,
    updates: {
      planId?: string;
      quantity?: number;
      proration?: boolean;
    }
  ): Promise<Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const updateData: any = {};

      if (updates.planId) {
        // Change plan
        updateData.items = [{
          id: subscription.items.data[0].id,
          price: this.getStripePriceId(updates.planId)
        }];
      }

      if (updates.quantity !== undefined) {
        // Update quantity
        if (updateData.items) {
          updateData.items[0].quantity = updates.quantity;
        } else {
          updateData.items = [{
            id: subscription.items.data[0].id,
            quantity: updates.quantity
          }];
        }
      }

      // Apply proration if specified
      if (updates.proration !== false) {
        updateData.proration_behavior = 'create_prorations';
      } else {
        updateData.proration_behavior = 'none';
      }

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, updateData);

      // Update database
      const plan = this.getSubscriptionPlan(updates.planId || subscription.metadata.plan_id);
      const mrr = plan.amount * (updates.quantity || subscription.quantity);

      await supabase
        .from('subscriptions')
        .update({
          plan_id: updates.planId || subscription.metadata.plan_id,
          quantity: updates.quantity || subscription.quantity,
          mrr,
          status: updatedSubscription.status
        })
        .eq('stripe_subscription_id', subscriptionId);

      // Update financial model
      await this.financialModel.updateCustomerTier({
        customerId: subscription.customer as string,
        newTier: (updates.planId || subscription.metadata.plan_id) as any,
        mrr
      });

      // Audit log
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'subscription_updated',
        userId: subscription.customer as string,
        metadata: {
          subscription_id: subscriptionId,
          changes: updates,
          new_mrr: mrr
        }
      });

      return {
        id: updatedSubscription.id,
        customerId: subscription.customer as string,
        status: updatedSubscription.status as Subscription['status'],
        currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        plan,
        quantity: updates.quantity || subscription.quantity,
        mrr,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        metadata: updatedSubscription.metadata
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
    reason?: string
  ): Promise<void> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (immediately) {
        // Cancel immediately
        await stripe.subscriptions.cancel(subscriptionId);
      } else {
        // Cancel at period end
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            ...subscription.metadata,
            cancellation_reason: reason
          }
        });
      }

      // Update database
      await supabase
        .from('subscriptions')
        .update({
          status: immediately ? 'canceled' : 'active',
          cancel_at_period_end: !immediately,
          cancellation_reason: reason,
          canceled_at: new Date()
        })
        .eq('stripe_subscription_id', subscriptionId);

      // Update financial model for churn
      await this.financialModel.recordChurn({
        customerId: subscription.customer as string,
        reason,
        mrr: parseInt(subscription.metadata.mrr || '0')
      });

      // Audit log
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'subscription_canceled',
        userId: subscription.customer as string,
        metadata: {
          subscription_id: subscriptionId,
          immediately,
          reason
        }
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Process webhook events from Stripe
   */
  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }

    // Process event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;

        case 'subscription.created':
        case 'subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialEnding(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }

      // Log webhook processing
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'webhook_processed',
        userId: 'system',
        metadata: {
          webhook_type: event.type,
          webhook_id: event.id
        }
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      
      // Log webhook error
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'webhook_error',
        userId: 'system',
        severity: 'error',
        metadata: {
          webhook_type: event.type,
          webhook_id: event.id,
          error: (error as Error).message
        }
      });

      throw error;
    }
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(data: {
    amount: number;
    currency?: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'usd',
        customer: data.customerId,
        description: data.description,
        metadata: data.metadata,
        automatic_payment_methods: {
          enabled: true
        }
      });

      // Store in database
      await supabase
        .from('payment_intents')
        .insert({
          stripe_payment_intent_id: intent.id,
          stripe_customer_id: data.customerId,
          amount: data.amount,
          currency: data.currency || 'usd',
          status: intent.status,
          description: data.description
        });

      return {
        id: intent.id,
        amount: data.amount,
        currency: data.currency || 'usd',
        status: intent.status as PaymentIntent['status'],
        clientSecret: intent.client_secret || undefined,
        metadata: intent.metadata
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Generate invoice for a subscription
   */
  async generateInvoice(subscriptionId: string): Promise<Invoice> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // Create invoice
      const invoice = await stripe.invoices.create({
        customer: subscription.customer as string,
        subscription: subscriptionId,
        auto_advance: true
      });

      // Finalize invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // Map to our Invoice type
      const mappedInvoice: Invoice = {
        id: finalizedInvoice.id,
        customerId: finalizedInvoice.customer as string,
        subscriptionId: finalizedInvoice.subscription as string,
        amount: finalizedInvoice.amount_due / 100,
        currency: finalizedInvoice.currency,
        status: finalizedInvoice.status as Invoice['status'],
        dueDate: new Date(finalizedInvoice.due_date! * 1000),
        items: finalizedInvoice.lines.data.map(item => ({
          description: item.description || '',
          quantity: item.quantity || 1,
          unitAmount: item.unit_amount ? item.unit_amount / 100 : 0,
          amount: item.amount / 100
        })),
        metadata: finalizedInvoice.metadata
      };

      // Store in database
      await supabase
        .from('invoices')
        .insert({
          stripe_invoice_id: finalizedInvoice.id,
          stripe_customer_id: finalizedInvoice.customer,
          stripe_subscription_id: finalizedInvoice.subscription,
          amount: mappedInvoice.amount,
          currency: mappedInvoice.currency,
          status: mappedInvoice.status,
          due_date: mappedInvoice.dueDate
        });

      return mappedInvoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw new Error('Failed to generate invoice');
    }
  }

  // Helper methods
  private getSubscriptionPlan(planId: string): SubscriptionPlan {
    const plans: Record<string, SubscriptionPlan> = {
      professional: {
        id: 'professional',
        name: 'professional',
        interval: 'month',
        amount: 299,
        currency: 'usd',
        features: [
          'Up to 100 patients',
          'Basic billing automation',
          'Standard support',
          'Core features'
        ],
        limits: {
          patients: 100,
          providers: 1,
          storage: '10GB',
          apiCalls: 10000
        }
      },
      practice: {
        id: 'practice',
        name: 'practice',
        interval: 'month',
        amount: 599,
        currency: 'usd',
        features: [
          'Unlimited patients',
          'Advanced billing',
          'AI insights',
          'Priority support'
        ],
        limits: {
          patients: 'unlimited',
          providers: 10,
          storage: '100GB',
          apiCalls: 100000
        }
      },
      enterprise: {
        id: 'enterprise',
        name: 'enterprise',
        interval: 'month',
        amount: 1999,
        currency: 'usd',
        features: [
          'Unlimited everything',
          'White-label options',
          'Dedicated support',
          'Custom integrations'
        ],
        limits: {
          patients: 'unlimited',
          providers: 999,
          storage: '1TB',
          apiCalls: 1000000
        }
      }
    };

    return plans[planId] || plans.professional;
  }

  private getStripePriceId(planId: string): string {
    const priceIds: Record<string, string> = {
      professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
      practice: process.env.STRIPE_PRICE_PRACTICE || 'price_practice',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise'
    };

    return priceIds[planId] || priceIds.professional;
  }

  // Webhook handlers
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await supabase
      .from('payment_intents')
      .update({ status: 'succeeded', paid_at: new Date() })
      .eq('stripe_payment_intent_id', paymentIntent.id);
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await supabase
      .from('payment_intents')
      .update({ 
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message 
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Send notification to customer
    // Implementation would send email/SMS
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000)
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled', canceled_at: new Date() })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date() })
      .eq('stripe_invoice_id', invoice.id);

    // Update revenue recognition
    await this.financialModel.recognizeRevenue({
      customerId: invoice.customer as string,
      amount: invoice.amount_paid / 100,
      period: new Date()
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    await supabase
      .from('invoices')
      .update({ status: 'past_due' })
      .eq('stripe_invoice_id', invoice.id);

    // Send dunning email
    // Implementation would send payment retry notification
  }

  private async handleTrialEnding(subscription: Stripe.Subscription): Promise<void> {
    // Send trial ending notification
    // Implementation would send email to encourage conversion
    console.log('Trial ending for subscription:', subscription.id);
  }
}

export const paymentGatewayService = PaymentGatewayService.getInstance();