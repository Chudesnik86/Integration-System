const axios = require('axios');
const config = require('../../config');

/**
 * Сервис для работы с Report API
 */
class ReportService {
    constructor() {
        this.baseUrl = config.API_BASE_URL;
        this.studentId = config.STUDENT_ID;
    }

    /**
     * Загружает CSV файл в Report API
     * @param {string} csvContent - Содержимое CSV файла
     * @returns {Promise<Object>} Результат загрузки
     */
    async uploadCsv(csvContent) {
        try {
            const url = `${this.baseUrl}/students/${this.studentId}/report/csv`;
            const response = await axios.post(url, csvContent, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8'
                },
                timeout: 60000
            });
            console.log('CSV uploaded successfully:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error uploading CSV:', error.message);
            throw error;
        }
    }

    /**
     * Получает результаты оценки из Report API
     * @returns {Promise<Object>} Результаты оценки
     */
    async getResults() {
        try {
            const url = `${this.baseUrl}/students/${this.studentId}/results`;
            const response = await axios.get(url, { timeout: 30000 });
            console.log('Results:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error getting results:', error.message);
            throw error;
        }
    }
}

module.exports = ReportService;

