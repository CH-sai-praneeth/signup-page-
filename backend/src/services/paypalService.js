const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

class PayPalService {
  constructor() {
    this.client = this.createClient();
  }

  // Create PayPal client based on environment
  createClient() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    if (!clientId || !clientSecret) {
      console.error('❌ PayPal credentials not configured');
      return null;
    }

    let environment;
    if (mode === 'sandbox') {
      environment = new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
    } else {
      environment = new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
    }

    const client = new checkoutNodeJssdk.core.PayPalHttpClient(environment);
    console.log(`✅ PayPal client initialized in ${mode} mode`);
    return client;
  }

  // Create a PayPal order
  async createOrder(amount, currency = 'USD', description = 'Smart Claims AI - Insurance Claim Analysis') {
    try {
      if (!this.client) {
        throw new Error('PayPal client not initialized');
      }

      const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toFixed(2)
          },
          description: description
        }],
        application_context: {
          brand_name: 'Smart Claims AI',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-cancelled`
        }
      });

      const response = await this.client.execute(request);
      console.log('✅ PayPal order created:', response.result.id);

      return {
        orderId: response.result.id,
        status: response.result.status,
        links: response.result.links
      };
    } catch (error) {
      console.error('❌ PayPal order creation error:', error);
      throw new Error('Failed to create PayPal order');
    }
  }

  // Capture payment after user approves
  async captureOrder(orderId) {
    try {
      if (!this.client) {
        throw new Error('PayPal client not initialized');
      }

      const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});

      const response = await this.client.execute(request);
      console.log('✅ Payment captured:', response.result.id);

      return {
        orderId: response.result.id,
        status: response.result.status,
        payerEmail: response.result.payer?.email_address,
        amount: response.result.purchase_units[0]?.payments?.captures[0]?.amount
      };
    } catch (error) {
      console.error('❌ Payment capture error:', error);
      throw new Error('Failed to capture payment');
    }
  }

  // Get order details
  async getOrderDetails(orderId) {
    try {
      if (!this.client) {
        throw new Error('PayPal client not initialized');
      }

      const request = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
      const response = await this.client.execute(request);

      return response.result;
    } catch (error) {
      console.error('❌ Get order details error:', error);
      throw new Error('Failed to get order details');
    }
  }
}

module.exports = new PayPalService();
