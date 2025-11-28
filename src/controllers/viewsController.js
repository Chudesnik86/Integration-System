const DatabaseService = require('../services/databaseService');
const ReportService = require('../services/reportService');
const config = require('../../config');

/**
 * Контроллер для веб-страниц (views)
 */
class ViewsController {
    constructor() {
        this.dbService = new DatabaseService();
        this.reportService = new ReportService();
    }

    /**
     * Главная страница
     */
    async index(req, res) {
        try {
            await this.dbService.init();
            const spares = await this.dbService.getAllSpares();
            
            // Статистика
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
            
            // Получаем результаты оценки
            let results = null;
            try {
                results = await this.reportService.getResults();
            } catch (error) {
                console.error('Error getting results:', error);
            }
            
            res.render('index', {
                studentId: config.STUDENT_ID,
                stats: stats,
                spares: spares.slice(0, 10), // Первые 10 для предпросмотра
                results: results
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Error loading data: ' + error.message);
        } finally {
            await this.dbService.close();
        }
    }

    /**
     * Страница со всеми деталями
     */
    async spares(req, res) {
        try {
            await this.dbService.init();
            const spares = await this.dbService.getAllSpares();
            
            const page = parseInt(req.query.page) || 1;
            const perPage = 50;
            const total = spares.length;
            const totalPages = Math.ceil(total / perPage);
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const paginatedSpares = spares.slice(start, end);
            
            res.render('spares', {
                studentId: config.STUDENT_ID,
                spares: paginatedSpares,
                page: page,
                totalPages: totalPages,
                total: total
            });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Error loading data: ' + error.message);
        } finally {
            await this.dbService.close();
        }
    }
}

module.exports = new ViewsController();

