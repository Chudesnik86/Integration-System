// Загружаем переменные окружения из .env файла
require('dotenv').config();

module.exports = {
    // n8n Integration Platform Configuration
    N8N_BASE_URL: process.env.N8N_BASE_URL || "http://localhost:5678",
    N8N_API_KEY: process.env.N8N_API_KEY || "",
    N8N_WEBHOOK_PATH: process.env.N8N_WEBHOOK_PATH || "/webhook/spares",
    
    // CMS API Configuration (используется n8n для получения данных)
    API_BASE_URL: process.env.API_BASE_URL || "http://212.237.219.35:8080",
    STUDENT_ID: parseInt(process.env.STUDENT_ID) || 9,
    
    // PostgreSQL Configuration
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: parseInt(process.env.DB_PORT) || 5432,
    DB_NAME: process.env.DB_NAME || "integration_system",
    DB_USER: process.env.DB_USER || "postgres",
    DB_PASSWORD: process.env.DB_PASSWORD || "00000",

    // Server Configuration
    PORT: parseInt(process.env.PORT) || 3000
};

