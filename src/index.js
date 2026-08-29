require('dotenv').config();
const express = require('express');
const { basicAuthMiddleware } = require('./middleware/auth');
const sapRoutes = require('./routes/sapRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Protect the entire API with Basic Auth (optional, can be moved to specific routes if needed)
app.use(basicAuthMiddleware);

// Routes
app.use('/api/sap/dev', sapRoutes);

// Basic health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'RISEIntegration API is running.' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
