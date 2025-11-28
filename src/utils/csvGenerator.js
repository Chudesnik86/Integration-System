/**
 * Утилита для генерации CSV файлов
 */
class CSVGenerator {
    /**
     * Стандартная конфигурация полей для CSV (совместимость с Report API)
     * @type {Array}
     */
    static DEFAULT_FIELDS = [
        { key: 'spare_code', name: 'spareCode', required: true },
        { key: 'spare_name', name: 'spareName', required: true },
        { key: 'spare_description', name: 'spareDescription', required: false },
        { key: 'spare_type', name: 'spareType', required: false },
        { key: 'spare_status', name: 'spareStatus', required: false },
        { key: 'price', name: 'price', required: false, formatter: 'price' },
        { key: 'quantity', name: 'quantity', required: false },
        { key: 'updated_at', name: 'updatedAt', required: false, formatter: 'date' }
    ];

    /**
     * Генерирует CSV файл согласно спецификации
     * 
     * @param {Array} spares - Массив объектов spare
     * @param {Object} options - Опции генерации
     * @returns {string} CSV строка
     */
    static generateCsv(spares, options = {}) {
        const {
            fields = this.DEFAULT_FIELDS,
            separator = ';'
        } = options;

        if (!Array.isArray(spares) || spares.length === 0) {
            return '';
        }

        const lines = [];

        for (const spare of spares) {
            const row = [];
            
            for (const field of fields) {
                let value;
                
                if (field.source === 'additional_fields' && spare.additional_fields) {
                    value = spare.additional_fields[field.name];
                } else {
                    value = spare[field.key];
                }
                
                let formattedValue;
                if (field.formatter === 'price') {
                    formattedValue = this.formatPrice(value);
                } else if (field.formatter === 'date') {
                    formattedValue = this.formatUpdatedAt(value);
                } else {
                    formattedValue = this.formatValue(value);
                }
                
                row.push(formattedValue);
            }
            
            lines.push(row.join(separator));
        }

        return lines.join('\n');
    }

    /**
     * Автоматически определяет конфигурацию полей на основе данных
     */
    static detectFieldsConfig(spares) {
        if (!Array.isArray(spares) || spares.length === 0) {
            return this.DEFAULT_FIELDS;
        }

        const config = [...this.DEFAULT_FIELDS];
        
        const additionalFieldsMap = new Map();
        for (const spare of spares) {
            if (spare.additional_fields && typeof spare.additional_fields === 'object') {
                for (const [key, value] of Object.entries(spare.additional_fields)) {
                    if (!additionalFieldsMap.has(key)) {
                        additionalFieldsMap.set(key, {
                            key: `additional_fields.${key}`,
                            name: key,
                            required: false,
                            source: 'additional_fields'
                        });
                    }
                }
            }
        }
        
        for (const field of additionalFieldsMap.values()) {
            config.push(field);
        }
        
        return config;
    }

    /**
     * Генерирует CSV с автоматическим определением всех доступных полей
     */
    static generateCsvWithAllFields(spares, options = {}) {
        const fields = this.detectFieldsConfig(spares);
        return this.generateCsv(spares, { ...options, fields });
    }

    static formatValue(value) {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'number') {
            if (Number.isInteger(value)) {
                return String(value);
            }
            let s = String(value);
            if (s.includes('.')) {
                s = s.replace(/\.?0+$/, '');
                if (s.endsWith('.')) {
                    s = s.slice(0, -1);
                }
            }
            return s;
        }
        
        if (typeof value === 'string' && /^-?\d+\.0+$/.test(value)) {
            return value.replace(/\.0+$/, '');
        }

        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            let dateStr = value.replace(/Z$/, '');
            if (!dateStr.includes('.')) {
                dateStr += '.000000';
            } else {
                const parts = dateStr.split('.');
                if (parts[1]) {
                    const digits = parts[1];
                    const microseconds = digits.padEnd(6, '0').substring(0, 6);
                    dateStr = parts[0] + '.' + microseconds;
                }
            }
            return dateStr;
        }

        return String(value);
    }

    static formatPrice(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value);
    }

    static formatUpdatedAt(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value);
    }
}

module.exports = CSVGenerator;

