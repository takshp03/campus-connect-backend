const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// list of people I've chatted with + last message + unread count
const listConversations = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const [rows] = await pool.query(
    `SELECT
        u.id AS user_id, u.name, u.avatar_url,
        m.body AS last_message, m.created_at AS last_at,
        (SELECT COUNT(*) FROM messages x
         WHERE x.sender_id = u.id AND x.receiver_id = ? AND x.is_read = FALSE) AS unread
     FROM (
       SELECT IF(sender_id = ?, receiver_id, sender_id) AS other_id,
              MAX(id) AS last_id
       FROM messages
       WHERE sender_id = ? OR receiver_id = ?
       GROUP BY other_id
     ) AS conv
     JOIN messages m ON m.id = conv.last_id
     JOIN students u ON u.id = conv.other_id
     ORDER BY m.created_at DESC`,
    [me, me, me, me]
  );
  res.json(new ApiResponse(200, rows));
});

// full conversation with one user
const getConversation = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const other = req.params.userId;

  const [rows] = await pool.query(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [me, other, other, me]
  );

  // mark as read
  await pool.query(
    `UPDATE messages SET is_read = TRUE
     WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
    [other, me]
  );

  res.json(new ApiResponse(200, rows));
});

const sendMessage = asyncHandler(async (req, res) => {
  const { receiver_id, body } = req.body;
  if (Number(receiver_id) === req.user.id)
    throw new ApiError(400, 'Cannot message yourself');

  const [users] = await pool.query('SELECT id FROM students WHERE id = ?', [receiver_id]);
  if (!users.length) throw new ApiError(404, 'Receiver not found');

  const [r] = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)`,
    [req.user.id, receiver_id, body]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Message sent'));
});

module.exports = { listConversations, getConversation, sendMessage };