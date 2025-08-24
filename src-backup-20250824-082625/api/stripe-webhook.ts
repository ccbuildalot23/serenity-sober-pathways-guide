/**
 * Stripe Webhook Handler
 * Processes webhook events from Stripe for subscription lifecycle management
 * Handles payment failures, subscription changes, and billing events
 */

import Stripe from 'stripe';
import { supabase } from '@/integrations/supabase/client';
import { PaymentGatewayService } from '@/services/PaymentGatewayService';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { FinancialModelService } from '@/services/FinancialModelService';
import logger from '../services/loggerService';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

const paymentService = PaymentGatewayService.getInstance();
const financialModel = new FinancialModelService();

/**
 * Main webhook handler endpoint
 */
export async function handleStripeWebhook(
  request: Request
): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('No signature provided', { status: 400 });
  }

  let event: Stripe.Event;
  
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error);
    await logWebhookError('signature_verification_failed', error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Process the event
  try {
    await processWebhookEvent(event);
    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    await logWebhookError(event.type, error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

/**
 * Process individual webhook events
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  logger.debug(`Processing webhook event: ${event.type}`, { component: 'stripe-webhook' });
  
  switch (event.type) {
    // Subscription lifecycle events
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;
      
    // Payment events
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
      
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
      
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.upcoming':
      await handleUpcomingInvoice(event.data.object as Stripe.Invoice);
      break;
      
    // Customer events
    case 'customer.updated':
      await handleCustomerUpdated(event.data.object as Stripe.Customer);
      break;
      
    case 'customer.deleted':
      await handleCustomerDeleted(event.data.object as Stripe.Customer);
      break;
      
    // Payment method events
    case 'payment_method.attached':
      await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
      break;
      
    case 'payment_method.detached':
      await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
      break;
      
    default:
      logger.debug(`Unhandled webhook event type: ${event.type}`, { component: 'stripe-webhook' });
  }
  
  // Log successful processing
  await logWebhookSuccess(event);
}

/**
 * Subscription event handlers
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  logger.debug(`New subscription created: ${subscription.id}`, { component: 'stripe-webhook' });
  
  // Get plan details
  const planName = getPlanName(subscription);
  const mrr = calculateMRR(subscription);
  
  // Store subscription in database
  await supabase
    .from('subscriptions')
    .insert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      plan_name: planName,
      mrr: mrr,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
      created_at: new Date()
    });
  
  // Update financial model
  await financialModel.addCustomer({
    customerId: subscription.customer as string,
    tier: planName as 'professional' | 'practice' | 'enterprise',
    mrr: mrr,
    startDate: new Date()
  });
  
  // Send welcome email
  await sendSubscriptionEmail(subscription, 'welcome');
  
  // Log audit event
  await enhancedSecurityAuditService.logSecurityEvent({
    eventType: 'subscription_created',
    userId: subscription.metadata?.user_id || 'system',
    metadata: {
      subscription_id: subscription.id,
      plan: planName,
      mrr: mrr
    }
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  logger.debug(`Subscription updated: ${subscription.id}`, { component: 'stripe-webhook' });
  
  const planName = getPlanName(subscription);
  const mrr = calculateMRR(subscription);
  
  // Update subscription in database
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      plan_name: planName,
      mrr: mrr,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id);
  
  // Check for plan changes
  const previousPlan = await getPreviousPlan(subscription.id);
  if (previousPlan !== planName) {
    await handlePlanChange(subscription, previousPlan, planName);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  logger.debug(`Subscription cancelled: ${subscription.id}`, { component: 'stripe-webhook' });
  
  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date(),
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id);
  
  // Record churn in financial model
  await financialModel.recordChurn({
    customerId: subscription.customer as string,
    reason: subscription.cancellation_details?.reason || 'unknown',
    mrr: calculateMRR(subscription)
  });
  
  // Send cancellation email
  await sendSubscriptionEmail(subscription, 'cancelled');
  
  // Schedule data retention per HIPAA requirements
  await scheduleDataRetention(subscription.customer as string);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  logger.debug(`Trial ending soon for subscription: ${subscription.id}`, { component: 'stripe-webhook' });
  
  // Send trial ending reminder
  await sendSubscriptionEmail(subscription, 'trial_ending');
  
  // Create task for sales team follow-up
  await createSalesTask({
    type: 'trial_ending',
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    dueDate: new Date(subscription.trial_end! * 1000)
  });
}

/**
 * Payment event handlers
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.debug(`Payment succeeded: ${paymentIntent.id}`, { component: 'stripe-webhook' });
  
  // Update payment record
  await supabase
    .from('payments')
    .insert({
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      status: 'succeeded',
      customer_id: paymentIntent.customer as string,
      description: paymentIntent.description,
      metadata: paymentIntent.metadata,
      created_at: new Date()
    });
  
  // Update customer payment status
  await updateCustomerPaymentStatus(paymentIntent.customer as string, 'current');
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.debug(`Payment failed: ${paymentIntent.id}`, { component: 'stripe-webhook' });
  
  // Record failed payment
  await supabase
    .from('payments')
    .insert({
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: 'failed',
      customer_id: paymentIntent.customer as string,
      failure_reason: paymentIntent.last_payment_error?.message,
      metadata: paymentIntent.metadata,
      created_at: new Date()
    });
  
  // Update customer payment status
  await updateCustomerPaymentStatus(paymentIntent.customer as string, 'past_due');
  
  // Send payment failure notification
  await sendPaymentFailureNotification(paymentIntent);
  
  // Initiate recovery flow
  await initiatePaymentRecovery(paymentIntent);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  logger.debug(`Invoice payment succeeded: ${invoice.id}`, { component: 'stripe-webhook' });
  
  // Update invoice record
  await supabase
    .from('invoices')
    .upsert({
      stripe_invoice_id: invoice.id,
      customer_id: invoice.customer as string,
      subscription_id: invoice.subscription as string,
      amount_paid: invoice.amount_paid / 100,
      amount_due: invoice.amount_due / 100,
      status: 'paid',
      paid_at: new Date(),
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      metadata: invoice.metadata
    });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  logger.debug(`Invoice payment failed: ${invoice.id}`, { component: 'stripe-webhook' });
  
  // Update invoice record
  await supabase
    .from('invoices')
    .upsert({
      stripe_invoice_id: invoice.id,
      customer_id: invoice.customer as string,
      subscription_id: invoice.subscription as string,
      amount_due: invoice.amount_due / 100,
      status: 'payment_failed',
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt ? 
        new Date(invoice.next_payment_attempt * 1000) : null,
      metadata: invoice.metadata
    });
  
  // Determine dunning action based on attempt count
  if (invoice.attempt_count === 1) {
    await sendPaymentRetryNotification(invoice, 3); // Retry in 3 days
  } else if (invoice.attempt_count === 2) {
    await sendPaymentRetryNotification(invoice, 5); // Retry in 5 days
  } else if (invoice.attempt_count === 3) {
    await sendFinalPaymentWarning(invoice);
  } else {
    await handleSubscriptionSuspension(invoice.subscription as string);
  }
}

async function handleUpcomingInvoice(invoice: Stripe.Invoice): Promise<void> {
  logger.debug(`Upcoming invoice: ${invoice.id}`, { component: 'stripe-webhook' });
  
  // Send invoice preview to customer
  await sendUpcomingInvoiceNotification(invoice);
  
  // Check for potential payment issues
  await checkPaymentMethodStatus(invoice.customer as string);
}

/**
 * Customer event handlers
 */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  logger.debug(`Customer updated: ${customer.id}`, { component: 'stripe-webhook' });
  
  // Update customer record
  await supabase
    .from('customers')
    .update({
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      metadata: customer.metadata,
      updated_at: new Date()
    })
    .eq('stripe_customer_id', customer.id);
}

async function handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
  logger.debug(`Customer deleted: ${customer.id}`, { component: 'stripe-webhook' });
  
  // Soft delete customer record
  await supabase
    .from('customers')
    .update({
      deleted_at: new Date(),
      deletion_reason: 'stripe_deletion'
    })
    .eq('stripe_customer_id', customer.id);
  
  // Initiate HIPAA-compliant data retention
  await initiateDataDeletion(customer.id);
}

/**
 * Payment method event handlers
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  logger.debug(`Payment method attached: ${paymentMethod.id}`, { component: 'stripe-webhook' });
  
  // Store payment method details (PCI-compliant)
  await supabase
    .from('payment_methods')
    .insert({
      stripe_payment_method_id: paymentMethod.id,
      customer_id: paymentMethod.customer as string,
      type: paymentMethod.type,
      card_last4: paymentMethod.card?.last4,
      card_brand: paymentMethod.card?.brand,
      card_exp_month: paymentMethod.card?.exp_month,
      card_exp_year: paymentMethod.card?.exp_year,
      created_at: new Date()
    });
  
  // Check if this fixes a payment issue
  await checkAndResolvePaymentIssues(paymentMethod.customer as string);
}

async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  logger.debug(`Payment method detached: ${paymentMethod.id}`, { component: 'stripe-webhook' });
  
  // Mark payment method as removed
  await supabase
    .from('payment_methods')
    .update({
      deleted_at: new Date()
    })
    .eq('stripe_payment_method_id', paymentMethod.id);
  
  // Check if customer has other payment methods
  await verifyPaymentMethodAvailability(paymentMethod.customer as string);
}

/**
 * Helper functions
 */
function getPlanName(subscription: Stripe.Subscription): string {
  const item = subscription.items.data[0];
  const price = item?.price;
  
  if (!price) return 'unknown';
  
  // Map price to plan name based on amount
  const amount = price.unit_amount || 0;
  
  if (amount === 29900) return 'professional';
  if (amount === 59900) return 'practice';
  if (amount === 199900) return 'enterprise';
  
  return price.nickname || 'custom';
}

function calculateMRR(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0];
  const price = item?.price;
  
  if (!price || !price.unit_amount) return 0;
  
  let mrr = (price.unit_amount / 100) * (item.quantity || 1);
  
  // Adjust for billing interval
  if (price.recurring?.interval === 'year') {
    mrr = mrr / 12;
  } else if (price.recurring?.interval === 'week') {
    mrr = mrr * 4.33;
  } else if (price.recurring?.interval === 'day') {
    mrr = mrr * 30;
  }
  
  return Math.round(mrr * 100) / 100;
}

async function getPreviousPlan(subscriptionId: string): Promise<string> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_name')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  
  return data?.plan_name || 'unknown';
}

async function handlePlanChange(
  subscription: Stripe.Subscription,
  oldPlan: string,
  newPlan: string
): Promise<void> {
  logger.debug(`Plan changed from ${oldPlan} to ${newPlan}`, { component: 'stripe-webhook' });
  
  // Calculate proration
  const proration = await calculateProration(subscription);
  
  // Update financial metrics
  await financialModel.recordPlanChange({
    customerId: subscription.customer as string,
    oldPlan: oldPlan as any,
    newPlan: newPlan as any,
    proration: proration
  });
  
  // Send plan change notification
  await sendPlanChangeNotification(subscription, oldPlan, newPlan);
}

async function calculateProration(subscription: Stripe.Subscription): Promise<number> {
  // This would calculate actual proration based on Stripe's proration rules
  // Simplified for demo
  return 0;
}

async function sendSubscriptionEmail(
  subscription: Stripe.Subscription,
  type: 'welcome' | 'cancelled' | 'trial_ending'
): Promise<void> {
  // Implementation would send actual emails
  logger.debug(`Sending ${type} email for subscription ${subscription.id}`, { component: 'stripe-webhook' });
}

async function sendPaymentFailureNotification(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.debug(`Sending payment failure notification for ${paymentIntent.id}`, { component: 'stripe-webhook' });
  // Implementation would send actual notification
}

