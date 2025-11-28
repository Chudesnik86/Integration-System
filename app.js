const SyncService = require('./src/services/syncService');
const config = require('./config');

/**
 * CLI приложение для синхронизации данных
 */
async function main() {
    console.log(`Starting Integration System for Student ID: ${config.STUDENT_ID}`);
    console.log('');

    const syncService = new SyncService();

    try {
        // Полная синхронизация
        const result = await syncService.fullSync();

        console.log('');
        console.log('='.repeat(50));
        console.log('Full synchronization completed successfully');
        console.log('='.repeat(50));
        console.log('CMS to DB:', result.cmsToDb);
        console.log('DB to Report:', result.dbToReport);
        if (result.results) {
            console.log('\n=== RESULTS ===');
            console.log(JSON.stringify(result.results, null, 2));
        }
        console.log('='.repeat(50));
    } catch (error) {
        console.error('Critical error:', error);
        process.exit(1);
    } finally {
        // Закрываем соединение с БД
        try {
            await syncService.dbService.close();
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
}

// Запуск приложения
if (require.main === module) {
    main();
}

module.exports = { main };
