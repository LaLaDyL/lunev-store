const API_BASE = window.location.origin;
const express = require('express');
const path = require('path');
const { query } = require('./config/database');

const app = express();
app.use(express.json());

// Раздача статических файлов из корня репозитория
app.use(express.static('../'));

// Разрешаем CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Главная страница HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// API информация
app.get('/api', (req, res) => {
  res.json({ 
    message: '✅ L-U-N-E-V Backend работает!',
    version: '1.0.0',
    endpoints: {
      products: 'GET /api/products',
      product_by_id: 'GET /api/products/1',
      register: 'POST /api/register',
      login: 'POST /api/login'
    }
  });
});

// Тест базы данных
app.get('/test', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as time');
    res.json({ 
      status: '✅ Сервер и база данных работают!',
      time: result.rows[0].time
    });
  } catch (error) {
    res.status(500).json({ 
      status: '❌ Ошибка базы данных',
      error: error.message 
    });
  }
});

// Получить все товары
app.get('/api/products', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products');
    res.json({
      status: 'success',
      count: result.rows.length,
      products: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить товар по ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json({
      status: 'success',
      product: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Упрощенная регистрация (только основные поля)
app.post('/api/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      newsletter = false
    } = req.body;
    
    console.log('📝 Регистрация - полученные данные:', { 
      email, firstName, lastName, phone, newsletter
    });
    
    // Проверяем есть ли пользователь
    const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    // Создаем пользователя (только основные поля)
    const result = await query(
      `INSERT INTO users 
       (email, password, first_name, last_name, phone, newsletter) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, phone, newsletter`,
      [email, password, firstName, lastName, phone, newsletter]
    );
    
    const user = result.rows[0];
    
    res.json({
      status: 'success',
      message: 'Пользователь создан',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        newsletter: user.newsletter
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ error: error.message });
  }
});

// Вход (упрощенный)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Вход:', { email });
    
    const result = await query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }
    
    res.json({
      status: 'success',
      message: 'Вход выполнен',
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================== КОРЗИНА ==================

// Получить избранное пользователя
app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(`
      SELECT f.*, p.name, p.price, p.main_image as image_url
      FROM favorites f 
      JOIN products p ON f.product_id = p.id 
      WHERE f.user_id = $1
    `, [userId]);
    
    res.json({
      status: 'success',
      favorites: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Добавить товар в корзину
app.post('/api/cart/add', async (req, res) => {
  try {
    const { userId, productId, quantity = 1, selectedMemory } = req.body;
    
    console.log('📦 Добавление в корзину - данные:', { userId, productId, quantity, selectedMemory });
    console.log('📦 Типы данных:', { 
      userIdType: typeof userId, 
      productIdType: typeof productId 
    });
    
    // Проверяем есть ли уже товар в корзине
    const existingItem = await query(
      'SELECT * FROM cart WHERE user_id = $1 AND product_id = $2 AND selected_memory = $3',
      [userId, productId, selectedMemory || '']
    );
    
    console.log('📦 Существующий товар:', existingItem.rows);
    
    if (existingItem.rows.length > 0) {
      // Обновляем количество
      await query(
        'UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3 AND selected_memory = $4',
        [quantity, userId, productId, selectedMemory || '']
      );
      console.log('✅ Количество обновлено');
    } else {
      // Добавляем новый товар
      await query(
        'INSERT INTO cart (user_id, product_id, quantity, selected_memory) VALUES ($1, $2, $3, $4)',
        [userId, productId, quantity, selectedMemory || '']
      );
      console.log('✅ Товар добавлен');
    }
    
    res.json({
      status: 'success',
      message: 'Товар добавлен в корзину'
    });
    
  } catch (error) {
    console.log('❌ Ошибка добавления в корзину:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug эндпоинт для проверки корзины
app.get('/api/debug/cart', async (req, res) => {
  try {
    console.log('🔧 Debug: проверка корзины');
    
    // 1. Проверим таблицу cart
    const cartData = await query('SELECT * FROM cart');
    console.log('🛒 Данные в cart:', cartData.rows);
    
    // 2. Проверим таблицу users
    const users = await query('SELECT id, email, first_name FROM users');
    console.log('👤 Пользователи:', users.rows);
    
    res.json({
      status: 'debug',
      cart: cartData.rows,
      users: users.rows,
      message: 'Debug информация о корзине'
    });
    
  } catch (error) {
    console.error('❌ Debug ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить корзину пользователя
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🛒 Запрос корзины для user:', userId);
    
    const result = await query(`
      SELECT c.*, p.name, p.price, p.main_image as image_url
      FROM cart c 
      JOIN products p ON c.product_id = p.id 
      WHERE c.user_id = $1
    `, [userId]);
    
    console.log('📦 Найдено товаров:', result.rows.length);
    
    res.json({
      status: 'success',
      cart: result.rows
    });
  } catch (error) {
    console.error('❌ Ошибка загрузки корзины:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить количество товара в корзине
app.put('/api/cart/update', async (req, res) => {
  try {
    const { userId, productId, quantity, selectedMemory } = req.body;
    
    console.log('🔄 Обновление корзины:', { userId, productId, quantity, selectedMemory });
    
    if (quantity <= 0) {
      // Удаляем товар если количество 0
      await query(
        'DELETE FROM cart WHERE user_id = $1 AND product_id = $2 AND selected_memory = $3',
        [userId, productId, selectedMemory || '']
      );
      console.log('🗑️ Товар удален из корзины');
    } else {
      // Обновляем количество
      await query(
        'UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3 AND selected_memory = $4',
        [quantity, userId, productId, selectedMemory || '']
      );
      console.log('✅ Количество обновлено:', quantity);
    }
    
    res.json({
      status: 'success',
      message: 'Корзина обновлена'
    });
  } catch (error) {
    console.log('❌ Ошибка обновления корзины:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить упрощенную информацию о пользователе
app.get('/api/user/profile', async (req, res) => {
  try {
    console.log('👤 Запрос профиля, query:', req.query);
    
    const userId = req.query.userId;
    
    if (!userId) {
      console.log('❌ Нет userId');
      return res.status(400).json({ error: 'User ID required' });
    }
    
    console.log('🔍 Ищем пользователя ID:', userId);
    
    const result = await query(`
      SELECT id, email, first_name, last_name, phone, newsletter
      FROM users 
      WHERE id = $1
    `, [parseInt(userId)]);
    
    console.log('📊 Найден пользователь:', result.rows[0]);
    
    if (result.rows.length === 0) {
      console.log('❌ Пользователь не найден');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    console.log('✅ Отправляем данные пользователя:', {
      id: user.id,
      email: user.email,
      first_name: user.first_name
    });
    
    res.json({
      status: 'success',
      user: user
    });
    
  } catch (error) {
    console.error('❌ Ошибка API профиля:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить товар из корзины
app.delete('/api/cart/remove', async (req, res) => {
  try {
    const { userId, productId, selectedMemory } = req.body;
    
    console.log('🗑️ Удаление из корзины:', { userId, productId, selectedMemory });
    
    await query(
      'DELETE FROM cart WHERE user_id = $1 AND product_id = $2 AND selected_memory = $3',
      [userId, productId, selectedMemory || '']
    );
    
    console.log('✅ Товар удален');
    
    res.json({
      status: 'success',
      message: 'Товар удален из корзины'
    });
  } catch (error) {
    console.log('❌ Ошибка удаления:', error);
    res.status(500).json({ error: error.message });
  }
});

// ================== ИЗБРАННОЕ ==================

// Получить избранное пользователя
app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(`
      SELECT f.*, p.name, p.price, p.image_url 
      FROM favorites f 
      JOIN products p ON f.product_id = p.id 
      WHERE f.user_id = $1
    `, [userId]);
    
    res.json({
      status: 'success',
      favorites: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Добавить товар в избранное
app.post('/api/favorites/add', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    
    console.log('❤️ Добавление в избранное:', { userId, productId });
    
    // Проверяем есть ли уже товар в избранном
    const existingItem = await query(
      'SELECT * FROM favorites WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    
    if (existingItem.rows.length > 0) {
      res.json({
        status: 'success',
        message: 'Товар уже в избранном'
      });
    } else {
      // Добавляем новый товар
      await query(
        'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)',
        [userId, productId]
      );
      console.log('✅ Товар добавлен в избранное');
      
      res.json({
        status: 'success',
        message: 'Товар добавлен в избранное'
      });
    }
  } catch (error) {
    console.log('❌ Ошибка:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить товар из избранного
app.delete('/api/favorites/remove', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    
    console.log('💔 Удаление из избранного:', { userId, productId });
    
    await query(
      'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    
    console.log('✅ Товар удален из избранного');
    
    res.json({
      status: 'success',
      message: 'Товар удален из избранного'
    });
  } catch (error) {
    console.log('❌ Ошибка удаления:', error);
    res.status(500).json({ error: error.message });
  }
});

// Проверить, есть ли товар в избранном
app.get('/api/favorites/check/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    const result = await query(
      'SELECT * FROM favorites WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    
    res.json({
      status: 'success',
      isFavorite: result.rows.length > 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 ==================================');
  console.log('🚀 Сервер L-U-N-E-V запущен!');
  console.log(`🚀 Адрес: http://localhost:${PORT}`);
  console.log('🚀 ==================================');
  console.log('📊 Тест базы: http://localhost:3000/test');
  console.log('🛍️ Товары: http://localhost:3000/api/products');
  console.log('🔐 Регистрация: POST http://localhost:3000/api/register');
  console.log('🔐 Вход: POST http://localhost:3000/api/login');
  console.log('🏠 Главная: http://localhost:3000/');
});