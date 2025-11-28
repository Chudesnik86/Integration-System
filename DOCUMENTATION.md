# Документация по приложению

## Оглавление

1. [Общее описание](#общее-описание)
2. [Архитектура системы](#архитектура-системы)
3. [Последовательность работы](#последовательность-работы)
4. [Компоненты системы](#компоненты-системы)
5. [Конфигурация](#конфигурация)
6. [API и интеграции](#api-и-интеграции)
7. [База данных](#база-данных)
8. [Формат данных](#формат-данных)
9. [Веб-интерфейс](#веб-интерфейс)
10. [Устранение неполадок](#устранение-неполадок)

---

## Общее описание

Интеграционная система предназначена для синхронизации данных о запчастях между несколькими системами:

- **CMS API** - исходный сервер с актуальными данными о запчастях
- **n8n** - интеграционная платформа, выступающая посредником
- **PostgreSQL** - база данных для хранения исторических данных
- **Report API** - сервер отчетности, принимающий CSV файлы для оценки

Система обеспечивает:
- Получение данных из CMS API через n8n с поддержкой пагинации
- Сохранение всех данных в PostgreSQL (включая удаленные из CMS)
- Генерацию CSV файлов согласно спецификации Report API
- Отправку данных в Report API и получение результатов оценки
- Веб-интерфейс для мониторинга и управления

---

## Архитектура системы

### Компоненты

```
┌─────────────────────────────────────────────────────────────┐
│                      CMS API Server                          │
│              http://212.237.219.35:8080                      │
│                                                               │
│  GET /students/{studentId}/cms/spares?page=0&size=10         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP GET (через n8n)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    n8n Integration Platform                  │
│                    http://localhost:5678                     │
│                                                               │
│  Webhook: /webhook/spares                                    │
│  Workflow: Получение данных из CMS API                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ POST /webhook/spares
                        │ { studentId, page, size }
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js Application                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Структура приложения                    │   │
│  │  src/                                                │   │
│  │  ├── controllers/ (обработка HTTP запросов)         │   │
│  │  ├── services/ (бизнес-логика)                      │   │
│  │  ├── models/ (модели данных)                        │   │
│  │  ├── dto/ (объекты передачи данных)                 │   │
│  │  ├── routes/ (маршруты)                             │   │
│  │  └── utils/ (утилиты)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  server.js   │  │   app.js     │  │  init-db.js  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│  PostgreSQL   │              │  Report API   │
│   Database    │              │   (CSV)       │
└───────────────┘              └───────────────┘
```

### Потоки данных

#### Поток 1: CMS → n8n → Приложение → PostgreSQL

1. Приложение отправляет POST запрос в n8n webhook с параметрами:
   ```json
   {
     "studentId": 9,
     "page": 0,
     "size": 10
   }
   ```

2. n8n получает запрос, извлекает параметры и делает GET запрос в CMS API:
   ```
   GET http://212.237.219.35:8080/students/9/cms/spares?page=0&size=10
   ```

3. n8n возвращает данные приложению в формате JSON

4. Приложение обрабатывает данные и сохраняет в PostgreSQL через `src/services/databaseService.js`

5. Процесс повторяется для всех страниц (page=0,1,2...) до получения пустого результата

#### Поток 2: PostgreSQL → CSV Generator → Report API

1. Приложение получает все данные из PostgreSQL через `database.js`

2. `csvGenerator.js` форматирует данные в CSV согласно спецификации:
   - Разделитель: `;`
   - Кодировка: UTF-8
   - Без заголовка

3. `reportClient.js` отправляет CSV в Report API:
   ```
   POST /students/{studentId}/report/csv
   Content-Type: text/csv; charset=utf-8
   ```

4. После загрузки можно получить результаты оценки:
   ```
   GET /students/{studentId}/results
   ```

---

## Последовательность работы

### Инициализация

1. **Запуск PostgreSQL** - база данных должна быть доступна
2. **Запуск n8n** - интеграционная платформа должна быть активна
3. **Настройка workflow** - импорт и активация workflow в n8n
4. **Инициализация БД** - выполнение `npm run init-db`

### Синхронизация данных

#### CLI режим (`npm start`)

1. Подключение к PostgreSQL
2. Получение данных из CMS API через n8n (с пагинацией)
3. Сохранение/обновление данных в PostgreSQL
4. Генерация CSV из всех данных БД
5. Отправка CSV в Report API
6. Получение и вывод результатов оценки

#### Веб-интерфейс (`npm run server`)

1. Запуск Express сервера на порту 3000
2. Отображение главной страницы с:
   - Статистикой по деталям
   - Предпросмотром данных
   - Кнопкой синхронизации
   - Результатами оценки (если доступны)
3. При нажатии "Синхронизировать":
   - Выполняется полная синхронизация
   - Обновляется статистика
   - Отображаются результаты

---

## Компоненты системы

### app.js

Основной скрипт для CLI режима. Выполняет полную синхронизацию данных.

**Функции:**
- `syncCmsToDb()` - синхронизация CMS → БД
- `syncDbToReport(db)` - синхронизация БД → Report API
- `checkResults()` - получение результатов оценки

**Использование:**
```bash
npm start
# или
node app.js
```

### server.js

Express веб-сервер с интерфейсом для мониторинга и управления.

**Маршруты:**
- `GET /` - главная страница со статистикой
- `GET /spares` - страница со всеми деталями (с пагинацией)
- `GET /api/stats` - API для получения статистики
- `POST /api/sync` - API для запуска синхронизации

**Использование:**
```bash
npm run server
# или
node server.js
```

## Архитектура приложения

Проект следует принципам **чистой архитектуры** с разделением на слои:

```
src/
├── controllers/      # Контроллеры - обработка HTTP запросов
│   ├── sparesController.js
│   ├── syncController.js
│   └── viewsController.js
├── services/         # Сервисы - бизнес-логика
│   ├── cmsService.js
│   ├── reportService.js
│   ├── databaseService.js
│   └── syncService.js
├── models/           # Модели данных
│   └── Spare.js
├── dto/              # Data Transfer Objects
│   └── SpareDTO.js
├── routes/           # Маршруты Express
│   ├── index.js
│   ├── sparesRoutes.js
│   └── syncRoutes.js
├── middleware/       # Middleware для Express
│   ├── errorHandler.js
│   └── notFoundHandler.js
└── utils/            # Утилиты
    └── csvGenerator.js
```

### Сервисы (src/services/)

#### cmsService.js

Сервис для работы с CMS API через n8n.

**Класс:** `CmsService`

**Методы:**
- `getAllSpares()` - получение всех деталей с пагинацией

**Особенности:**
- Автоматическая пагинация (page=0,1,2...)
- Обработка различных форматов ответа от n8n
- Логирование процесса получения данных

#### databaseService.js

Сервис для работы с PostgreSQL базой данных.

**Класс:** `DatabaseService`

**Методы:**
- `init()` - инициализация БД (создание таблиц при необходимости, включая таблицу истории)
- `upsertSpare(spare)` - добавление или обновление записи с автоматическим сохранением истории
- `getAllSpares()` - получение всех записей (включая `additional_fields`)
- `getSpareHistory(spareCode, limit)` - получение истории изменений конкретной запчасти
- `getAllHistory(limit)` - получение всей истории изменений всех запчастей
- `analyzeAdditionalFields(limit)` - анализ и статистика по дополнительным полям
- `close()` - закрытие соединения

**Особенности:**
- Использование connection pool
- Автоматические миграции (изменение типов колонок, добавление JSONB колонки)
- Сохранение данных как строк (для price и updated_at)
- **Автоматическое сохранение истории**: При обновлении записи старые данные автоматически сохраняются в таблицу `spares_history` перед обновлением
- История сохраняется только при наличии реальных изменений в данных
- **Автоматическое сохранение новых полей**: Неизвестные поля автоматически сохраняются в JSONB колонку `additional_fields`

#### reportService.js

Сервис для работы с Report API.

**Класс:** `ReportService`

**Методы:**
- `uploadCsv(csvContent)` - загрузка CSV файла
- `getResults()` - получение результатов оценки

**Особенности:**
- Таймауты для запросов
- Обработка ошибок с логированием

#### syncService.js

Сервис для синхронизации данных.

**Класс:** `SyncService`

**Методы:**
- `syncCmsToDb()` - синхронизация CMS → БД
- `syncDbToReport()` - синхронизация БД → Report API
- `fullSync()` - полная синхронизация (CMS → БД → Report API)
- `getResults()` - получение результатов оценки

**Особенности:**
- Оркестрация процесса синхронизации
- Обработка ошибок на каждом этапе

### Контроллеры (src/controllers/)

#### sparesController.js

Контроллер для работы с запчастями.

**Методы:**
- `getStats(req, res)` - получение статистики
- `getAllSpares(req, res)` - получение всех запчастей с пагинацией
- `getSpareHistory(req, res)` - получение истории изменений

#### syncController.js

Контроллер для синхронизации данных.

**Методы:**
- `sync(req, res)` - запуск полной синхронизации
- `getResults(req, res)` - получение результатов оценки

#### viewsController.js

Контроллер для веб-страниц.

**Методы:**
- `index(req, res)` - главная страница
- `spares(req, res)` - страница со всеми запчастями

### Утилиты (src/utils/)

#### csvGenerator.js

Генератор CSV файлов согласно спецификации Report API.

**Класс:** `CSVGenerator`

**Методы:**
- `generateCsv(spares, options)` - генерация CSV из массива данных с настраиваемыми опциями
- `generateCsvWithAllFields(spares, options)` - генерация CSV со всеми полями, включая дополнительные
- `detectFieldsConfig(spares)` - автоматическое определение конфигурации полей
- `formatValue(value)` - форматирование значений
- `formatPrice(value)` - форматирование цены
- `formatUpdatedAt(value)` - форматирование даты

**Особенности:**
- Разделитель: `;` (настраиваемый)
- Кодировка: UTF-8
- Без заголовка
- Специальная обработка дат и цен
- **Конфигурируемость**: Можно настраивать набор полей для включения в CSV
- **Динамические поля**: Автоматическое включение полей из `additional_fields`
- **Обратная совместимость**: По умолчанию используется стандартный набор полей для совместимости с Report API

**Пример использования:**
```javascript
const CSVGenerator = require('./src/utils/csvGenerator');

// Стандартный CSV (совместимость с Report API)
const csv1 = CSVGenerator.generateCsv(spares);

// CSV со всеми полями, включая дополнительные
const csv2 = CSVGenerator.generateCsvWithAllFields(spares);
```

### Конфигурация (config/)

#### index.js

Конфигурация приложения из переменных окружения.

**Параметры:**
- `N8N_BASE_URL` - URL n8n сервера
- `N8N_API_KEY` - API ключ для n8n (опционально)
- `N8N_WEBHOOK_PATH` - путь к webhook
- `API_BASE_URL` - URL CMS API
- `STUDENT_ID` - ID студента
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - параметры PostgreSQL
- `PORT` - порт для веб-сервера

### Файлы приложения

#### server.js

Веб-сервер Express для работы через браузер.

**Функции:**
- Обработка веб-страниц (views)
- Обработка API запросов
- Использование middleware для обработки ошибок

**Запуск:**
```bash
npm run server
```

#### app.js

CLI приложение для синхронизации данных.

**Функции:**
- Полная синхронизация данных (CMS → БД → Report API)
- Работа в командной строке

**Запуск:**
```bash
npm start
```

#### init-db.js

Скрипт инициализации базы данных.

**Функции:**
- Создание базы данных (если не существует)
- Создание таблиц `spares` и `spares_history`
- Создание индексов для оптимизации
- Миграция существующих таблиц (добавление JSONB колонки)

**Использование:**
```bash
npm run init-db
```

---

## Конфигурация

### Файл .env

Создайте файл `.env` на основе `env.example`:

```env
# n8n Integration Platform Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=
N8N_WEBHOOK_PATH=/webhook/spares

# CMS API Configuration
API_BASE_URL=http://212.237.219.35:8080
STUDENT_ID=9

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=integration_system
DB_USER=postgres
DB_PASSWORD=00000
```

### Переменные окружения

Все параметры можно также задать через переменные окружения:

**Windows PowerShell:**
```powershell
$env:N8N_BASE_URL="http://localhost:5678"
$env:STUDENT_ID=9
$env:DB_HOST="localhost"
# и т.д.
```

**Linux/Mac:**
```bash
export N8N_BASE_URL="http://localhost:5678"
export STUDENT_ID=9
export DB_HOST="localhost"
# и т.д.
```

---

## API и интеграции

### CMS API

**Базовый URL:** `http://212.237.219.35:8080`

**Эндпоинты:**
- `GET /students/{studentId}/cms/spares?page={page}&size={size}`

**Параметры:**
- `studentId` - ID студента
- `page` - номер страницы (начиная с 0)
- `size` - количество записей на странице

**Ответ:**
```json
[
  {
    "spareCode": "SPARE-1",
    "spareName": "Spare Part 1",
    "spareDescription": "Description",
    "spareType": "BRAKE",
    "spareStatus": "RESERVED",
    "price": "22",
    "quantity": 29,
    "updatedAt": "2025-09-09T14:53:45.751668"
  }
]
```

### Report API

**Базовый URL:** `http://212.237.219.35:8080`

**Эндпоинты:**

1. **Загрузка CSV:**
   - `POST /students/{studentId}/report/csv`
   - `Content-Type: text/csv; charset=utf-8`
   - Body: CSV строка

2. **Получение результатов:**
   - `GET /students/{studentId}/results`

**Ответ результатов:**
```json
{
  "result": 5,
  "lastSyncAt": "2025-01-15T10:30:00",
  "lastSyncMessage": "Синхронизация успешна"
}
```

### n8n Webhook

**URL:** `http://localhost:5678/webhook/spares`

**Метод:** POST

**Тело запроса:**
```json
{
  "studentId": 9,
  "page": 0,
  "size": 10
}
```

**Ответ:**
Массив объектов spare в формате CMS API

---

## База данных

### PostgreSQL

**Версия:** 12 или выше

**База данных:** `integration_system`

### Таблица spares

```sql
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
```

**Новое поле `additional_fields`:**
- Тип: `JSONB` (JSON Binary)
- Назначение: Хранит любые дополнительные поля, которые не соответствуют стандартной структуре
- Автоматическое заполнение: Все неизвестные поля из CMS API автоматически сохраняются в эту колонку
- Пример: Если CMS API возвращает поле `warranty_period`, оно будет сохранено в `additional_fields: {"warranty_period": 12}`

### Таблица spares_history

Таблица для хранения истории изменений запчастей. Автоматически заполняется при каждом обновлении данных из CMS API.

```sql
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
```

**Поля:**
- `id` - Уникальный идентификатор записи истории
- `spare_code` - Код запчасти (связь с основной таблицей)
- Все остальные поля соответствуют таблице `spares` и хранят **старые** значения
- `additional_fields` - JSONB колонка для хранения дополнительных полей (как в основной таблице)
- `changed_at` - Время изменения (когда были сохранены старые данные)
- `change_reason` - Причина изменения (по умолчанию `'sync_from_cms'`)

### Индексы

```sql
-- Индексы для таблицы spares
CREATE INDEX idx_spares_type ON spares(spare_type);
CREATE INDEX idx_spares_status ON spares(spare_status);
CREATE INDEX idx_spares_synced_at ON spares(last_synced_at);

-- Индексы для таблицы истории
CREATE INDEX idx_spares_history_code ON spares_history(spare_code);
CREATE INDEX idx_spares_history_changed_at ON spares_history(changed_at);
```

### Особенности

- **Историчность**: БД хранит все данные, даже если деталь удалена из CMS
- **История изменений**: При каждом обновлении данных из CMS старые значения автоматически сохраняются в таблицу `spares_history`
- **Обновление**: При синхронизации существующие записи обновляются (UPSERT), но старые данные сохраняются
- **Типы данных**: `price` и `updated_at` хранятся как TEXT для сохранения точности
- **Автоматическое сохранение истории**: История сохраняется только при наличии реальных изменений в данных
- **Гибкость структуры**: JSONB колонка `additional_fields` позволяет хранить любые дополнительные поля без изменения схемы БД
- **Автоматическая нормализация**: Код автоматически обрабатывает разные форматы имен полей (camelCase и snake_case)
- **Автоматическое обнаружение новых полей**: Неизвестные поля из CMS API автоматически сохраняются в `additional_fields`

### Гибкость системы и обработка изменений структуры

Система разработана с максимальной гибкостью для обработки изменений в структуре данных CMS API:

**1. Поддержка разных форматов имен полей:**
- Автоматическое распознавание `camelCase` (spareCode) и `snake_case` (spare_code)
- Нормализация данных происходит автоматически через метод `normalizeSpareData()`

**2. Автоматическое сохранение новых полей:**
- Все неизвестные поля автоматически сохраняются в JSONB колонку `additional_fields`
- Не требуется изменение схемы БД при добавлении новых полей в CMS API
- Пример: Если CMS API добавит поле `warranty_months`, оно автоматически сохранится в `additional_fields: {"warranty_months": 12}`

**3. Анализ новых полей:**
- Метод `analyzeAdditionalFields()` предоставляет статистику по дополнительным полям
- Помогает определить, какие новые поля появились и как часто они используются
- Возвращает частоту использования, типы данных и примеры значений

**4. Конфигурируемый CSV-генератор:**
- Поддержка динамических полей из `additional_fields`
- Автоматическое определение доступных полей через `detectFieldsConfig()`
- Возможность настройки набора полей для CSV экспорта
- Обратная совместимость: стандартный формат используется по умолчанию

**5. Автоматические миграции:**
- Система автоматически добавляет JSONB колонку при инициализации
- Поддержка миграции существующих баз данных

**Пример сценария:**
1. CMS API добавляет новое поле `discount_percentage`
2. При синхронизации поле автоматически сохраняется в `additional_fields`
3. Можно проанализировать новые поля через `db.analyzeAdditionalFields()`
4. CSV-генератор может включить новые поля автоматически через `generateCsvWithAllFields()`

---

## Формат данных

### CSV формат

Согласно спецификации Report API:

- **Разделитель**: `;` (точка с запятой)
- **Кодировка**: UTF-8
- **Заголовок**: отсутствует
- **Перенос строки**: `\n`
- **Порядок полей**: `spareCode;spareName;spareDescription;spareType;spareStatus;price;quantity;updatedAt`

**Пример:**
```
SPARE-1;Spare Part 1;Description for spare part 1;BRAKE;RESERVED;22;29;2025-09-09T14:53:45.751668
SPARE-2;Spare Part 2;Description for spare part 2;RADIATOR;AVAILABLE;15;100;2025-09-09T14:53:45.751668
```

### Формат данных в БД

**Объект spare:**
```javascript
{
  spare_code: "SPARE-1",
  spare_name: "Spare Part 1",
  spare_description: "Description",
  spare_type: "BRAKE",
  spare_status: "RESERVED",
  price: "22",              // строка
  quantity: 29,
  updated_at: "2025-09-09T14:53:45.751668",  // строка
  last_synced_at: "2025-01-15T10:30:00"      // TIMESTAMP
}
```

---

## Веб-интерфейс

### Главная страница (`/`)

**Функции:**
- Отображение статистики по деталям
- Предпросмотр первых 10 деталей
- Кнопка синхронизации данных
- Отображение результатов оценки

**Статистика:**
- Общее количество деталей
- Распределение по статусам
- Распределение по типам

### Страница всех деталей (`/spares`)

**Функции:**
- Отображение всех деталей с пагинацией (50 на страницу)
- Навигация между страницами
- Полная информация о каждой детали

### API эндпоинты

#### GET /api/stats

Получение статистики в формате JSON.

**Ответ:**
```json
{
  "total": 150,
  "byStatus": {
    "AVAILABLE": 100,
    "RESERVED": 30,
    "UNAVAILABLE": 20
  },
  "byType": {
    "BRAKE": 50,
    "RADIATOR": 30,
    "ENGINE": 70
  }
}
```

#### POST /api/sync

Запуск синхронизации данных.

**Ответ:**
```json
{
  "success": true,
  "message": "Синхронизация успешно завершена",
  "cmsToDb": { "synced": 150 },
  "dbToReport": { "synced": 150 },
  "results": {
    "result": 5,
    "lastSyncAt": "2025-01-15T10:30:00",
    "lastSyncMessage": "Синхронизация успешна"
  }
}
```