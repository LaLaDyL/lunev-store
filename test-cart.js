const { query } = require('./config/database');

async function testCart() {
  try {
    console.log('🧪 Тестируем корзину...');
    
    // 1. Проверим структуру таблицы
    const structure = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cart' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Структура cart:');
    structure.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });
    
    // 2. Проверим данные
    const data = await query('SELECT COUNT(*) as count FROM cart');
    console.log('🛒 Записей в корзине:', data.rows[0].count);
    
    // 3. Проверим добавление
    console.log('🧪 Пробуем добавить тестовую запись...');
    const testAdd = await query(`
      INSERT INTO cart (user_id, product_id, quantity) 
      VALUES (1, 1, 1) 
      ON CONFLICT (user_id, product_id, selected_memory) DO NOTHING
      RETURNING *
    `);
    
    if (testAdd.rows.length > 0) {
      console.log('✅ Тестовая запись добавлена:', testAdd.rows[0]);
    } else {
      console.log('ℹ️  Запись уже существует (конфликт уникальности)');
    }
    
    // 4. Проверим данные снова
    const finalData = await query('SELECT * FROM cart');
    console.log('📊 Финальные данные в cart:', finalData.rows);
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

testCart();