const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Create payment order
router.post('/create-order', paymentController.createPayment);

// Capture payment after approval
router.post('/capture-order', paymentController.capturePayment);

// Get order status
router.get('/order/:orderId', paymentController.getOrderStatus);

module.exports = router;