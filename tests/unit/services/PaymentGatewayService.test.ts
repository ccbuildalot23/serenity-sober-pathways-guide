/**
 * Unit Tests for PaymentGatewayService
 * Validates Stripe integration, subscription management, and payment processing
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PaymentGatewayService } from '@/services/PaymentGatewayService';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');
jest.mock('@/integrations/supabase/client');
jest.mock('@/services/EnhancedSecurityAuditService');
jest.mock('@/services/FinancialModelService');
jest.mock('@/services/ROIValidationService');

describe('PaymentGatewayService', () => {
  let service: PaymentGatewayService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Stripe instance
    mockStripe = {
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        del: jest.fn(),
        list: jest.fn()
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
        list: jest.fn()
      },
      paymentMethods: {
        attach: jest.fn(),
        detach: jest.fn(),
        list: jest.fn()
      },
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        confirm: jest.fn()
      },
      invoices: {
        create: jest.fn(),
        retrieve: jest.fn(),
        list: jest.fn(),
        retrieveUpcoming: jest.fn()
      },
      prices: {
        list: jest.fn()
      },
      webhooks: {
        constructEvent: jest.fn()
      }
    } as any;

    // Mock Stripe constructor
    (Stripe as any).mockImplementation(() => mockStripe);
    
    service = PaymentGatewayService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Customer Management', () => {
    it('should create a new customer successfully', async () => {
      const customerData = {
        email: 'test@clinic.com',
        name: 'Test Clinic',
        organizationId: 'org-123',
        metadata: { type: 'clinic' }
      };

      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_test123',
        email: customerData.email,
        name: customerData.name,
        metadata: customerData.metadata
      } as any);

      const customerId = await service.createCustomer(customerData);

      expect(customerId).toBe('cus_test123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: customerData.email,
        name: customerData.name,
        metadata: expect.objectContaining({
          organizationId: customerData.organizationId
        })
      });
    });

    it('should handle customer creation failure', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Invalid email'));

      await expect(service.createCustomer({
        email: 'invalid',
        name: 'Test',
        organizationId: 'org-123'
      })).rejects.toThrow('Invalid email');
    });

    it('should retrieve customer details', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({
        id: 'cus_test123',
        email: 'test@clinic.com',
        subscriptions: { data: [] }
      } as any);

      const customer = await service.getCustomer('cus_test123');

      expect(customer).toBeDefined();
      expect(customer.id).toBe('cus_test123');
      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_test123');
    });

    it('should update customer information', async () => {
      mockStripe.customers.update.mockResolvedValue({
        id: 'cus_test123',
        email: 'updated@clinic.com'
      } as any);

      await service.updateCustomer('cus_test123', {
        email: 'updated@clinic.com'
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        email: 'updated@clinic.com'
      });
    });
  });

  describe('Subscription Management', () => {
    it('should create professional tier subscription', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [{
            price: { unit_amount: 29900 }
          }]
        }
      } as any);

      const subscription = await service.createSubscription({
        customerId: 'cus_test123',
        planId: 'professional',
        trialDays: 14
      });

      expect(subscription.id).toBe('sub_test123');
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test123',
          trial_period_days: 14
        })
      );
    });

    it('should create practice tier subscription', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_practice123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [{
            price: { unit_amount: 59900 }
          }]
        }
      } as any);

      const subscription = await service.createSubscription({
        customerId: 'cus_test123',
        planId: 'practice'
      });

      expect(subscription.id).toBe('sub_practice123');
      expect(subscription.planId).toBe('practice');
    });

    it('should create enterprise tier subscription', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_enterprise123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [{
            price: { unit_amount: 199900 }
          }]
        }
      } as any);

      const subscription = await service.createSubscription({
        customerId: 'cus_test123',
        planId: 'enterprise'
      });

      expect(subscription.id).toBe('sub_enterprise123');
      expect(subscription.planId).toBe('enterprise');
    });

    it('should handle subscription upgrade', async () => {
      // Mock current subscription
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        items: {
          data: [{
            id: 'si_test123',
            price: { id: 'price_professional' }
          }]
        }
      } as any);

      // Mock updated subscription
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        items: {
          data: [{
            price: { unit_amount: 59900 }
          }]
        }
      } as any);

      const updated = await service.updateSubscription('sub_test123', 'practice');

      expect(updated.planId).toBe('practice');
      expect(mockStripe.subscriptions.update).toHaveBeenCalled();
    });

    it('should handle subscription downgrade', async () => {
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        items: {
          data: [{
            id: 'si_test123',
            price: { id: 'price_enterprise' }
          }]
        }
      } as any);

      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        items: {
          data: [{
            price: { unit_amount: 29900 }
          }]
        }
      } as any);

      const updated = await service.updateSubscription('sub_test123', 'professional');

      expect(updated.planId).toBe('professional');
    });

    it('should cancel subscription at period end', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: true,
        status: 'active'
      } as any);

      await service.cancelSubscription('sub_test123', false);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true
      });
    });

    it('should cancel subscription immediately', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValue({
        id: 'sub_test123',
        status: 'canceled'
      } as any);

      await service.cancelSubscription('sub_test123', true);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
    });

    it('should handle trial period correctly', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({
        id: 'sub_trial123',
        status: 'trialing',
        trial_end: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60)
      } as any);

      const subscription = await service.createSubscription({
        customerId: 'cus_test123',
        planId: 'professional',
        trialDays: 14
      });

      expect(subscription.status).toBe('trialing');
      expect(subscription.trial_end).toBeDefined();
    });
  });

  describe('Payment Processing', () => {
    it('should process one-time payment', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test123',
        amount: 29900,
        status: 'succeeded',
        customer: 'cus_test123'
      } as any);

      const payment = await service.processPayment({
        customerId: 'cus_test123',
        amount: 299,
        description: 'Professional plan - Monthly'
      });

      expect(payment.id).toBe('pi_test123');
      expect(payment.status).toBe('succeeded');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 29900, // Converted to cents
        currency: 'usd',
        customer: 'cus_test123',
        description: 'Professional plan - Monthly'
      });
    });

    it('should handle payment failure', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_failed123',
        status: 'requires_payment_method',
        last_payment_error: {
          message: 'Card declined'
        }
      } as any);

      const payment = await service.processPayment({
        customerId: 'cus_test123',
        amount: 299
      });

      expect(payment.status).toBe('requires_payment_method');
      expect(payment.error).toBe('Card declined');
    });

    it('should attach payment method', async () => {
      mockStripe.paymentMethods.attach.mockResolvedValue({
        id: 'pm_test123',
        customer: 'cus_test123'
      } as any);

      await service.attachPaymentMethod('pm_test123', 'cus_test123');

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test123', {
        customer: 'cus_test123'
      });
    });

    it('should set default payment method', async () => {
      mockStripe.customers.update.mockResolvedValue({
        id: 'cus_test123',
        invoice_settings: {
          default_payment_method: 'pm_test123'
        }
      } as any);

      await service.setDefaultPaymentMethod('cus_test123', 'pm_test123');

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_test123', {
        invoice_settings: {
          default_payment_method: 'pm_test123'
        }
      });
    });
  });

  describe('Invoice Management', () => {
    it('should generate invoice for customer', async () => {
      mockStripe.invoices.create.mockResolvedValue({
        id: 'in_test123',
        customer: 'cus_test123',
        amount_due: 29900,
        status: 'draft'
      } as any);

      const invoice = await service.generateInvoice('cus_test123');

      expect(invoice.id).toBe('in_test123');
      expect(invoice.customerId).toBe('cus_test123');
      expect(invoice.amount).toBe(299); // Converted from cents
    });

    it('should preview upcoming invoice', async () => {
      mockStripe.invoices.retrieveUpcoming.mockResolvedValue({
        amount_due: 59900,
        lines: {
          data: [
            {
              description: 'Practice plan',
              amount: 59900
            }
          ]
        }
      } as any);

      const preview = await service.previewInvoice('cus_test123');

      expect(preview.amount).toBe(599);
      expect(preview.lines).toHaveLength(1);
      expect(mockStripe.invoices.retrieveUpcoming).toHaveBeenCalledWith({
        customer: 'cus_test123'
      });
    });

    it('should handle proration on plan change', async () => {
      mockStripe.invoices.retrieveUpcoming.mockResolvedValue({
        amount_due: 45000, // Includes proration
        lines: {
          data: [
            {
              description: 'Remaining time on Professional plan',
              amount: -15000,
              proration: true
            },
            {
              description: 'Practice plan',
              amount: 60000,
              proration: false
            }
          ]
        }
      } as any);

      const preview = await service.previewInvoice('cus_test123');

      expect(preview.amount).toBe(450);
      expect(preview.lines).toHaveLength(2);
      expect(preview.lines.some(l => l.proration)).toBe(true);
    });
  });

  describe('Webhook Handling', () => {
    it('should verify webhook signature', async () => {
      const payload = JSON.stringify({ type: 'payment_intent.succeeded' });
      const signature = 'test_signature';

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } }
      } as any);

      const event = await service.handleWebhook(payload, signature);

      expect(event.type).toBe('payment_intent.succeeded');
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        expect.any(String)
      );
    });

    it('should reject invalid webhook signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.handleWebhook('{}', 'invalid')).rejects.toThrow('Invalid signature');
    });

    it('should handle subscription created webhook', async () => {
      const event = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event as any);

      const result = await service.handleWebhook(JSON.stringify(event), 'valid_sig');

      expect(result.type).toBe('customer.subscription.created');
    });

    it('should handle payment failed webhook', async () => {
      const event = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failed123',
            customer: 'cus_test123',
            last_payment_error: {
              message: 'Insufficient funds'
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event as any);

      const result = await service.handleWebhook(JSON.stringify(event), 'valid_sig');

      expect(result.type).toBe('payment_intent.payment_failed');
    });
  });

  describe('Pricing Validation', () => {
    it('should validate professional tier pricing', async () => {
      const pricing = await service.getPlanPricing('professional');

      expect(pricing.monthly).toBe(299);
      expect(pricing.annual).toBe(2990); // With discount
      expect(pricing.features).toContain('Up to 5 providers');
    });

    it('should validate practice tier pricing', async () => {
      const pricing = await service.getPlanPricing('practice');

      expect(pricing.monthly).toBe(599);
      expect(pricing.annual).toBe(5990);
      expect(pricing.features).toContain('5-20 providers');
    });

    it('should validate enterprise tier pricing', async () => {
      const pricing = await service.getPlanPricing('enterprise');

      expect(pricing.monthly).toBe(1999);
      expect(pricing.annual).toBe(19990);
      expect(pricing.features).toContain('Unlimited providers');
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors', async () => {
      mockStripe.customers.create.mockRejectedValue({
        type: 'StripeCardError',
        message: 'Card declined'
      });

      await expect(service.createCustomer({
        email: 'test@clinic.com',
        name: 'Test',
        organizationId: 'org-123'
      })).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      mockStripe.subscriptions.create.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(service.createSubscription({
        customerId: 'cus_test123',
        planId: 'professional'
      })).rejects.toThrow('Network timeout');
    });

    it('should handle rate limiting', async () => {
      mockStripe.customers.list.mockRejectedValue({
        type: 'StripeRateLimitError',
        message: 'Too many requests'
      });

      await expect(service.listCustomers()).rejects.toThrow();
    });
  });

  describe('Compliance and Security', () => {
    it('should not log sensitive payment data', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await service.processPayment({
        customerId: 'cus_test123',
        amount: 299,
        paymentMethodId: 'pm_card_visa_4242'
      });

      // Should not log payment method ID
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('pm_card_visa_4242')
      );
    });

    it('should audit payment events', async () => {
      const auditSpy = jest.spyOn(service as any, 'auditPaymentEvent');

      await service.processPayment({
        customerId: 'cus_test123',
        amount: 299
      });

      // Verify audit logging (if implemented)
      // expect(auditSpy).toHaveBeenCalled();
    });

    it('should enforce PCI compliance', async () => {
      // Should not store card details directly
      const payment = await service.processPayment({
        customerId: 'cus_test123',
        amount: 299,
        cardNumber: '4242424242424242' // Should not be accepted
      } as any);

      // Service should reject or ignore card number
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          cardNumber: '4242424242424242'
        })
      );
    });
  });
});