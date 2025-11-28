const express = require('express');
const router = express.Router();
const sparesRoutes = require('./sparesRoutes');
const syncRoutes = require('./syncRoutes');
const sparesController = require('../controllers/sparesController');

/**
 * Главный файл роутов
 */

// API роуты для запчастей
router.use('/spares', sparesRoutes);

// API роуты для синхронизации
router.use('/sync', syncRoutes);

// GET /api/stats - Статистика по запчастям (для обратной совместимости)
router.get('/stats', sparesController.getStats.bind(sparesController));

module.exports = router;

