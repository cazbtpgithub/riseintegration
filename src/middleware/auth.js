const basicAuth = require('express-basic-auth');

// Configure Basic Authentication for incoming API requests
const basicAuthMiddleware = basicAuth({
    users: { [process.env.API_USER]: process.env.API_PASSWORD },
    unauthorizedResponse: (req) => {
        return { error: 'Unauthorized', message: 'Valid credentials are required to access this API.' };
    }
});

module.exports = {
    basicAuthMiddleware
};
