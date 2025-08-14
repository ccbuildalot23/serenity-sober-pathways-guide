import Stripe from 'stripe';
import { supabase } from '@/integrations/supabase/client';

/**
 * B2B SaaS Subscription Management Service
 * 
 * Handles three-tier pricing model:
 * - Professional: $299/month - Basic substance abuse retention + billing
 * - Practice: $599/month - Professional + AI therapy + telehealth  
 * - Enterprise: $1,999/month - Everything + white-label + priority support
 * 
 * Features:
 * - Stripe integration for payments
 * - Usage-based billing for overages
 * - Implementation fees and setup
 * - Subscription lifecycle management
 * - Revenue recognition and MRR tracking
 */

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 299,
    yearlyPrice: 2990, // 2 months free
    stripePriceId: 'price_professional_monthly',
    stripeYearlyPriceId: 'price_professional_yearly',
    features: [
      'Patient retention tools',
      'Basic billing automation',
      'CPT code generation (99490, 99439)',
      'Standard support',
      'Up to 100 patients',
      'Basic analytics'
    ],
    limits: {
      patients: 100,
      providers: 1,
      storage: '10GB',
      supportLevel: 'standard'
    }
  },
  PRACTICE: {
    id: 'practice', 
    name: 'Practice',
    monthlyPrice: 599,
    yearlyPrice: 5990,
    stripePriceId: 'price_practice_monthly',
    stripeYearlyPriceId: 'price_practice_yearly',
    features: [
      'Everything in Professional',
      'AI therapy companion',
      'Telehealth video calls',
      'Advanced CPT codes (99492-99494)',
      'Peer support community',
      'Priority support',
      'Up to 500 patients',
      'Advanced analytics',
      'Crisis detection'
    ],
    limits: {
      patients: 500,
      providers: 5,
      storage: '100GB',
      supportLevel: 'priority'
    }
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    stripePriceId: 'price_enterprise_monthly',
    stripeYearlyPriceId: 'price_enterprise_yearly',
    features: [
      'Everything in Practice',
      'White-label solution',
      'Custom integrations',
      'Dedicated success manager',
      'HIPAA compliance consulting',
      'Unlimited patients',
      'Unlimited providers',
      'Custom analytics',
      'SLA guarantees',
      'On-premise deployment'
    ],
    limits: {
      patients: -1, // unlimited
      providers: -1,
      storage: 'unlimited',
      supportLevel: 'dedicated'
    }
  }
};

export const IMPLEMENTATION_FEES = {
  PROFESSIONAL: 2500,
  PRACTICE: 5000,
  ENTERPRISE: 15000
};

export interface SubscriptionPlan {
  id: string;
  organizationId: string;
  tier: keyof typeof SUBSCRIPTION_TIERS;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  implementationPaid: boolean;
  setupCompleted: boolean;
  usage: {
    patients: number;
    providers: number;
    storageUsed: string;
    apiCalls: number;
  };
  overageCharges: {
    patientsOverage: number;
    storageOverage: number;
    apiOverage: number;
  };
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
}

export interface BillingMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  expansionRevenue: number;
  averageRevenuePerUser: number;
  lifetimeValue: number;
  customerAcquisitionCost: number;
  netRevenueRetention: number;
}

