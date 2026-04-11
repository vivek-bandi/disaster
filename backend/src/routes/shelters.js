// routes/shelters.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { pool } = require('../config/postgres');
const { parseLatitudeLongitude } = require('../utils/coordinates');

router.get('/', optionalAuth, async (req, res) => {
  const { status, lat, lng, radius = 50 } = req.query;
  let query = 'SELECT * FROM shelters WHERE 1=1';
  const params = [];
  if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
  query += ' ORDER BY status, (capacity - current_occupancy) DESC';
  const result = await pool.query(query, params);
  res.json({ success: true, data: result.rows });
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, address, latitude, longitude, capacity, facilities, contact_phone, contact_email } = req.body;
  const parsedCoordinates = parseLatitudeLongitude(latitude, longitude);
  if (parsedCoordinates.error) {
    return res.status(400).json({ success: false, message: parsedCoordinates.error });
  }

  const result = await pool.query(
    `INSERT INTO shelters (name, address, latitude, longitude, capacity, facilities, contact_phone, contact_email, managed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [name, address, parsedCoordinates.latitude, parsedCoordinates.longitude, capacity, facilities, contact_phone, contact_email, req.user.id]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

router.put('/:id/occupancy', authenticate, authorize('volunteer', 'admin'), async (req, res) => {
  const { current_occupancy, status } = req.body;
  const result = await pool.query(
    `UPDATE shelters SET current_occupancy = COALESCE($1, current_occupancy), status = COALESCE($2, status), updated_at = NOW() WHERE id = $3 RETURNING *`,
    [current_occupancy, status, req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
});

module.exports = router;
