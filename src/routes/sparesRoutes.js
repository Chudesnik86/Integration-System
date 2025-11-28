const express = require('express');
const router = express.Router();
const sparesController = require('../controllers/sparesController');

/**
 * Роуты для работы с запчастями
 */

// GET /api/spares - Получение всех запчастей с пагинацией
router.get('/', sparesController.getAllSpares.bind(sparesController));

// GET /api/spares/:spareCode/history - Получение истории изменений
router.get('/:spareCode/history', sparesController.getSpareHistory.bind(sparesController));

module.exports = router;

