const { Pool } = require('pg');
const config = require('../../config');
const SpareDTO = require('../dto/SpareDTO');

/**
 * Сервис для работы с базой данных PostgreSQL
 */
class DatabaseService {
    constructor() {
        this.pool = new Pool({
            host: config.DB_HOST,
            port: config.DB_PORT,
            database: config.DB_NAME,
            user: config.DB_USER,
            password: config.DB_PASSWORD,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });
    }

    /**
     * Инициализация базы данных
     */
    async init() {
        try {
            const client = await this.pool.connect();
            
            await this.createSparesTableIfNotExists(client);
            await this.createHistoryTableIfNotExists(client);
            
            client.release();
            console.log('Database initialized:', config.DB_NAME);
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    /**
     * Создание таблицы spares если не существует
     */
    async createSparesTableIfNotExists(client) {
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'spares'
            );
        `;
        
        const result = await client.query(checkTableQuery);
        const tableExists = result.rows[0].exists;
        
        if (!tableExists) {
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
            
            await client.query(createTableQuery);
            console.log('Table spares created successfully');
        } else {
            await this.migrateSparesTable(client);
        }
    }

    /**
     * Миграция таблицы spares
     */
    async migrateSparesTable(client) {
        // Миграция price на TEXT
        try {
            const checkPriceTypeQuery = `
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'spares' 
                AND column_name = 'price';
            `;
            const priceTypeResult = await client.query(checkPriceTypeQuery);
            
            if (priceTypeResult.rows.length > 0 && 
                priceTypeResult.rows[0].data_type !== 'text' && 
                priceTypeResult.rows[0].data_type !== 'character varying') {
                console.log('Migrating price column from INTEGER to TEXT...');
                await client.query(`ALTER TABLE spares ALTER COLUMN price TYPE TEXT USING price::TEXT;`);
                console.log('Price column migrated to TEXT');
            }
        } catch (migrationError) {
            console.warn('Migration warning:', migrationError.message);
        }

        // Миграция updated_at на TEXT
        try {
            const checkUpdatedAtTypeQuery = `
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'spares' 
                AND column_name = 'updated_at';
            `;
            const updatedAtTypeResult = await client.query(checkUpdatedAtTypeQuery);
            
            if (updatedAtTypeResult.rows.length > 0 && 
                updatedAtTypeResult.rows[0].data_type !== 'text' && 
                updatedAtTypeResult.rows[0].data_type !== 'character varying') {
                console.log('Migrating updated_at column to TEXT...');
                await client.query(`ALTER TABLE spares ALTER COLUMN updated_at TYPE TEXT USING updated_at::TEXT;`);
                console.log('Updated_at column migrated to TEXT');
            }
        } catch (migrationError) {
            console.warn('Migration warning:', migrationError.message);
        }

        // Миграция: добавление additional_fields
        try {
            const checkAdditionalFieldsQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'spares' 
                AND column_name = 'additional_fields';
            `;
            const additionalFieldsResult = await client.query(checkAdditionalFieldsQuery);
            
            if (additionalFieldsResult.rows.length === 0) {
                console.log('Adding additional_fields JSONB column to spares table...');
                await client.query(`ALTER TABLE spares ADD COLUMN additional_fields JSONB DEFAULT '{}'::jsonb;`);
                console.log('Additional_fields column added to spares table');
            }
        } catch (migrationError) {
            console.warn('Migration warning for additional_fields:', migrationError.message);
        }
    }

