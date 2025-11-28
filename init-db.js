const { Client } = require('pg');
const config = require('./config/index');

async function initDatabase() {
    // Подключаемся к PostgreSQL без указания базы данных для создания БД
    const adminClient = new Client({
        host: config.DB_HOST,
        port: config.DB_PORT,
        database: 'postgres', // Подключаемся к системной БД
        user: config.DB_USER,
        password: config.DB_PASSWORD
    });

    try {
        console.log('Connecting to PostgreSQL...');
        await adminClient.connect();
        console.log('Connected to PostgreSQL');

        // Проверяем существование базы данных
        const checkDbQuery = `
            SELECT 1 FROM pg_database WHERE datname = $1
        `;
        const dbResult = await adminClient.query(checkDbQuery, [config.DB_NAME]);
        
        if (dbResult.rows.length === 0) {
            // Создаем базу данных
            console.log(`Creating database: ${config.DB_NAME}...`);
            await adminClient.query(`CREATE DATABASE ${config.DB_NAME}`);
            console.log(`Database ${config.DB_NAME} created successfully`);
        } else {
            console.log(`Database ${config.DB_NAME} already exists`);
        }

        await adminClient.end();

        // Теперь подключаемся к созданной базе данных для создания таблиц
        const dbClient = new Client({
            host: config.DB_HOST,
            port: config.DB_PORT,
            database: config.DB_NAME,
            user: config.DB_USER,
            password: config.DB_PASSWORD
        });

        await dbClient.connect();
        console.log(`Connected to database: ${config.DB_NAME}`);

        // Проверяем существование таблицы
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'spares'
            );
        `;
        
        const tableResult = await dbClient.query(checkTableQuery);
        const tableExists = tableResult.rows[0].exists;

        if (!tableExists) {
            // Создаем таблицу
            console.log('Creating table spares...');
            const createTableQuery = `
                CREATE TABLE spares (
                    spare_code VARCHAR(255) PRIMARY KEY,
                    spare_name VARCHAR(500) NOT NULL,
                    spare_description TEXT,
                    spare_type VARCHAR(100),
                    spare_status VARCHAR(100),
                    price TEXT,
                    quantity INTEGER,
                    updated_at TEXT,
                    additional_fields JSONB DEFAULT '{}'::jsonb,
                    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;
            
            await dbClient.query(createTableQuery);
            console.log('Table spares created successfully');
        } else {
            console.log('Table spares already exists');
            // Миграция: добавляем JSON колонку для дополнительных полей, если её нет
            try {
                const checkAdditionalFieldsQuery = `
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'spares' 
                    AND column_name = 'additional_fields';
                `;
                const additionalFieldsResult = await dbClient.query(checkAdditionalFieldsQuery);
                
                if (additionalFieldsResult.rows.length === 0) {
                    console.log('Adding additional_fields JSONB column to spares table...');
                    await dbClient.query(`ALTER TABLE spares ADD COLUMN additional_fields JSONB DEFAULT '{}'::jsonb;`);
                    console.log('Additional_fields column added to spares table');
                }
            } catch (migrationError) {
                console.warn('Migration warning for additional_fields:', migrationError.message);
            }
        }

        // Проверяем и создаем таблицу истории изменений
        const checkHistoryTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'spares_history'
            );
        `;
        
        const historyTableResult = await dbClient.query(checkHistoryTableQuery);
        const historyTableExists = historyTableResult.rows[0].exists;

        if (!historyTableExists) {
            console.log('Creating table spares_history...');
            const createHistoryTableQuery = `
                CREATE TABLE spares_history (
                    id SERIAL PRIMARY KEY,
                    spare_code VARCHAR(255) NOT NULL,
                    spare_name VARCHAR(500),
                    spare_description TEXT,
                    spare_type VARCHAR(100),
                    spare_status VARCHAR(100),
                    price TEXT,
                    quantity INTEGER,
                    updated_at TEXT,
                    additional_fields JSONB DEFAULT '{}'::jsonb,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    change_reason VARCHAR(100) DEFAULT 'sync_from_cms'
                );
            `;
            
            await dbClient.query(createHistoryTableQuery);
            console.log('Table spares_history created successfully');
        } else {
            console.log('Table spares_history already exists');
            // Миграция: добавляем JSON колонку для дополнительных полей в истории, если её нет
            try {
                const checkHistoryAdditionalFieldsQuery = `
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'spares_history' 
                    AND column_name = 'additional_fields';
                `;
                const historyAdditionalFieldsResult = await dbClient.query(checkHistoryAdditionalFieldsQuery);
                
                if (historyAdditionalFieldsResult.rows.length === 0) {
                    console.log('Adding additional_fields JSONB column to spares_history table...');
                    await dbClient.query(`ALTER TABLE spares_history ADD COLUMN additional_fields JSONB DEFAULT '{}'::jsonb;`);
                    console.log('Additional_fields column added to spares_history table');
                }
            } catch (migrationError) {
                console.warn('Migration warning for spares_history additional_fields:', migrationError.message);
            }
        }

        // Создаем индексы для улучшения производительности
        console.log('Creating indexes...');
        try {
            await dbClient.query(`
                CREATE INDEX IF NOT EXISTS idx_spares_type ON spares(spare_type);
            `);
            await dbClient.query(`
                CREATE INDEX IF NOT EXISTS idx_spares_status ON spares(spare_status);
            `);
            await dbClient.query(`
                CREATE INDEX IF NOT EXISTS idx_spares_synced_at ON spares(last_synced_at);
            `);
            
            // Индексы для таблицы истории
            await dbClient.query(`
                CREATE INDEX IF NOT EXISTS idx_spares_history_code ON spares_history(spare_code);
            `);
            await dbClient.query(`
                CREATE INDEX IF NOT EXISTS idx_spares_history_changed_at ON spares_history(changed_at);
            `);
            
            console.log('Indexes created successfully');
        } catch (indexError) {
            console.log('Indexes may already exist, skipping...');
        }

        await dbClient.end();

        console.log('');
        console.log('='.repeat(50));
        console.log('Database initialization completed successfully!');
        console.log('='.repeat(50));
        console.log(`Database: ${config.DB_NAME}`);
        console.log(`Host: ${config.DB_HOST}:${config.DB_PORT}`);
        console.log(`User: ${config.DB_USER}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Запускаем инициализацию
initDatabase();

