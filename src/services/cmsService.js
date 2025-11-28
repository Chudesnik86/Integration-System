const axios = require('axios');
const config = require('../../config');

/**
 * Сервис для работы с CMS API через n8n
 */
class CmsService {
    constructor() {
        this.n8nBaseUrl = config.N8N_BASE_URL;
        this.n8nApiKey = config.N8N_API_KEY;
        this.n8nWebhookPath = config.N8N_WEBHOOK_PATH;
        this.studentId = config.STUDENT_ID;
        this.apiBaseUrl = config.API_BASE_URL;
    }

    /**
     * Получает все детали через n8n интеграционную платформу
     */
    async getAllSpares() {
        const allSpares = [];
        let page = 0;
        const size = 10;

        console.log('Starting to fetch spares through n8n integration platform...');
        console.log(`n8n Base URL: ${this.n8nBaseUrl}`);
        console.log(`n8n Webhook Path: ${this.n8nWebhookPath}`);
        console.log(`CMS API: ${this.apiBaseUrl}`);

        while (true) {
            try {
                const url = `${this.n8nBaseUrl}${this.n8nWebhookPath}`;
                
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (this.n8nApiKey) {
                    headers['X-N8N-API-KEY'] = this.n8nApiKey;
                }

                const response = await axios.post(url, {
                    studentId: this.studentId,
                    page: page,
                    size: size
                }, {
                    headers: headers,
                    timeout: 30000
                });

                let spares = this.extractSparesFromResponse(response.data);

                if (!spares || spares.length === 0) {
                    if (page === 0) {
                        console.log(`⚠️  WARNING: No spares found at page 0`);
                        console.log(`   This might indicate that:`);
                        console.log(`   1. n8n is not running or not accessible`);
                        console.log(`   2. n8n workflow is not activated`);
                        console.log(`   3. n8n webhook path is incorrect`);
                        console.log(`   4. CMS API is not accessible from n8n`);
                    } else {
                        console.log(`No more spares found at page ${page}`);
                    }
                    break;
                }

                allSpares.push(...spares);
                console.log(`Fetched page ${page}: ${spares.length} spares`);

                if (spares.length < size) {
                    break;
                }

                page++;
            } catch (error) {
                this.handleError(error, page);
                throw error;
            }
        }

        console.log(`Total fetched ${allSpares.length} spares through n8n integration platform`);
        return allSpares;
    }

    /**
     * Извлекает массив запчастей из ответа n8n
     */
    extractSparesFromResponse(data) {
        if (Array.isArray(data)) {
            return data;
        } else if (data && Array.isArray(data.data)) {
            return data.data;
        } else if (data && Array.isArray(data.spares)) {
            return data.spares;
        } else if (data && data.items && Array.isArray(data.items)) {
            return data.items;
        } else if (data && typeof data === 'object') {
            if (data.spareCode || data.spare_code) {
                return [data];
            } else {
                for (const key in data) {
                    if (Array.isArray(data[key])) {
                        return data[key];
                    }
                }
                if (data.spareCode || data.spare_code) {
                    return [data];
                }
            }
        }
        return null;
    }

    /**
     * Обработка ошибок
     */
    handleError(error, page) {
        if (error.response) {
            console.error(`Error fetching page ${page}:`, error.response.status, error.response.statusText);
            console.error('Response data:', error.response.data);
        } else if (error.request) {
            console.error(`Error fetching page ${page}: No response received from n8n`);
            console.error('Request URL:', `${this.n8nBaseUrl}${this.n8nWebhookPath}`);
        } else {
            console.error(`Error fetching page ${page}:`, error.message);
        }
    }
}

module.exports = CmsService;

