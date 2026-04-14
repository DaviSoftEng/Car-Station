const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ==================== LISTAR USUÁRIOS ====================
router.get('/', authMiddleware, userController.listarUsuarios);

// ==================== CRIAR USUÁRIO (APENAS ADMIN) ====================
router.post('/', authMiddleware, adminMiddleware, userController.criarUsuario);

// ==================== EDITAR USUÁRIO (APENAS ADMIN) ====================
router.put('/:id', authMiddleware, adminMiddleware, userController.editarUsuario);

// ==================== DELETAR USUÁRIO (APENAS ADMIN) ====================
router.delete('/:id', authMiddleware, adminMiddleware, userController.deletarUsuario);

module.exports = router;