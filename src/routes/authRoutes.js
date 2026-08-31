const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST route to login and get JWT token
router.post('/login', authController.login);

module.exports = router;
