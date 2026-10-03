const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// feed relevant to current user
const list = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, s.name AS author_name, c.name AS club_name
     FROM announcements a
     JOIN students s ON s.id = a.created_by
     LEFT JOIN clubs c ON c.id = a.club_id
     WHERE (a.expires_at IS NULL OR a.expires_at > NOW())
       AND (
         a.audience = 'all'
         OR (a.audience = 'department' AND a.department = ?)
         OR (a.audience = 'club' AND a.club_id IN
              (SELECT club_id FROM club_members WHERE student_id = ?))
       )
     ORDER BY a.created_at DESC`,
    [req.user.department, req.user.id]
  );
  res.json(new ApiResponse(200, rows));
});

const create = asyncHandler(async (req, res) => {
  const { title, body, audience = 'all', department, club_id, expires_at } = req.body;

  if (audience === 'department' && !department)
    throw new ApiError(400, 'department is required for department audience');
  if (audience === 'club' && !club_id)
    throw new ApiError(400, 'club_id is required for club audience');

  const [r] = await pool.query(
    `INSERT INTO announcements
       (created_by, title, body, audience, department, club_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, body, audience, department || null, club_id || null, expires_at || null]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Announcement posted'));
});

const remove = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Announcement not found');
  res.json(new ApiResponse(200, null, 'Deleted'));
});

module.exports = { list, create, remove };