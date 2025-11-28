/**
 * Модель запчасти (Spare)
 * Определяет структуру данных для запчастей
 */
class Spare {
    constructor(data = {}) {
        this.spare_code = data.spare_code || data.spareCode || null;
        this.spare_name = data.spare_name || data.spareName || null;
        this.spare_description = data.spare_description || data.spareDescription || null;
        this.spare_type = data.spare_type || data.spareType || null;
        this.spare_status = data.spare_status || data.spareStatus || null;
        this.price = data.price || null;
        this.quantity = data.quantity || null;
        this.updated_at = data.updated_at || data.updatedAt || null;
        this.additional_fields = data.additional_fields || data.additionalFields || null;
        this.last_synced_at = data.last_synced_at || null;
    }

    /**
     * Преобразует модель в объект для БД (snake_case)
     */
    toDbFormat() {
        return {
            spare_code: this.spare_code,
            spare_name: this.spare_name,
            spare_description: this.spare_description,
            spare_type: this.spare_type,
            spare_status: this.spare_status,
            price: this.price,
            quantity: this.quantity,
            updated_at: this.updated_at,
            additional_fields: this.additional_fields,
            last_synced_at: this.last_synced_at
        };
    }

    /**
     * Преобразует модель в объект для API (camelCase)
     */
    toApiFormat() {
        return {
            spareCode: this.spare_code,
            spareName: this.spare_name,
            spareDescription: this.spare_description,
            spareType: this.spare_type,
            spareStatus: this.spare_status,
            price: this.price,
            quantity: this.quantity,
            updatedAt: this.updated_at,
            additionalFields: this.additional_fields
        };
    }

    /**
     * Валидация обязательных полей
     */
    validate() {
        if (!this.spare_code) {
            throw new Error('spare_code is required');
        }
        if (!this.spare_name) {
            throw new Error('spare_name is required');
        }
        return true;
    }

    /**
     * Создает экземпляр из данных БД
     */
    static fromDbRow(row) {
        return new Spare({
            spare_code: row.spare_code,
            spare_name: row.spare_name,
            spare_description: row.spare_description,
            spare_type: row.spare_type,
            spare_status: row.spare_status,
            price: row.price,
            quantity: row.quantity,
            updated_at: row.updated_at,
            additional_fields: row.additional_fields,
            last_synced_at: row.last_synced_at
        });
    }

    /**
     * Создает экземпляр из данных CMS API
     */
    static fromCmsApi(data) {
        return new Spare({
            spareCode: data.spareCode || data.spare_code,
            spareName: data.spareName || data.spare_name,
            spareDescription: data.spareDescription || data.spare_description,
            spareType: data.spareType || data.spare_type,
            spareStatus: data.spareStatus || data.spare_status,
            price: data.price,
            quantity: data.quantity,
            updatedAt: data.updatedAt || data.updated_at
        });
    }
}

module.exports = Spare;

