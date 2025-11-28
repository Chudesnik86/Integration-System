/**
 * Data Transfer Object для запчасти
 * Используется для передачи данных между слоями приложения
 */
class SpareDTO {
    constructor(data) {
        this.spare_code = data.spare_code || null;
        this.spare_name = data.spare_name || null;
        this.spare_description = data.spare_description || null;
        this.spare_type = data.spare_type || null;
        this.spare_status = data.spare_status || null;
        this.price = data.price || null;
        this.quantity = data.quantity || null;
        this.updated_at = data.updated_at || null;
        this.additional_fields = data.additional_fields || null;
    }

    /**
     * Нормализация данных из CMS API
     * Поддерживает разные форматы имен полей
     */
    static normalizeFromCms(data) {
        if (!data) {
            throw new Error('Spare data is required');
        }

        const normalized = {
            spare_code: data.spareCode || data.spare_code || null,
            spare_name: data.spareName || data.spare_name || null,
            spare_description: data.spareDescription || data.spare_description || null,
            spare_type: data.spareType || data.spare_type || null,
            spare_status: data.spareStatus || data.spare_status || null,
            price: data.price || null,
            quantity: data.quantity || null,
            updated_at: data.updatedAt || data.updated_at || null
        };

        if (!normalized.spare_code) {
            throw new Error('spareCode is required field');
        }

        // Собираем дополнительные поля
        const knownFields = ['spareCode', 'spare_code', 'spareName', 'spare_name', 
                           'spareDescription', 'spare_description', 'spareType', 'spare_type',
                           'spareStatus', 'spare_status', 'price', 'quantity', 
                           'updatedAt', 'updated_at'];
        
        const additionalFields = {};
        for (const key in data) {
            if (!knownFields.includes(key) && data[key] !== undefined && data[key] !== null) {
                additionalFields[key] = data[key];
            }
        }

        if (Object.keys(additionalFields).length > 0) {
            normalized.additional_fields = additionalFields;
            console.log(`ℹ️  Additional fields detected (${normalized.spare_code}):`, Object.keys(additionalFields));
        }

        return new SpareDTO(normalized);
    }

    /**
     * Преобразование для сохранения в БД
     */
    toDbFormat() {
        return {
            spare_code: this.spare_code,
            spare_name: this.spare_name,
            spare_description: this.spare_description,
            spare_type: this.spare_type,
            spare_status: this.spare_status,
            price: this.price ? String(this.price) : null,
            quantity: this.quantity || null,
            updated_at: this.updated_at ? String(this.updated_at).replace(/Z$/, '') : null,
            additional_fields: this.additional_fields ? JSON.stringify(this.additional_fields) : '{}'
        };
    }

    /**
     * Преобразование для ответа API
     */
    toApiFormat() {
        return {
            spare_code: this.spare_code,
            spare_name: this.spare_name,
            spare_description: this.spare_description,
            spare_type: this.spare_type,
            spare_status: this.spare_status,
            price: this.price,
            quantity: this.quantity,
            updated_at: this.updated_at,
            additional_fields: this.additional_fields
        };
    }
}

module.exports = SpareDTO;

