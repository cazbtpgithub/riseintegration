const jwt = require('jsonwebtoken');

// Configure JWT Authentication for incoming API requests
const jwtAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Bearer token is required to access this API.' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
        req.user = decoded; // Attach user info to request
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token.' });
    }
};

module.exports = {
    jwtAuthMiddleware
};
