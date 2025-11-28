/**
 * Middleware для обработки 404 ошибок
 */
function notFoundHandler(req, res) {
    // Если это API запрос, возвращаем JSON
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            message: `Маршрут ${req.method} ${req.path} не найден`
        });
    }
    
    // Для обычных запросов возвращаем HTML страницу ошибки
    res.status(404).send('Page not found');
}

module.exports = notFoundHandler;