async function sendPaymentRetryNotification(invoice: Stripe.Invoice, daysUntilRetry: number): Promise<void> {
  logger.debug(`Payment retry in ${daysUntilRetry} days for invoice ${invoice.id}`, { component: 'stripe-webhook' });
  // Implementation would send actual notification
}

async function sendFinalPaymentWarning(invoice: Stripe.Invoice): Promise<void> {
  logger.debug(`Sending final payment warning for invoice ${invoice.id}`, { component: 'stripe-webhook' });
  // Implementation would send urgent notification
}

async function sendUpcomingInvoiceNotification(invoice: Stripe.Invoice): Promise<void> {
  logger.debug(`Sending upcoming invoice notification for ${invoice.id}`, { component: 'stripe-webhook' });
  // Implementation would send invoice preview
}

async function sendPlanChangeNotification(
  subscription: Stripe.Subscription,
  oldPlan: string,
  newPlan: string
): Promise<void> {
  logger.debug(`Sending plan change notification: ${oldPlan} -> ${newPlan}`, { component: 'stripe-webhook' });
  // Implementation would send notification
}

async function initiatePaymentRecovery(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.debug(`Initiating payment recovery for ${paymentIntent.id}`, { component: 'stripe-webhook' });
  
  // Create recovery task
  await supabase
    .from('payment_recovery_tasks')
    .insert({
      payment_intent_id: paymentIntent.id,
      customer_id: paymentIntent.customer as string,
      amount: paymentIntent.amount / 100,
      status: 'pending',
      retry_count: 0,
      next_retry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      created_at: new Date()
    });
}

