const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

/**
 * Роуты для синхронизации данных
 */

// POST /api/sync - Запуск полной синхронизации
router.post('/', syncController.sync.bind(syncController));

// GET /api/sync/results - Получение результатов оценки
router.get('/results', syncController.getResults.bind(syncController));

module.exports = router;

