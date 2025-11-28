const DatabaseService = require('../services/databaseService');

/**
 * Контроллер для работы с запчастями
 */
class SparesController {
    constructor() {
        this.dbService = new DatabaseService();
    }

    /**
     * Получение статистики по запчастям
     */
    async getStats(req, res) {
        try {
            await this.dbService.init();
            const spares = await this.dbService.getAllSpares();

            const stats = {
                total: spares.length,
                byStatus: {},
                byType: {}
            };

            spares.forEach(spare => {
                const status = spare.spare_status || 'UNKNOWN';
                const type = spare.spare_type || 'UNKNOWN';
                stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
                stats.byType[type] = (stats.byType[type] || 0) + 1;
            });

            res.json(stats);
        } catch (error) {
            console.error('Error getting stats:', error);
            res.status(500).json({ error: error.message });
        } finally {
            await this.dbService.close();
        }
    }

    /**
     * Получение всех запчастей с пагинацией
     */
    async getAllSpares(req, res) {
        try {
            await this.dbService.init();
            const spares = await this.dbService.getAllSpares();

            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 50;
            const total = spares.length;
            const totalPages = Math.ceil(total / perPage);
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const paginatedSpares = spares.slice(start, end);

            res.json({
                data: paginatedSpares,
                pagination: {
                    page,
                    perPage,
                    total,
                    totalPages
                }
            });
        } catch (error) {
            console.error('Error getting spares:', error);
            res.status(500).json({ error: error.message });
        } finally {
            await this.dbService.close();
        }
    }

    /**
     * Получение истории изменений для конкретной запчасти
     */
    async getSpareHistory(req, res) {
        try {
            const { spareCode } = req.params;
            const limit = parseInt(req.query.limit) || 100;

            await this.dbService.init();
            const history = await this.dbService.getSpareHistory(spareCode, limit);

            res.json({ data: history });
        } catch (error) {
            console.error('Error getting spare history:', error);
            res.status(500).json({ error: error.message });
        } finally {
            await this.dbService.close();
        }
    }
}

module.exports = new SparesController();

