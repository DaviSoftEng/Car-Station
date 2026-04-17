const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Login
router.post('/login', authController.login);

// Registrar (apenas admin)
router.post('/register', authMiddleware, adminMiddleware, authController.registrar);

// Validar token
router.get('/validar', authMiddleware, authController.validarToken);

module.exports = router;