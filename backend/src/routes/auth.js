const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/definir-senha', authMiddleware, authController.definirSenha);
router.get('/validar', authMiddleware, authController.validarToken);

module.exports = router;
