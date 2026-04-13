const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Login
router.post('/login', authController.login);

// Registrar
router.post('/register', authController.registrar);

// Validar token
router.get('/validar', authMiddleware, authController.validarToken);

module.exports = router;