const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, roll_no, department, year, phone } = req.body;

  const [existing] = await pool.query('SELECT id FROM students WHERE email = ?', [email]);
  if (existing.length) throw new ApiError(409, 'Email already registered');

  const hash = await hashPassword(password);
  const [result] = await pool.query(
    `INSERT INTO students (name, email, password_hash, roll_no, department, year, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email, hash, roll_no || null, department || null, year || null, phone || null]
  );

  const token = signToken({ id: result.insertId, role: 'student' });
  res.status(201).json(
    new ApiResponse(201, { id: result.insertId, name, email, role: 'student', token }, 'Registered')
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query('SELECT * FROM students WHERE email = ?', [email]);
  if (!rows.length) throw new ApiError(401, 'Invalid credentials');

  const user = rows[0];
  if (!user.is_active) throw new ApiError(403, 'Account disabled');

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  const token = signToken({ id: user.id, role: user.role });
  delete user.password_hash;
  res.json(new ApiResponse(200, { user, token }, 'Logged in'));
});

const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, email, roll_no, department, year, phone, avatar_url, role, created_at
     FROM students WHERE id = ?`,
    [req.user.id]
  );
  res.json(new ApiResponse(200, rows[0]));
});

const updateMe = asyncHandler(async (req, res) => {
  const { name, department, year, phone, avatar_url } = req.body;
  await pool.query(
    `UPDATE students SET
       name       = COALESCE(?, name),
       department = COALESCE(?, department),
       year       = COALESCE(?, year),
       phone      = COALESCE(?, phone),
       avatar_url = COALESCE(?, avatar_url)
     WHERE id = ?`,
    [name, department, year, phone, avatar_url, req.user.id]
  );
  res.json(new ApiResponse(200, null, 'Profile updated'));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const [rows] = await pool.query('SELECT password_hash FROM students WHERE id = ?', [req.user.id]);
  const ok = await comparePassword(currentPassword, rows[0].password_hash);
  if (!ok) throw new ApiError(401, 'Current password is incorrect');

  await pool.query('UPDATE students SET password_hash = ? WHERE id = ?', [
    await hashPassword(newPassword),
    req.user.id,
  ]);
  res.json(new ApiResponse(200, null, 'Password changed'));
});

module.exports = { register, login, me, updateMe, changePassword };