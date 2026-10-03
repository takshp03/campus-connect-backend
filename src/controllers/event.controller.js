const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const listEvents = asyncHandler(async (req, res) => {
  const { upcoming, club_id } = req.query;
  const params = [];
  let where = 'WHERE 1=1';
  if (upcoming === 'true') where += ' AND e.event_date >= NOW()';
  if (club_id) { where += ' AND e.club_id = ?'; params.push(club_id); }

  const [rows] = await pool.query(
    `SELECT e.*, c.name AS club_name,
            (SELECT COUNT(*) FROM event_registrations r
             WHERE r.event_id = e.id AND r.status <> 'cancelled') AS registered_count
     FROM events e
     LEFT JOIN clubs c ON c.id = e.club_id
     ${where}
     ORDER BY e.event_date ASC`,
    params
  );
  res.json(new ApiResponse(200, rows));
});

const getEvent = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT e.*, c.name AS club_name,
            (SELECT COUNT(*) FROM event_registrations r
             WHERE r.event_id = e.id AND r.status <> 'cancelled') AS registered_count
     FROM events e
     LEFT JOIN clubs c ON c.id = e.club_id
     WHERE e.id = ?`,
    [req.params.id]
  );
  if (!rows.length) throw new ApiError(404, 'Event not found');
  res.json(new ApiResponse(200, rows[0]));
});

const createEvent = asyncHandler(async (req, res) => {
  const {
    club_id, title, description, venue, event_date,
    registration_deadline, capacity, banner_url,
  } = req.body;

  const [r] = await pool.query(
    `INSERT INTO events
       (club_id, title, description, venue, event_date,
        registration_deadline, capacity, banner_url, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      club_id || null, title, description || null, venue || null,
      event_date, registration_deadline || null, capacity || null,
      banner_url || null, req.user.id,
    ]
  );
  res.status(201).json(new ApiResponse(201, { id: r.insertId }, 'Event created'));
});

const updateEvent = asyncHandler(async (req, res) => {
  const {
    title, description, venue, event_date,
    registration_deadline, capacity, banner_url,
  } = req.body;
  const [r] = await pool.query(
    `UPDATE events SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       venue = COALESCE(?, venue),
       event_date = COALESCE(?, event_date),
       registration_deadline = COALESCE(?, registration_deadline),
       capacity = COALESCE(?, capacity),
       banner_url = COALESCE(?, banner_url)
     WHERE id = ?`,
    [title, description, venue, event_date, registration_deadline, capacity, banner_url, req.params.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Event not found');
  res.json(new ApiResponse(200, null, 'Event updated'));
});

const deleteEvent = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Event not found');
  res.json(new ApiResponse(200, null, 'Event deleted'));
});

const registerForEvent = asyncHandler(async (req, res) => {
  const eventId = req.params.id;

  const [events] = await pool.query(
    'SELECT id, capacity, registration_deadline FROM events WHERE id = ?',
    [eventId]
  );
  if (!events.length) throw new ApiError(404, 'Event not found');
  const event = events[0];

  if (event.registration_deadline && new Date(event.registration_deadline) < new Date())
    throw new ApiError(400, 'Registration deadline passed');

  if (event.capacity) {
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM event_registrations
       WHERE event_id = ? AND status <> 'cancelled'`,
      [eventId]
    );
    if (count >= event.capacity) throw new ApiError(400, 'Event is full');
  }

  try {
    await pool.query(
      `INSERT INTO event_registrations (event_id, student_id) VALUES (?, ?)`,
      [eventId, req.user.id]
    );
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'Already registered');
    throw e;
  }
  res.status(201).json(new ApiResponse(201, null, 'Registered for event'));
});

const cancelRegistration = asyncHandler(async (req, res) => {
  const [r] = await pool.query(
    `UPDATE event_registrations SET status = 'cancelled'
     WHERE event_id = ? AND student_id = ? AND status = 'registered'`,
    [req.params.id, req.user.id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Registration not found');
  res.json(new ApiResponse(200, null, 'Registration cancelled'));
});

const listRegistrations = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.email, s.department, s.year, r.status, r.registered_at
     FROM event_registrations r
     JOIN students s ON s.id = r.student_id
     WHERE r.event_id = ?
     ORDER BY r.registered_at ASC`,
    [req.params.id]
  );
  res.json(new ApiResponse(200, rows));
});

module.exports = {
  listEvents, getEvent, createEvent, updateEvent, deleteEvent,
  registerForEvent, cancelRegistration, listRegistrations,
};