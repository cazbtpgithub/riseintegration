require('dotenv').config();
const express = require('express');
const { jwtAuthMiddleware } = require('./middleware/auth');
const sapRoutes = require('./routes/sapRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Open route for authentication
app.use('/api/auth', authRoutes);

// Protect the API with JWT Auth
app.use('/api/sap/dev', jwtAuthMiddleware, sapRoutes);

// Direct route for production-order-create-release
const sapController = require('./controllers/sapController');
app.post('/production-order-create-release', sapController.productionOrderCreateRelease);
app.get('/production-order-create-release', sapController.productionOrderCreateRelease);

// Direct routes for production-order-qty-change
app.patch('/production-order-qty-change', sapController.productionOrderQtyChange);
app.post('/production-order-qty-change', sapController.productionOrderQtyChange);
app.patch('/production-order-qty-change/:orderNumber', sapController.productionOrderQtyChange);
app.post('/production-order-qty-change/:orderNumber', sapController.productionOrderQtyChange);

// Direct routes for production-order-teco
app.post('/production-order-teco', sapController.productionOrderTeco);
app.get('/production-order-teco', sapController.productionOrderTeco);
app.post('/production-order-teco/:orderNumber', sapController.productionOrderTeco);
app.get('/production-order-teco/:orderNumber', sapController.productionOrderTeco);

// Direct routes for ud-reversal
app.get('/ud-reversal', sapController.getUdReversal);
app.get('/ud-reversal/:lotNumber', sapController.getUdReversal);
app.post('/ud-reversal', sapController.postUdReversal);
app.post('/ud-reversal/:lotNumber', sapController.postUdReversal);

// Direct routes for check-posting-period
app.get('/check-posting-period', sapController.getPostingPeriodCheck);
app.get('/check-posting-period/:budat', sapController.getPostingPeriodCheck);
app.post('/check-posting-period', sapController.checkPostingPeriod);
app.post('/check-posting-period/:budat', sapController.checkPostingPeriod);





// Basic health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'RISEIntegration API is running.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
