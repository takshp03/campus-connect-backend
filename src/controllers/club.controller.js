const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const listClubs = asyncHandler(async (req, res) => {
  const { search = '', category } = req.query;
  const params = [];
  let where = 'WHERE 1=1';
  if (search) {
    where += ' AND (c.name LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    where += ' AND c.category = ?';
    params.push(category);
  }

  const [rows] = await pool.query(
    `SELECT c.*, 
            (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.id) AS member_count
     FROM clubs c ${where}
     ORDER BY c.created_at DESC`,
    params
  );
  res.json(new ApiResponse(200, rows));
});

const getClub = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*, 
            (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.id) AS member_count
     FROM clubs c WHERE c.id = ?`,
    [req.params.id]
  );
  if (!rows.length) throw new ApiError(404, 'Club not found');
  res.json(new ApiResponse(200, rows[0]));
});

const createClub = asyncHandler(async (req, res) => {
  const { name, description, category, logo_url } = req.body;
  const [r] = await pool.query(
    `INSERT INTO clubs (name, description, category, logo_url, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [name, description || null, category || null, logo_url || null, req.user.id]
  );
  // creator automatically becomes coordinator
  await pool.query(
    `INSERT INTO club_members (club_id, student_id, role) VALUES (?, ?, 'coordinator')`,
    [r.insertId, req.user.id]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Club created'));
});

const updateClub = asyncHandler(async (req, res) => {
  const { name, description, category, logo_url } = req.body;
  const [r] = await pool.query(
    `UPDATE clubs SET
       name        = COALESCE(?, name),
       description = COALESCE(?, description),
       category    = COALESCE(?, category),
       logo_url    = COALESCE(?, logo_url)
     WHERE id = ?`,
    [name, description, category, logo_url, req.params.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Club not found');
  res.json(new ApiResponse(200, null, 'Club updated'));
});

const deleteClub = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM clubs WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Club not found');
  res.json(new ApiResponse(200, null, 'Club deleted'));
});

const joinClub = asyncHandler(async (req, res) => {
  const clubId = req.params.id;
  const [club] = await pool.query('SELECT id FROM clubs WHERE id = ?', [clubId]);
  if (!club.length) throw new ApiError(404, 'Club not found');

  try {
    await pool.query(
      `INSERT INTO club_members (club_id, student_id) VALUES (?, ?)`,
      [clubId, req.user.id]
    );
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Already a member');
    throw e;
  }
  res.status(201).json(new ApiResponse(201, null, 'Joined club'));
});

const leaveClub = asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `DELETE FROM club_members WHERE club_id = ? AND student_id = ?`,
    [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'You are not a member');
  res.json(new ApiResponse(200, null, 'Left club'));
});

const listMembers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.email, s.department, s.year, cm.role, cm.joined_at
     FROM club_members cm
     JOIN students s ON s.id = cm.student_id
     WHERE cm.club_id = ?
     ORDER BY cm.joined_at ASC`,
    [req.params.id]
  );
  res.json(new ApiResponse(200, rows));
});

module.exports = {
  listClubs, getClub, createClub, updateClub, deleteClub,
  joinClub, leaveClub, listMembers,
};