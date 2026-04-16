const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, dashboardController.listarDashboards);
router.post('/:secao', authMiddleware, adminMiddleware, dashboardController.criarDashboard);
router.put('/:id', authMiddleware, adminMiddleware, dashboardController.atualizarDashboard);
router.delete('/:id', authMiddleware, adminMiddleware, dashboardController.deletarDashboard);

module.exports = router;
