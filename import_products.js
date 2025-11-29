const { query } = require('./config/database');
const products = require('./products.json');

async function importProducts() {
    try {
        console.log('🔄 Начинаем импорт товаров...');
        
        // Очистим таблицу перед импортом
        await query('DELETE FROM products');
        console.log('✅ Таблица products очищена');
        
        // Импортируем каждый товар
        for (const product of products) {
            const result = await query(
                `INSERT INTO products (
                    id, name, price, main_image, image_urls, 
                    memory_options, color_options, description, 
                    delivery, bonus, category
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    product.id,
                    product.name,
                    product.price,
                    product.main_image,
                    product.images, // массив изображений
                    product.memory_options, // массив вариантов памяти
                    product.color_options,
                    product.description, // массив описания
                    product.delivery, // массив доставки
                    product.bonus,
                    getCategoryById(product.id) // определим категорию по ID
                ]
            );
            console.log(`✅ Добавлен товар: ${product.name}`);
        }
        
        console.log('🎉 Все товары успешно импортированы!');
        console.log(`📊 Всего товаров: ${products.length}`);
        
    } catch (error) {
        console.error('❌ Ошибка импорта:', error);
    }
}

// Функция для определения категории по ID товара
function getCategoryById(id) {
    if (id >= 1 && id <= 5) return 'smartphones';
    if (id >= 6 && id <= 10) return 'consoles';
    if (id >= 11 && id <= 15) return 'headphones';
    if (id >= 16 && id <= 18) return 'electronics';
    if (id >= 19 && id <= 23) return 'portable_consoles';
    if (id >= 24 && id <= 28) return 'home_appliances';
    return 'other';
}

// Запускаем импорт
importProducts();