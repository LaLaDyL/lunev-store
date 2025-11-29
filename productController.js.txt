const { query } = require('../config/database');

// Получить все товары
const getAllProducts = async (req, res) => {
  try {
    const result = await query('SELECT * FROM products');
    res.json({
      status: 'success',
      count: result.rows.length,
      products: result.rows
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
};

// Получить товар по ID
const getProductById = async (req, res) => {
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
};

module.exports = {
  getAllProducts,
  getProductById
};