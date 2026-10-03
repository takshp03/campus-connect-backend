const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const stats = asyncHandler(async (_req, res) => {
  const [[students]]   = await pool.query(`SELECT COUNT(*) AS c FROM students WHERE role='student'`);
  const [[clubs]]      = await pool.query(`SELECT COUNT(*) AS c FROM clubs`);
  const [[events]]     = await pool.query(`SELECT COUNT(*) AS c FROM events WHERE event_date >= NOW()`);
  const [[marketplace]]= await pool.query(`SELECT COUNT(*) AS c FROM marketplace_items WHERE status='available'`);
  const [[lostFound]]  = await pool.query(`SELECT COUNT(*) AS c FROM lost_found_items WHERE status='open'`);
  const [[notes]]      = await pool.query(`SELECT COUNT(*) AS c FROM notes`);
  const [[threads]]    = await pool.query(`SELECT COUNT(*) AS c FROM forum_threads`);
  const [[pendingReports]] = await pool.query(`SELECT COUNT(*) AS c FROM reports WHERE status='pending'`);

  res.json(new ApiResponse(200, {
    students: students.c,
    clubs: clubs.c,
    upcoming_events: events.c,
    marketplace_items: marketplace.c,
    open_lost_found: lostFound.c,
    notes: notes.c,
    forum_threads: threads.c,
    pending_reports: pendingReports.c,
  }));
});

const listStudents = asyncHandler(async (req, res) => {
  const { search, role } = req.query;
  const params = [];
  let where = 'WHERE 1=1';
  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ? OR roll_no LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role) { where += ' AND role = ?'; params.push(role); }

  const [rows] = await pool.query(
    `SELECT id, name, email, roll_no, department, year, role, is_active, created_at
     FROM students ${where} ORDER BY created_at DESC`,
    params
  );
  res.json(new ApiResponse(200, rows));
});

const toggleStudentActive = asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `UPDATE students SET is_active = NOT is_active WHERE id = ?`,
    [req.params.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Student not found');
  res.json(new ApiResponse(200, null, 'Status toggled'));
});

const promoteToAdmin = asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `UPDATE students SET role = 'admin' WHERE id = ?`,
    [req.params.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Student not found');
  res.json(new ApiResponse(200, null, 'Promoted to admin'));
});

// -------- Reports --------
const listReports = asyncHandler(async (req, res) => {
  const { status = 'pending' } = req.query;
  const [rows] = await pool.query(
    `SELECT r.*, s.name AS reporter_name
     FROM reports r
     JOIN students s ON s.id = r.reported_by
     WHERE r.status = ?
     ORDER BY r.created_at DESC`,
    [status]
  );
  res.json(new ApiResponse(200, rows));
});

const createReport = asyncHandler(async (req, res) => {
  const { entity_type, entity_id, reason } = req.body;
  const [r] = await pool.query(
    `INSERT INTO reports (reported_by, entity_type, entity_id, reason)
     VALUES (?, ?, ?, ?)`,
    [req.user.id, entity_type, entity_id, reason || null]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Report submitted'));
});

const updateReportStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const [r] = await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Report not found');
  res.json(new ApiResponse(200, null, 'Report updated'));
});

module.exports = {
  stats, listStudents, toggleStudentActive, promoteToAdmin,
  listReports, createReport, updateReportStatus,
};