const SyncService = require('../services/syncService');

/**
 * Контроллер для синхронизации данных
 */
class SyncController {
    constructor() {
        this.syncService = new SyncService();
    }

    /**
     * Запуск полной синхронизации
     */
    async sync(req, res) {
        try {
            console.log('Starting synchronization from web interface...');
            res.setHeader('Content-Type', 'application/json');

            const result = await this.syncService.fullSync();

            return res.json({
                success: true,
                message: 'Синхронизация успешно завершена',
                ...result
            });
        } catch (error) {
            console.error('Error during synchronization:', error);
            console.error('Error stack:', error.stack);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    error: error.message || 'Unknown error',
                    message: 'Ошибка при синхронизации: ' + (error.message || 'Неизвестная ошибка'),
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        }
    }

    /**
     * Получение результатов оценки
     */
    async getResults(req, res) {
        try {
            const results = await this.syncService.getResults();
            res.json({ success: true, data: results });
        } catch (error) {
            console.error('Error getting results:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new SyncController();

