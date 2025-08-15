/**
 * Mock implementation of Stripe for testing
 */

const mockStripe = {
  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@test.com',
      metadata: {}
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@test.com',
      subscriptions: { data: [] }
    }),
    update: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@test.com'
    }),
    del: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      deleted: true
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false
    })
  },
  subscriptions: {
    create: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      customer: 'cus_test123',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      items: {
        data: [{
          id: 'si_test123',
          price: { id: 'price_test123', unit_amount: 9900 }
        }]
      }
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      customer: 'cus_test123',
      status: 'active'
    }),
    update: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      customer: 'cus_test123',
      status: 'active'
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      status: 'canceled',
      canceled_at: Math.floor(Date.now() / 1000)
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false
    })
  },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      amount: 9900,
      currency: 'usd',
      status: 'requires_payment_method',
      client_secret: 'pi_test123_secret'
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      amount: 9900,
      status: 'succeeded'
    }),
    update: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      amount: 9900
    }),
    confirm: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      status: 'succeeded'
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'pi_test123',
      status: 'canceled'
    })
  },
  paymentMethods: {
    create: jest.fn().mockResolvedValue({
      id: 'pm_test123',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242'
      }
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'pm_test123',
      type: 'card'
    }),
    attach: jest.fn().mockResolvedValue({
      id: 'pm_test123',
      customer: 'cus_test123'
    }),
    detach: jest.fn().mockResolvedValue({
      id: 'pm_test123',
      customer: null
    })
  },
  invoices: {
    create: jest.fn().mockResolvedValue({
      id: 'in_test123',
      customer: 'cus_test123',
      amount_due: 9900,
      status: 'draft'
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'in_test123',
      status: 'paid'
    }),
    finalizeInvoice: jest.fn().mockResolvedValue({
      id: 'in_test123',
      customer: 'cus_test123',
      subscription: 'sub_test123',
      amount_due: 9900,
      currency: 'usd',
      status: 'open',
      due_date: Math.floor(Date.now() / 1000) + 86400,
      lines: { data: [{ description: 'Line', quantity: 1, unit_amount: 9900, amount: 9900 }] },
      metadata: {}
    }),
    retrieveUpcoming: jest.fn().mockResolvedValue({
      amount_due: 0,
      lines: { data: [] }
    }),
    sendInvoice: jest.fn().mockResolvedValue({
      id: 'in_test123',
      status: 'open'
    }),
    pay: jest.fn().mockResolvedValue({
      id: 'in_test123',
      status: 'paid',
      paid: true
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false
    })
  },
  prices: {
    create: jest.fn().mockResolvedValue({
      id: 'price_test123',
      unit_amount: 9900,
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'price_test123',
      unit_amount: 9900
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false
    })
  },
  products: {
    create: jest.fn().mockResolvedValue({
      id: 'prod_test123',
      name: 'Test Product',
      active: true
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'prod_test123',
      name: 'Test Product'
    }),
    update: jest.fn().mockResolvedValue({
      id: 'prod_test123',
      name: 'Updated Product'
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false
    })
  },
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
        payment_status: 'unpaid'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cs_test123',
        payment_status: 'paid'
      }),
      listLineItems: jest.fn().mockResolvedValue({
        data: [],
        has_more: false
      })
    }
  },
  webhookEndpoints: {
    create: jest.fn().mockResolvedValue({
      id: 'we_test123',
      url: 'https://example.com/webhook',
      enabled_events: ['*']
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'we_test123'
    }),
    update: jest.fn().mockResolvedValue({
      id: 'we_test123'
    }),
    del: jest.fn().mockResolvedValue({
      id: 'we_test123',
      deleted: true
    })
  },
  webhooks: {
    constructEvent: jest.fn((_payload, _signature, _secret) => ({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 9900
        }
      }
    }))
  },
  charges: {
    create: jest.fn().mockResolvedValue({
      id: 'ch_test123',
      amount: 9900,
      currency: 'usd',
      paid: true
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'ch_test123',
      paid: true
    })
  },
  refunds: {
    create: jest.fn().mockResolvedValue({
      id: 're_test123',
      amount: 9900,
      status: 'succeeded'
    })
  },
  balance: {
    retrieve: jest.fn().mockResolvedValue({
      available: [{ amount: 100000, currency: 'usd' }],
      pending: [{ amount: 50000, currency: 'usd' }]
    })
  },
  balanceTransactions: {
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false
    })
  }
};

// Main Stripe constructor mock
const Stripe = jest.fn(() => mockStripe);

// Static methods
Stripe.errors = {
  StripeError: class StripeError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StripeError';
    }
  },
  StripeCardError: class StripeCardError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StripeCardError';
    }
  },
  StripeInvalidRequestError: class StripeInvalidRequestError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StripeInvalidRequestError';
    }
  },
  StripeAPIError: class StripeAPIError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'StripeAPIError';
    }
  }
};

export default Stripe;