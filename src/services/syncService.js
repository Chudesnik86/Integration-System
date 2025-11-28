const DatabaseService = require('./databaseService');
const CmsService = require('./cmsService');
const ReportService = require('./reportService');
const CSVGenerator = require('../utils/csvGenerator');

/**
 * Сервис синхронизации данных
 */
class SyncService {
    constructor() {
        this.dbService = new DatabaseService();
        this.cmsService = new CmsService();
        this.reportService = new ReportService();
    }

    /**
     * Синхронизация данных из CMS в БД
     * @returns {Promise<Object>} Результат синхронизации
     */
    async syncCmsToDb() {
        console.log('='.repeat(50));
        console.log('Starting CMS to DB synchronization');
        console.log('='.repeat(50));

        try {
            await this.dbService.init();
            const spares = await this.cmsService.getAllSpares();

            if (spares.length === 0) {
                console.log('No spares to sync');
                return { synced: 0, total: 0 };
            }

            for (const spare of spares) {
                await this.dbService.upsertSpare(spare);
            }

            console.log(`Synchronized ${spares.length} spares to DB`);
            console.log('CMS to DB synchronization completed');
            
            return { synced: spares.length, total: spares.length };
        } catch (error) {
            console.error('Error in CMS to DB sync:', error);
            throw error;
        }
    }

    /**
     * Синхронизация данных из БД в Report API
     * @returns {Promise<Object>} Результат синхронизации
     */
    async syncDbToReport() {
        console.log('='.repeat(50));
        console.log('Starting DB to Report API synchronization');
        console.log('='.repeat(50));

        try {
            const spares = await this.dbService.getAllSpares();
            console.log(`Retrieved ${spares.length} spares from DB`);

            if (spares.length === 0) {
                console.log('No spares in DB to sync to Report API');
                return { synced: 0, message: 'Empty database' };
            }

            const csv = CSVGenerator.generateCsv(spares);
            console.log(`Generated CSV with ${spares.length} spares`);

            if (!csv || csv.trim().length === 0) {
                console.log('Generated CSV is empty, skipping upload');
                return { synced: 0, message: 'Empty CSV' };
            }

            const uploadResult = await this.reportService.uploadCsv(csv);
            console.log('DB to Report API synchronization completed');
            
            return { synced: spares.length, result: uploadResult };
        } catch (error) {
            console.error('Error in DB to Report sync:', error);
            throw error;
        }
    }

    /**
     * Полная синхронизация (CMS -> DB -> Report API)
     * @returns {Promise<Object>} Результат полной синхронизации
     */
    async fullSync() {
        console.log('='.repeat(50));
        console.log('Starting full synchronization');
        console.log('='.repeat(50));

        try {
            // Синхронизация CMS -> DB
            const cmsToDbResult = await this.syncCmsToDb();

            // Синхронизация DB -> Report API
            const dbToReportResult = await this.syncDbToReport();

            // Получаем результаты
            let results = null;
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                results = await this.reportService.getResults();
            } catch (error) {
                console.error('Error getting results:', error);
                results = dbToReportResult.result || null;
            }

            return {
                success: true,
                cmsToDb: cmsToDbResult,
                dbToReport: dbToReportResult,
                results: results
            };
        } catch (error) {
            console.error('Error in full sync:', error);
            throw error;
        }
    }

    /**
     * Получение результатов оценки
     * @returns {Promise<Object>} Результаты оценки
     */
    async getResults() {
        try {
            return await this.reportService.getResults();
        } catch (error) {
            console.error('Error getting results:', error);
            throw error;
        }
    }
}

module.exports = SyncService;