    /**
     * Создание таблицы истории если не существует
     */
    async createHistoryTableIfNotExists(client) {
        const checkHistoryTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'spares_history'
            );
        `;
        
        const historyResult = await client.query(checkHistoryTableQuery);
        const historyTableExists = historyResult.rows[0].exists;
        
        if (!historyTableExists) {
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
            
            await client.query(createHistoryTableQuery);
            console.log('Table spares_history created successfully');
            
            await client.query(`CREATE INDEX idx_spares_history_code ON spares_history(spare_code);`);
            await client.query(`CREATE INDEX idx_spares_history_changed_at ON spares_history(changed_at);`);
            console.log('Indexes for spares_history created successfully');
        } else {
            // Миграция additional_fields для истории
            try {
                const checkHistoryAdditionalFieldsQuery = `
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'spares_history' 
                    AND column_name = 'additional_fields';
                `;
                const historyAdditionalFieldsResult = await client.query(checkHistoryAdditionalFieldsQuery);
                
                if (historyAdditionalFieldsResult.rows.length === 0) {
                    console.log('Adding additional_fields JSONB column to spares_history table...');
                    await client.query(`ALTER TABLE spares_history ADD COLUMN additional_fields JSONB DEFAULT '{}'::jsonb;`);
                    console.log('Additional_fields column added to spares_history table');
                }
            } catch (migrationError) {
                console.warn('Migration warning for spares_history additional_fields:', migrationError.message);
            }
        }
    }

    /**
     * Добавление или обновление запчасти
     * @param {Object} spareData - Данные запчасти из CMS API
     */
    async upsertSpare(spareData) {
        const client = await this.pool.connect();
        try {
            // Нормализуем данные через DTO
            const spareDTO = SpareDTO.normalizeFromCms(spareData);
            const dbData = spareDTO.toDbFormat();
            
            // Проверяем существующую запись
            const existingResult = await client.query(
                `SELECT spare_code, spare_name, spare_description, spare_type,
                        spare_status, price, quantity, updated_at, additional_fields
                 FROM spares WHERE spare_code = $1`,
                [dbData.spare_code]
            );
            
            // Сохраняем в историю если есть изменения
            if (existingResult.rows.length > 0) {
                await this.saveToHistoryIfChanged(client, existingResult.rows[0], dbData);
            }
            
            // Выполняем upsert
            const query = `
                INSERT INTO spares (
                    spare_code, spare_name, spare_description, spare_type,
                    spare_status, price, quantity, updated_at, additional_fields, last_synced_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                ON CONFLICT (spare_code) DO UPDATE SET
                    spare_name = EXCLUDED.spare_name,
                    spare_description = EXCLUDED.spare_description,
                    spare_type = EXCLUDED.spare_type,
                    spare_status = EXCLUDED.spare_status,
                    price = EXCLUDED.price,
                    quantity = EXCLUDED.quantity,
                    updated_at = EXCLUDED.updated_at,
                    additional_fields = EXCLUDED.additional_fields,
                    last_synced_at = CURRENT_TIMESTAMP
            `;
            
            await client.query(query, [
                dbData.spare_code,
                dbData.spare_name,
                dbData.spare_description,
                dbData.spare_type,
                dbData.spare_status,
                dbData.price,
                dbData.quantity,
                dbData.updated_at,
                dbData.additional_fields
            ]);
        } catch (error) {
            console.error('Error upserting spare:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Сохранение в историю если есть изменения
     */
    async saveToHistoryIfChanged(client, oldSpare, newData) {
        const hasChanges = 
            oldSpare.spare_name !== newData.spare_name ||
            oldSpare.spare_description !== newData.spare_description ||
            oldSpare.spare_type !== newData.spare_type ||
            oldSpare.spare_status !== newData.spare_status ||
            String(oldSpare.price || '') !== String(newData.price || '') ||
            oldSpare.quantity !== (newData.quantity || null) ||
            String(oldSpare.updated_at || '') !== String(newData.updated_at || '') ||
            JSON.stringify(oldSpare.additional_fields || {}) !== newData.additional_fields;
        
        if (hasChanges) {
            const insertHistoryQuery = `
                INSERT INTO spares_history (
                    spare_code, spare_name, spare_description, spare_type,
                    spare_status, price, quantity, updated_at, additional_fields, change_reason
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sync_from_cms')
            `;
            
            const oldAdditionalFields = oldSpare.additional_fields || {};
            const oldAdditionalFieldsJson = typeof oldAdditionalFields === 'string' 
                ? oldAdditionalFields 
                : JSON.stringify(oldAdditionalFields);
            
            await client.query(insertHistoryQuery, [
                oldSpare.spare_code,
                oldSpare.spare_name,
                oldSpare.spare_description,
                oldSpare.spare_type,
                oldSpare.spare_status,
                oldSpare.price,
                oldSpare.quantity,
                oldSpare.updated_at,
                oldAdditionalFieldsJson
            ]);
        }
    }

    /**
     * Получение всех запчастей
     * @returns {Promise<Array>} Массив запчастей
     */
    async getAllSpares() {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT 
                    spare_code, spare_name, spare_description, spare_type,
                    spare_status, price, quantity, updated_at, additional_fields
                FROM spares 
                ORDER BY spare_code
            `;
            
            const result = await client.query(query);
            
            return result.rows.map(row => {
                let additionalFields = null;
                if (row.additional_fields) {
                    if (typeof row.additional_fields === 'string') {
                        try {
                            additionalFields = JSON.parse(row.additional_fields);
                        } catch (e) {
                            additionalFields = row.additional_fields;
                        }
                    } else {
                        additionalFields = row.additional_fields;
                    }
                }
                
                return {
                    spare_code: row.spare_code,
                    spare_name: row.spare_name,
                    spare_description: row.spare_description,
                    spare_type: row.spare_type,
                    spare_status: row.spare_status,
                    price: row.price !== null && row.price !== undefined ? String(row.price) : null,
                    quantity: row.quantity,
                    updated_at: row.updated_at !== null && row.updated_at !== undefined ? String(row.updated_at) : null,
                    additional_fields: additionalFields
                };
            });
        } catch (error) {
            console.error('Error getting spares:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Получение истории изменений для конкретной запчасти
     */
    async getSpareHistory(spareCode, limit = 100) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT 
                    id, spare_code, spare_name, spare_description, spare_type,
                    spare_status, price, quantity, updated_at, additional_fields, changed_at, change_reason
                FROM spares_history
                WHERE spare_code = $1
                ORDER BY changed_at DESC
                LIMIT $2
            `;
            
            const result = await client.query(query, [spareCode, limit]);
            
            return result.rows.map(row => {
                let additionalFields = null;
                if (row.additional_fields) {
                    if (typeof row.additional_fields === 'string') {
                        try {
                            additionalFields = JSON.parse(row.additional_fields);
                        } catch (e) {
                            additionalFields = row.additional_fields;
                        }
                    } else {
                        additionalFields = row.additional_fields;
                    }
                }
                
                return {
                    id: row.id,
                    spare_code: row.spare_code,
                    spare_name: row.spare_name,
                    spare_description: row.spare_description,
                    spare_type: row.spare_type,
                    spare_status: row.spare_status,
                    price: row.price !== null && row.price !== undefined ? String(row.price) : null,
                    quantity: row.quantity,
                    updated_at: row.updated_at !== null && row.updated_at !== undefined ? String(row.updated_at) : null,
                    additional_fields: additionalFields,
                    changed_at: row.changed_at,
                    change_reason: row.change_reason
                };
            });
        } catch (error) {
            console.error('Error getting spare history:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Получение всей истории изменений
     */
    async getAllHistory(limit = 500) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT 
                    id, spare_code, spare_name, spare_description, spare_type,
                    spare_status, price, quantity, updated_at, additional_fields, changed_at, change_reason
                FROM spares_history
                ORDER BY changed_at DESC
                LIMIT $1
            `;
            
            const result = await client.query(query, [limit]);
            
            return result.rows.map(row => {
                let additionalFields = null;
                if (row.additional_fields) {
                    if (typeof row.additional_fields === 'string') {
                        try {
                            additionalFields = JSON.parse(row.additional_fields);
                        } catch (e) {
                            additionalFields = row.additional_fields;
                        }
                    } else {
                        additionalFields = row.additional_fields;
                    }
                }
                
                return {
                    id: row.id,
                    spare_code: row.spare_code,
                    spare_name: row.spare_name,
                    spare_description: row.spare_description,
                    spare_type: row.spare_type,
                    spare_status: row.spare_status,
                    price: row.price !== null && row.price !== undefined ? String(row.price) : null,
                    quantity: row.quantity,
                    updated_at: row.updated_at !== null && row.updated_at !== undefined ? String(row.updated_at) : null,
                    additional_fields: additionalFields,
                    changed_at: row.changed_at,
                    change_reason: row.change_reason
                };
            });
        } catch (error) {
            console.error('Error getting all history:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Анализ дополнительных полей
     */
    async analyzeAdditionalFields(limit = 1000) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT additional_fields
                FROM spares
                WHERE additional_fields IS NOT NULL 
                  AND additional_fields != '{}'::jsonb
                LIMIT $1
            `;
            
            const result = await client.query(query, [limit]);
            
            const fieldStats = {};
            let totalRecords = 0;
            
            for (const row of result.rows) {
                if (row.additional_fields) {
                    totalRecords++;
                    const fields = typeof row.additional_fields === 'string' 
                        ? JSON.parse(row.additional_fields) 
                        : row.additional_fields;
                    
                    for (const [key, value] of Object.entries(fields)) {
                        if (!fieldStats[key]) {
                            fieldStats[key] = {
                                count: 0,
                                types: new Set(),
                                sampleValues: []
                            };
                        }
                        
                        fieldStats[key].count++;
                        fieldStats[key].types.add(typeof value);
                        
                        if (fieldStats[key].sampleValues.length < 3) {
                            fieldStats[key].sampleValues.push(value);
                        }
                    }
                }
            }
            
            const stats = {};
            for (const [key, data] of Object.entries(fieldStats)) {
                stats[key] = {
                    count: data.count,
                    frequency: ((data.count / totalRecords) * 100).toFixed(2) + '%',
                    types: Array.from(data.types),
                    sampleValues: data.sampleValues
                };
            }
            
            return {
                totalRecordsAnalyzed: totalRecords,
                fieldsFound: Object.keys(stats).length,
                fields: stats
            };
        } catch (error) {
            console.error('Error analyzing additional fields:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Закрытие соединения с БД
     */
    async close() {
        try {
            await this.pool.end();
            console.log('Database connection pool closed');
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
}

module.exports = DatabaseService;

