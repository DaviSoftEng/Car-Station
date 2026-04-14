const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Qualquer usuário autenticado pode ver os dashboards configurados
router.get('/', authMiddleware, dashboardController.listarDashboards);

// Apenas admin pode configurar os links
router.put('/:secao', authMiddleware, adminMiddleware, dashboardController.atualizarDashboard);

module.exports = router;
