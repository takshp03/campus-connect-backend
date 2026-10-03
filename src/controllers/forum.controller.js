const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ---------- Threads ----------
const listThreads = asyncHandler(async (req, res) => {
  const { tag, search } = req.query;
  const params = [];
  let where = 'WHERE 1=1';
  if (tag)    { where += ' AND t.tag = ?'; params.push(tag); }
  if (search) {
    where += ' AND (t.title LIKE ? OR t.body LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT t.*, s.name AS author_name,
            (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) AS reply_count
     FROM forum_threads t
     JOIN students s ON s.id = t.student_id
     ${where}
     ORDER BY t.created_at DESC`,
    params
  );
  res.json(new ApiResponse(200, rows));
});

const getThread = asyncHandler(async (req, res) => {
  const [threads] = await pool.query(
    `SELECT t.*, s.name AS author_name
     FROM forum_threads t
     JOIN students s ON s.id = t.student_id
     WHERE t.id = ?`,
    [req.params.id]
  );
  if (!threads.length) throw new ApiError(404, 'Thread not found');

  const [replies] = await pool.query(
    `SELECT r.*, s.name AS author_name
     FROM forum_replies r
     JOIN students s ON s.id = r.student_id
     WHERE r.thread_id = ?
     ORDER BY r.created_at ASC`,
    [req.params.id]
  );

  res.json(new ApiResponse(200, { thread: threads[0], replies }));
});

const createThread = asyncHandler(async (req, res) => {
  const { title, body, tag } = req.body;
  const [r] = await pool.query(
    `INSERT INTO forum_threads (student_id, title, body, tag) VALUES (?, ?, ?, ?)`,
    [req.user.id, title, body, tag || null]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Thread created'));
});

const deleteThread = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const [r] = await pool.query(
    `DELETE FROM forum_threads WHERE id = ? ${isAdmin ? '' : 'AND student_id = ?'}`,
    isAdmin ? [req.params.id] : [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Thread not found or not yours');
  res.json(new ApiResponse(200, null, 'Thread deleted'));
});

const toggleLockThread = asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `UPDATE forum_threads SET is_locked = NOT is_locked WHERE id = ?`,
    [req.params.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Thread not found');
  res.json(new ApiResponse(200, null, 'Thread lock toggled'));
});

// ---------- Replies ----------
const addReply = asyncHandler(async (req, res) => {
  const { body } = req.body;
  const threadId = req.params.id;

  const [threads] = await pool.query('SELECT is_locked FROM forum_threads WHERE id = ?', [threadId]);
  if (!threads.length) throw new ApiError(404, 'Thread not found');
  if (threads[0].is_locked) throw new ApiError(403, 'Thread is locked');

  const [r] = await pool.query(
    `INSERT INTO forum_replies (thread_id, student_id, body) VALUES (?, ?, ?)`,
    [threadId, req.user.id, body]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Reply added'));
});

const deleteReply = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const [r] = await pool.query(
    `DELETE FROM forum_replies WHERE id = ? ${isAdmin ? '' : 'AND student_id = ?'}`,
    isAdmin ? [req.params.id] : [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Reply not found or not yours');
  res.json(new ApiResponse(200, null, 'Reply deleted'));
});

module.exports = {
  listThreads, getThread, createThread, deleteThread, toggleLockThread,
  addReply, deleteReply,
};