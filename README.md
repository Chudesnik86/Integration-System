# Интеграционная система

Система синхронизации данных между CMS API и Report API с использованием **n8n** как интеграционной платформы и PostgreSQL для хранения исторических данных.

## Описание

Интеграционное приложение для синхронизации данных о запчастях между следующими системами:

- **CMS API** - исходный сервер с данными о запчастях
- **n8n** - интеграционная платформа (посредник между CMS API и приложением)
- **PostgreSQL** - база данных для хранения исторических данных
- **Report API** - сервер отчетности, принимающий CSV файлы

## Архитектура проекта

```
src/
├── controllers/      # Контроллеры (обработка HTTP запросов)
├── services/         # Сервисы (бизнес-логика)
├── models/           # Модели данных
├── dto/              # Data Transfer Objects
├── routes/           # Маршруты Express
├── middleware/       # Middleware для Express
├── utils/            # Утилиты
└── validators/       # Валидаторы (для будущего расширения)

config/               # Конфигурация приложения
views/                # Шаблоны EJS
public/               # Статические файлы
```

### Основные компоненты:

- **Controllers** - обрабатывают HTTP запросы и ответы
- **Services** - содержат бизнес-логику приложения
- **Models** - определяют структуру данных
- **DTO** - объекты для передачи данных между слоями
- **Routes** - определяют маршруты API

## Архитектура системы

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│   CMS API   │ ──────> │     n8n      │ ──────> │  Приложение  │ ──────> │ PostgreSQL │
│ (212.237.   │         │ (Integration │         │   (Node.js)  │         │    (БД)    │
│  219.35:    │         │  Platform)   │         │              │         │            │
│   8080)     │         │              │         │              │         │            │
└─────────────┘         └──────────────┘         └──────────────┘         └─────────────┘
                                                                                    │
                                                                                    ▼
                                                                          ┌─────────────┐
                                                                          │ Report API  │
                                                                          │   (CSV)     │
                                                                          └─────────────┘
```

### Поток данных

1. **CMS → n8n → БД**: Приложение получает данные из CMS API через n8n и сохраняет в PostgreSQL
2. **БД → CSV → Report API**: Приложение генерирует CSV из всех данных БД и отправляет в Report API

## Требования

- Node.js 14 или выше
- npm
- PostgreSQL 12 или выше
- n8n (интеграционная платформа)

## Установка

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/YOUR_USERNAME/integration-system.git
cd integration-system
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Создайте файл `.env` на основе `env.example`:**
```bash
# Windows
copy env.example .env

# Linux/Mac
cp env.example .env
```

4. **Настройте переменные окружения в `.env`:**
   - Укажите параметры подключения к PostgreSQL
   - Настройте URL n8n и webhook путь
   - Укажите ваш STUDENT_ID

5. **Инициализируйте базу данных:**
```bash
npm run init-db
```

6. **Настройте n8n workflow:**
   - Импортируйте `n8n-workflow-cms-api.json` в n8n
   - Активируйте workflow
   - См. подробности в документации

## Использование

### Запуск синхронизации (CLI)
```bash
npm start
```
или
```bash
npm run sync
```

### Запуск веб-сервера
```bash
npm run server
```
Откройте браузер: http://localhost:3000

Веб-интерфейс предоставляет:
- Просмотр статистики
- Список всех запчастей с пагинацией
- Кнопку для запуска синхронизации
- Просмотр результатов оценки

## Структура проекта

```
.
├── src/
│   ├── controllers/          # Контроллеры
│   │   ├── sparesController.js
│   │   ├── syncController.js
│   │   └── viewsController.js
│   ├── services/             # Сервисы (бизнес-логика)
│   │   ├── cmsService.js
│   │   ├── reportService.js
│   │   ├── databaseService.js
│   │   └── syncService.js
│   ├── models/               # Модели данных
│   │   └── Spare.js
│   ├── dto/                  # Data Transfer Objects
│   │   └── SpareDTO.js
│   ├── routes/               # Маршруты
│   │   ├── index.js
│   │   ├── sparesRoutes.js
│   │   └── syncRoutes.js
│   ├── middleware/           # Middleware
│   │   ├── errorHandler.js
│   │   └── notFoundHandler.js
│   └── utils/                # Утилиты
│       └── csvGenerator.js
├── config/                   # Конфигурация
│   └── index.js
├── views/                    # Шаблоны EJS
│   ├── index.ejs
│   └── spares.ejs
├── public/                   # Статические файлы
│   └── style.css
├── app.js                    # CLI приложение
├── server.js                 # Веб-сервер
├── init-db.js                # Инициализация БД
└── package.json
```

## Основные команды

| Команда | Описание |
|---------|----------|
| `npm start` | Запуск синхронизации данных (CLI) |
| `npm run server` | Запуск веб-сервера |
| `npm run init-db` | Инициализация базы данных |

## API Endpoints

### Веб-страницы
- `GET /` - Главная страница со статистикой
- `GET /spares` - Страница со всеми запчастями

### API
- `GET /api/stats` - Получение статистики
- `GET /api/spares` - Получение всех запчастей (с пагинацией)
- `GET /api/spares/:spareCode/history` - История изменений запчасти
- `POST /api/sync` - Запуск синхронизации
- `GET /api/sync/results` - Получение результатов оценки

## Формат CSV

Согласно спецификации Report API:

- **Разделитель**: `;` (точка с запятой)
- **Кодировка**: UTF-8
- **Заголовок**: отсутствует
- **Порядок полей**: `spareCode;spareName;spareDescription;spareType;spareStatus;price;quantity;updatedAt`

Пример:
```
SPARE-1;Spare Part 1;Description;BRAKE;RESERVED;22;29;2025-09-09T14:53:45.751668
SPARE-2;Spare Part 2;Description;RADIATOR;AVAILABLE;15;100;2025-09-09T14:53:45.751668
```

## Структура базы данных

### Таблица `spares`

| Поле | Тип | Описание |
|------|-----|----------|
| `spare_code` | VARCHAR(255) | PRIMARY KEY, код детали |
| `spare_name` | VARCHAR(500) | Название детали |
| `spare_description` | TEXT | Описание детали |
| `spare_type` | VARCHAR(100) | Тип детали |
| `spare_status` | VARCHAR(100) | Статус детали |
| `price` | TEXT | Цена (строка) |
| `quantity` | INTEGER | Количество |
| `updated_at` | TEXT | Время обновления в CMS |
| `additional_fields` | JSONB | Дополнительные поля (для гибкости структуры) |
| `last_synced_at` | TIMESTAMP | Время последней синхронизации |

### Таблица `spares_history`

Таблица для хранения истории изменений с полями + `id`, `changed_at`, `change_reason`.