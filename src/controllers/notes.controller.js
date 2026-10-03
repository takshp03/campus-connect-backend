const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const list = asyncHandler(async (req, res) => {
  const { department, semester, subject, search } = req.query;
  const params = [];
  let where = 'WHERE 1=1';
  if (department) { where += ' AND n.department = ?'; params.push(department); }
  if (semester)   { where += ' AND n.semester = ?';   params.push(semester); }
  if (subject)    { where += ' AND n.subject LIKE ?'; params.push(`%${subject}%`); }
  if (search)     {
    where += ' AND (n.title LIKE ? OR n.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT n.*, s.name AS uploader_name
     FROM notes n
     JOIN students s ON s.id = n.uploader_id
     ${where}
     ORDER BY n.created_at DESC`,
    params
  );
  res.json(new ApiResponse(200, rows));
});

const getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT n.*, s.name AS uploader_name
     FROM notes n
     JOIN students s ON s.id = n.uploader_id
     WHERE n.id = ?`,
    [req.params.id]
  );
  if (!rows.length) throw new ApiError(404, 'Note not found');

  // fire-and-forget increment
  pool.query('UPDATE notes SET downloads = downloads + 1 WHERE id = ?', [req.params.id]);
  res.json(new ApiResponse(200, rows[0]));
});

const create = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'File is required');
  const { title, subject, department, semester, description } = req.body;
  const file_url = `/uploads/${req.file.filename}`;
  const file_type = req.file.mimetype.split('/')[1];

  const [r] = await pool.query(
    `INSERT INTO notes
       (uploader_id, title, subject, department, semester, description, file_url, file_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, subject || null, department || null, semester || null,
     description || null, file_url, file_type]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Note uploaded'));
});

const remove = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const [r] = await pool.query(
    `DELETE FROM notes WHERE id = ? ${isAdmin ? '' : 'AND uploader_id = ?'}`,
    isAdmin ? [req.params.id] : [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Note not found or not yours');
  res.json(new ApiResponse(200, null, 'Deleted'));
});

module.exports = { list, getOne, create, remove };