async function handleSubscriptionSuspension(subscriptionId: string): Promise<void> {
  logger.debug(`Suspending subscription ${subscriptionId} due to payment failure`, { component: 'stripe-webhook' });
  
  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'suspended',
      suspended_at: new Date(),
      suspension_reason: 'payment_failure'
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  // Restrict access
  await restrictUserAccess(subscriptionId);
}

async function updateCustomerPaymentStatus(customerId: string, status: string): Promise<void> {
  await supabase
    .from('customers')
    .update({
      payment_status: status,
      payment_status_updated_at: new Date()
    })
    .eq('stripe_customer_id', customerId);
}

async function checkPaymentMethodStatus(customerId: string): Promise<void> {
  // Check if payment method is expiring soon
  const { data: methods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('customer_id', customerId)
    .is('deleted_at', null);
  
  for (const method of methods || []) {
    if (method.card_exp_year && method.card_exp_month) {
      const expDate = new Date(method.card_exp_year, method.card_exp_month - 1);
      const monthsUntilExpiry = (expDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000);
      
      if (monthsUntilExpiry < 2) {
        await sendCardExpiryWarning(customerId, method);
      }
    }
  }
}

async function sendCardExpiryWarning(customerId: string, paymentMethod: any): Promise<void> {
  logger.debug(`Card expiring soon for customer ${customerId}`, { component: 'stripe-webhook' });
  // Implementation would send warning email
}

async function checkAndResolvePaymentIssues(customerId: string): Promise<void> {
  // Check for pending payment retries
  const { data: pendingPayments } = await supabase
    .from('payment_recovery_tasks')
    .select('*')
    .eq('customer_id', customerId)
    .eq('status', 'pending');
  
  if (pendingPayments && pendingPayments.length > 0) {
    // Attempt to retry payments
    for (const payment of pendingPayments) {
      await retryPayment(payment);
    }
  }
}

async function retryPayment(paymentTask: any): Promise<void> {
  logger.debug(`Retrying payment ${paymentTask.payment_intent_id}`, { component: 'stripe-webhook' });
  // Implementation would retry the payment
}

async function verifyPaymentMethodAvailability(customerId: string): Promise<void> {
  const { data: methods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('customer_id', customerId)
    .is('deleted_at', null);
  
  if (!methods || methods.length === 0) {
    await sendNoPaymentMethodWarning(customerId);
  }
}

async function sendNoPaymentMethodWarning(customerId: string): Promise<void> {
  logger.debug(`No payment method available for customer ${customerId}`, { component: 'stripe-webhook' });
  // Implementation would send warning
}

async function createSalesTask(task: any): Promise<void> {
  await supabase
    .from('sales_tasks')
    .insert({
      ...task,
      status: 'pending',
      created_at: new Date()
    });
}

async function scheduleDataRetention(customerId: string): Promise<void> {
  // Schedule HIPAA-compliant data retention (6 years)
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 6);
  
  await supabase
    .from('data_retention_schedule')
    .insert({
      customer_id: customerId,
      retention_until: retentionDate,
      reason: 'subscription_cancelled',
      created_at: new Date()
    });
}

async function initiateDataDeletion(customerId: string): Promise<void> {
  // Mark for deletion after retention period
  await supabase
    .from('data_deletion_queue')
    .insert({
      customer_id: customerId,
      scheduled_deletion: new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000), // 6 years
      status: 'scheduled',
      created_at: new Date()
    });
}

async function restrictUserAccess(subscriptionId: string): Promise<void> {
  // Get associated users
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
  
  if (subscription?.organization_id) {
    // Restrict access for all users in organization
    await supabase
      .from('user_access')
      .update({
        access_level: 'restricted',
        restriction_reason: 'payment_failure',
        restricted_at: new Date()
      })
      .eq('organization_id', subscription.organization_id);
  }
}

async function logWebhookSuccess(event: Stripe.Event): Promise<void> {
  await enhancedSecurityAuditService.logSecurityEvent({
    eventType: 'stripe_webhook_success',
    userId: 'system',
    metadata: {
      event_type: event.type,
      event_id: event.id,
      livemode: event.livemode
    }
  });
}

async function logWebhookError(eventType: string, error: any): Promise<void> {
  await enhancedSecurityAuditService.logSecurityEvent({
    eventType: 'stripe_webhook_error',
    userId: 'system',
    metadata: {
      event_type: eventType,
      error: error.message,
      stack: error.stack
    }
  });
}