class SubscriptionService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20'
    });
  }

  /**
   * Create new subscription for organization
   */
  async createSubscription(
    organizationId: string,
    tier: keyof typeof SUBSCRIPTION_TIERS,
    billingCycle: 'monthly' | 'yearly',
    paymentMethodId: string,
    implementationRequired: boolean = true
  ): Promise<SubscriptionPlan> {
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    const priceId = billingCycle === 'yearly' ? tierConfig.stripeYearlyPriceId : tierConfig.stripePriceId;

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Create or retrieve Stripe customer
    let stripeCustomer;
    try {
      const customers = await this.stripe.customers.list({
        email: organization.billing_email,
        limit: 1
      });

      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];
      } else {
        stripeCustomer = await this.stripe.customers.create({
          email: organization.billing_email,
          name: organization.name,
          metadata: {
            organizationId: organizationId,
            tier: tier
          }
        });
      }
    } catch (error) {
      throw new Error(`Failed to create Stripe customer: ${error}`);
    }

    // Attach payment method
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomer.id
    });

    // Set as default payment method
    await this.stripe.customers.update(stripeCustomer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Create subscription with trial
    const subscriptionItems = [{
      price: priceId,
      quantity: 1
    }];

    // Add implementation fee if required
    if (implementationRequired) {
      // Create one-time implementation fee
      await this.stripe.invoiceItems.create({
        customer: stripeCustomer.id,
        amount: IMPLEMENTATION_FEES[tier] * 100, // Convert to cents
        currency: 'usd',
        description: `${tier} Implementation Fee`
      });
    }

    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: subscriptionItems,
      trial_period_days: 14, // 14-day trial
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        organizationId: organizationId,
        tier: tier
      }
    });

    // Calculate MRR/ARR
    const monthlyAmount = billingCycle === 'yearly' 
      ? tierConfig.yearlyPrice / 12 
      : tierConfig.monthlyPrice;
    
    const mrr = monthlyAmount;
    const arr = monthlyAmount * 12;

    // Create subscription record
    const subscription: SubscriptionPlan = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      organizationId,
      tier,
      status: stripeSubscription.status as any,
      billingCycle,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeCustomer.id,
      implementationPaid: implementationRequired,
      setupCompleted: false,
      usage: {
        patients: 0,
        providers: 0,
        storageUsed: '0MB',
        apiCalls: 0
      },
      overageCharges: {
        patientsOverage: 0,
        storageOverage: 0,
        apiOverage: 0
      },
      mrr,
      arr
    };

    // Save to database
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(subscription)
      .select()
      .single();

    if (error) throw error;

    // Log subscription event
    await supabase.from('subscription_events').insert({
      subscription_id: subscription.id,
      event_type: 'subscription_created',
      data: { tier, billingCycle, trialEnd: subscription.trialEnd },
      timestamp: new Date().toISOString()
    });

    // Update organization subscription
    await supabase
      .from('organizations')
      .update({
        subscription_id: subscription.id,
        subscription_tier: tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    return data as SubscriptionPlan;
  }

  /**
   * Upgrade/downgrade subscription
   */
  async changeSubscription(
    subscriptionId: string,
    newTier: keyof typeof SUBSCRIPTION_TIERS,
    newBillingCycle?: 'monthly' | 'yearly'
  ): Promise<SubscriptionPlan> {
    // Get current subscription
    const { data: currentSub } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!currentSub) {
      throw new Error('Subscription not found');
    }

    const newTierConfig = SUBSCRIPTION_TIERS[newTier];
    const billingCycle = newBillingCycle || currentSub.billing_cycle;
    const newPriceId = billingCycle === 'yearly' 
      ? newTierConfig.stripeYearlyPriceId 
      : newTierConfig.stripePriceId;

    // Update Stripe subscription
    const stripeSubscription = await this.stripe.subscriptions.retrieve(currentSub.stripe_subscription_id);
    
    await this.stripe.subscriptions.update(currentSub.stripe_subscription_id, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: 'always_invoice' // Immediate billing for upgrades
    });

    // Calculate new MRR/ARR
    const monthlyAmount = billingCycle === 'yearly' 
      ? newTierConfig.yearlyPrice / 12 
      : newTierConfig.monthlyPrice;

    // Update subscription record
    const updatedSub = {
      ...currentSub,
      tier: newTier,
      billing_cycle: billingCycle,
      mrr: monthlyAmount,
      arr: monthlyAmount * 12,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updatedSub)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    // Log subscription change
    await supabase.from('subscription_events').insert({
      subscription_id: subscriptionId,
      event_type: 'subscription_changed',
      data: { 
        oldTier: currentSub.tier, 
        newTier,
        oldBillingCycle: currentSub.billing_cycle,
        newBillingCycle: billingCycle
      },
      timestamp: new Date().toISOString()
    });

    return data as SubscriptionPlan;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const { data: subscription } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Cancel in Stripe (at period end)
    await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update subscription status
    await supabase
      .from('subscription_plans')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    // Log cancellation
    await supabase.from('subscription_events').insert({
      subscription_id: subscriptionId,
      event_type: 'subscription_canceled',
      data: { reason },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track usage and calculate overage charges
   */
  async updateUsage(
    subscriptionId: string,
    usage: {
      patients?: number;
      providers?: number;
      storageUsed?: string;
      apiCalls?: number;
    }
  ): Promise<void> {
    const { data: subscription } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!subscription) return;

    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS];
    const updatedUsage = { ...subscription.usage, ...usage };

    // Calculate overages
    let patientsOverage = 0;
    let storageOverage = 0;
    let apiOverage = 0;

    if (tierConfig.limits.patients > 0 && updatedUsage.patients > tierConfig.limits.patients) {
      patientsOverage = (updatedUsage.patients - tierConfig.limits.patients) * 10; // $10 per extra patient
    }

    // Parse storage usage (assuming in MB)
    const storageUsedMB = parseInt(updatedUsage.storageUsed.replace(/[^\d]/g, ''));
    const storageLimitMB = tierConfig.limits.storage === 'unlimited' 
      ? -1 
      : parseInt(tierConfig.limits.storage.replace(/[^\d]/g, '')) * 1024; // Convert GB to MB

    if (storageLimitMB > 0 && storageUsedMB > storageLimitMB) {
      storageOverage = Math.ceil((storageUsedMB - storageLimitMB) / 1024) * 25; // $25 per extra GB
    }

    // API overage (assuming 10,000 calls included)
    if (updatedUsage.apiCalls > 10000) {
      apiOverage = Math.ceil((updatedUsage.apiCalls - 10000) / 1000) * 5; // $5 per 1000 extra calls
    }

    // Update subscription with usage and overages
    await supabase
      .from('subscription_plans')
      .update({
        usage: updatedUsage,
        overage_charges: {
          patients_overage: patientsOverage,
          storage_overage: storageOverage,
          api_overage: apiOverage
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    // If there are overages, create invoice item
    const totalOverage = patientsOverage + storageOverage + apiOverage;
    if (totalOverage > 0) {
      await this.stripe.invoiceItems.create({
        customer: subscription.stripe_customer_id,
        amount: totalOverage * 100, // Convert to cents
        currency: 'usd',
        description: 'Usage overages'
      });
    }
  }

  /**
   * Calculate billing metrics
   */
  async calculateBillingMetrics(): Promise<BillingMetrics> {
    // Get all active subscriptions
    const { data: subscriptions } = await supabase
      .from('subscription_plans')
      .select('*')
      .in('status', ['active', 'trialing']);

    if (!subscriptions || subscriptions.length === 0) {
      return {
        mrr: 0,
        arr: 0,
        churnRate: 0,
        expansionRevenue: 0,
        averageRevenuePerUser: 0,
        lifetimeValue: 0,
        customerAcquisitionCost: 0,
        netRevenueRetention: 100
      };
    }

    // Calculate MRR and ARR
    const mrr = subscriptions.reduce((sum, sub) => sum + (sub.mrr || 0), 0);
    const arr = mrr * 12;

    // Calculate churn rate (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: churnedSubs } = await supabase
      .from('subscription_events')
      .select('subscription_id')
      .eq('event_type', 'subscription_canceled')
      .gte('timestamp', thirtyDaysAgo.toISOString());

    const churnRate = churnedSubs ? (churnedSubs.length / subscriptions.length) * 100 : 0;

    // Calculate expansion revenue (upgrades - downgrades)
    const { data: upgrades } = await supabase
      .from('subscription_events')
      .select('*')
      .eq('event_type', 'subscription_changed')
      .gte('timestamp', thirtyDaysAgo.toISOString());

    let expansionRevenue = 0;
    if (upgrades) {
      for (const upgrade of upgrades) {
        const oldTierPrice = SUBSCRIPTION_TIERS[upgrade.data.oldTier as keyof typeof SUBSCRIPTION_TIERS]?.monthlyPrice || 0;
        const newTierPrice = SUBSCRIPTION_TIERS[upgrade.data.newTier as keyof typeof SUBSCRIPTION_TIERS]?.monthlyPrice || 0;
        expansionRevenue += newTierPrice - oldTierPrice;
      }
    }

    // Calculate other metrics
    const averageRevenuePerUser = mrr / subscriptions.length;
    const lifetimeValue = averageRevenuePerUser / (churnRate / 100 / 12); // Simplified LTV calculation
    const customerAcquisitionCost = 150; // Placeholder - would calculate from marketing spend
    const netRevenueRetention = 100 + (expansionRevenue / mrr) * 100;

    return {
      mrr,
      arr,
      churnRate,
      expansionRevenue,
      averageRevenuePerUser,
      lifetimeValue,
      customerAcquisitionCost,
      netRevenueRetention
    };
  }

  /**
   * Process Stripe webhook events
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handleSuccessfulPayment(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleFailedPayment(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancellation(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async handleSuccessfulPayment(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    
    // Find our subscription record
    const { data: subscription } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subscription) {
      await supabase
        .from('subscription_plans')
        .update({ status: 'active' })
        .eq('id', subscription.id);

      // Log payment success
      await supabase.from('subscription_events').insert({
        subscription_id: subscription.id,
        event_type: 'payment_succeeded',
        data: { amount: invoice.amount_paid / 100 },
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleFailedPayment(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    
    const { data: subscription } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subscription) {
      await supabase
        .from('subscription_plans')
        .update({ status: 'past_due' })
        .eq('id', subscription.id);

      // Log payment failure
      await supabase.from('subscription_events').insert({
        subscription_id: subscription.id,
        event_type: 'payment_failed',
        data: { amount: invoice.amount_due / 100 },
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    // Update subscription details from Stripe
    const { data: localSub } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (localSub) {
      await supabase
        .from('subscription_plans')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        })
        .eq('id', localSub.id);
    }
  }

  private async handleSubscriptionCancellation(subscription: Stripe.Subscription): Promise<void> {
    const { data: localSub } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (localSub) {
      await supabase
        .from('subscription_plans')
        .update({ status: 'canceled' })
        .eq('id', localSub.id);

      await supabase.from('subscription_events').insert({
        subscription_id: localSub.id,
        event_type: 'subscription_canceled',
        data: { canceledAt: new Date(subscription.canceled_at! * 1000) },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get subscription by organization
   */
  async getSubscription(organizationId: string): Promise<SubscriptionPlan | null> {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    return data as SubscriptionPlan | null;
  }

  /**
   * Get all subscriptions with filters
   */
  async getSubscriptions(filters?: {
    status?: string[];
    tier?: string[];
    limit?: number;
  }): Promise<SubscriptionPlan[]> {
    let query = supabase.from('subscription_plans').select('*');

    if (filters?.status) {
      query = query.in('status', filters.status);
    }
    if (filters?.tier) {
      query = query.in('tier', filters.tier);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data } = await query;
    return data as SubscriptionPlan[] || [];
  }
}

export const subscriptionService = new SubscriptionService();