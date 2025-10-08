const paypalService = require('../services/paypalService');

class PaymentController {

  // Create PayPal order
  async createPayment(req, res) {
    try {
      const { amount, claimId, returnToken } = req.body;

      // Validate amount
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment amount'
        });
      }

      console.log(`💳 Creating payment for claim ${claimId}, amount: $${amount}`);

      // Create PayPal order
      const order = await paypalService.createOrder(
        amount,
        'USD',
        `Smart Claims AI - Claim #${claimId || 'New'}`,
        returnToken 
      );

      // Find approval URL
      const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;

      if (!approvalUrl) {
        throw new Error('PayPal approval URL not found');
      }

      res.json({
        success: true,
        orderId: order.orderId,
        approvalUrl: approvalUrl,
        message: 'Payment order created successfully'
      });

    } catch (error) {
      console.error('❌ Create payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment',
        error: error.message
      });
    }
  }

  // Capture payment after user approval
  async capturePayment(req, res) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      console.log(`💰 Capturing payment for order: ${orderId}`);

      // Capture the payment
      const captureResult = await paypalService.captureOrder(orderId);

      // TODO: Save payment to database
      // TODO: Update claim status to "paid"
      // TODO: Trigger AI analysis

      res.json({
        success: true,
        orderId: captureResult.orderId,
        status: captureResult.status,
        amount: captureResult.amount,
        payerEmail: captureResult.payerEmail,
        message: 'Payment captured successfully'
      });

    } catch (error) {
      console.error('❌ Capture payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to capture payment',
        error: error.message
      });
    }
  }

  // Get order status
  async getOrderStatus(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      const orderDetails = await paypalService.getOrderDetails(orderId);

      res.json({
        success: true,
        order: orderDetails
      });

    } catch (error) {
      console.error('❌ Get order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order status',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController();