const express = require('express');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./src/routes');
const viewsController = require('./src/controllers/viewsController');
const errorHandler = require('./src/middleware/errorHandler');
const notFoundHandler = require('./src/middleware/notFoundHandler');

const app = express();
const PORT = config.PORT || 3000;

// Настройка Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json()); // Для парсинга JSON в запросах

// Веб-страницы
app.get('/', viewsController.index.bind(viewsController));
app.get('/spares', viewsController.spares.bind(viewsController));

// API роуты
app.use('/api', apiRoutes);

// Обработчик 404
app.use(notFoundHandler);

// Обработчик ошибок (должен быть последним)
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Student ID: ${config.STUDENT_ID}`);
});

module.exports = app;
