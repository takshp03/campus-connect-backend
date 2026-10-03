const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const list = asyncHandler(async (req, res) => {
  const { type, status = 'open', search } = req.query;
  const params = [];
  let where = 'WHERE lf.status = ?';
  params.push(status);

  if (type) { where += ' AND lf.type = ?'; params.push(type); }
  if (search) {
    where += ' AND (lf.title LIKE ? OR lf.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT lf.*, s.name AS posted_by_name
     FROM lost_found_items lf
     JOIN students s ON s.id = lf.student_id
     ${where}
     ORDER BY lf.created_at DESC`,
    params
  );
  res.json(new ApiResponse(200, rows));
});

const getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT lf.*, s.name AS posted_by_name, s.email AS posted_by_email
     FROM lost_found_items lf
     JOIN students s ON s.id = lf.student_id
     WHERE lf.id = ?`,
    [req.params.id]
  );
  if (!rows.length) throw new ApiError(404, 'Item not found');
  res.json(new ApiResponse(200, rows[0]));
});

const create = asyncHandler(async (req, res) => {
  const { type, title, description, category, location, contact_info } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const [r] = await pool.query(
    `INSERT INTO lost_found_items
       (student_id, type, title, description, category, location, image_url, contact_info)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, type, title, description || null, category || null,
     location || null, image_url, contact_info || null]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Posted'));
});

const update = asyncHandler(async (req, res) => {
  const { title, description, category, location, contact_info, status } = req.body;
  const [r] = await pool.query(
    `UPDATE lost_found_items SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       category = COALESCE(?, category),
       location = COALESCE(?, location),
       contact_info = COALESCE(?, contact_info),
       status = COALESCE(?, status)
     WHERE id = ? AND student_id = ?`,
    [title, description, category, location, contact_info, status, req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Item not found or not yours');
  res.json(new ApiResponse(200, null, 'Updated'));
});

const remove = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const [r] = await pool.query(
    `DELETE FROM lost_found_items WHERE id = ? ${isAdmin ? '' : 'AND student_id = ?'}`,
    isAdmin ? [req.params.id] : [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Item not found or not yours');
  res.json(new ApiResponse(200, null, 'Deleted'));
});

const resolve = asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `UPDATE lost_found_items SET status = 'resolved'
     WHERE id = ? AND student_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Item not found or not yours');
  res.json(new ApiResponse(200, null, 'Marked as resolved'));
});

module.exports = { list, getOne, create, update, remove, resolve };