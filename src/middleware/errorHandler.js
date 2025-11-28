/**
 * Middleware для обработки ошибок
 */
function errorHandler(err, req, res, next) {
    console.error('Unhandled error:', err);
    
    // Если это API запрос, возвращаем JSON
    if (req.path.startsWith('/api/')) {
        return res.status(err.status || 500).json({
            success: false,
            error: err.message || 'Internal server error',
            message: 'Внутренняя ошибка сервера: ' + (err.message || 'Неизвестная ошибка'),
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
    
    // Для обычных запросов возвращаем HTML страницу ошибки
    res.status(err.status || 500).send('Error: ' + (err.message || 'Internal server error'));
}

module.exports = errorHandler;

