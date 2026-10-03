const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const list = asyncHandler(async (req, res) => {
  const { category, search, status = 'available' } = req.query;
  const params = [status];
  let where = 'WHERE m.status = ?';
  if (category) { where += ' AND m.category = ?'; params.push(category); }
  if (search) {
    where += ' AND (m.title LIKE ? OR m.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT m.*, s.name AS seller_name, s.department AS seller_department
     FROM marketplace_items m
     JOIN students s ON s.id = m.seller_id
     ${where}
     ORDER BY m.created_at DESC`,
    params
  );
  res.json(new ApiResponse(200, rows));
});

const getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT m.*, s.name AS seller_name, s.email AS seller_email, s.phone AS seller_phone
     FROM marketplace_items m
     JOIN students s ON s.id = m.seller_id
     WHERE m.id = ?`,
    [req.params.id]
  );
  if (!rows.length) throw new ApiError(404, 'Item not found');
  res.json(new ApiResponse(200, rows[0]));
});

const create = asyncHandler(async (req, res) => {
  const { title, description, price, category, item_condition } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const [r] = await pool.query(
    `INSERT INTO marketplace_items
       (seller_id, title, description, price, category, item_condition, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, description || null, price, category || null,
     item_condition || 'good', image_url]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Listed'));
});

const update = asyncHandler(async (req, res) => {
  const { title, description, price, category, item_condition, status } = req.body;
  const [r] = await pool.query(
    `UPDATE marketplace_items SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       price = COALESCE(?, price),
       category = COALESCE(?, category),
       item_condition = COALESCE(?, item_condition),
       status = COALESCE(?, status)
     WHERE id = ? AND seller_id = ?`,
    [title, description, price, category, item_condition, status,
     req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Item not found or not yours');
  res.json(new ApiResponse(200, null, 'Updated'));
});

const remove = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const [r] = await pool.query(
    `DELETE FROM marketplace_items WHERE id = ? ${isAdmin ? '' : 'AND seller_id = ?'}`,
    isAdmin ? [req.params.id] : [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Item not found or not yours');
  res.json(new ApiResponse(200, null, 'Deleted'));
});

const markSold = asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `UPDATE marketplace_items SET status = 'sold'
     WHERE id = ? AND seller_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Item not found or not yours');
  res.json(new ApiResponse(200, null, 'Marked as sold'));
});

module.exports = { list, getOne, create, update, remove, markSold };