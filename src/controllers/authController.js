const jwt = require('jsonwebtoken');

/**
 * Controller to handle API authentication login.
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Use environment variables or fallback values
        const validUsername = process.env.API_USER || 'admin';
        const validPassword = process.env.API_PASSWORD || 'secret123';

        // Check if provided credentials match
        if (username === validUsername && password === validPassword) {
            // Generate a JWT token valid for 1 hour
            const token = jwt.sign(
                { username: validUsername },
                process.env.JWT_SECRET || 'default_secret_key',
                { expiresIn: '1h' }
            );

            return res.status(200).json({
                success: true,
                message: 'Authentication successful',
                token: token
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid credentials'
        });
    } catch (error) {
        console.error('Error in login controller:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error during authentication'
        });
    }
};

module.exports = {
    login
};
