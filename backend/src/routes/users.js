// routes/users.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { pool } = require('../config/postgres');
const bcrypt = require('bcryptjs');

router.get('/me', authenticate, async (req, res) => {
  const result = await pool.query(`SELECT id,name,email,role,phone,address,latitude,longitude,avatar_url,is_verified,last_login,created_at FROM users WHERE id=$1`, [req.user.id]);
  res.json({ success: true, data: result.rows[0] });
});

router.put('/me', authenticate, async (req, res) => {
  const { name, phone, address, latitude, longitude } = req.body;
  const result = await pool.query(
    `UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone), address=COALESCE($3,address),
     latitude=COALESCE($4,latitude), longitude=COALESCE($5,longitude), updated_at=NOW() WHERE id=$6 RETURNING id,name,email,role,phone,address`,
    [name, phone, address, latitude, longitude, req.user.id]
  );
  res.json({ success: true, data: result.rows[0] });
});

router.put('/me/password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  const userRes = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const valid = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
  if (!valid) return res.status(400).json({ success: false, message: 'Current password incorrect' });
  const hash = await bcrypt.hash(new_password, 12);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  res.json({ success: true, message: 'Password updated' });
});

module.exports = router;
