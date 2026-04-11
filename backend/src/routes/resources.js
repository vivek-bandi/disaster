// routes/resources.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/postgres');
const { parseLatitudeLongitude } = require('../utils/coordinates');

router.get('/', authenticate, async (req, res) => {
  const { type, status } = req.query;
  let query = 'SELECT * FROM resources WHERE 1=1';
  const params = [];
  if (type) { query += ` AND type = $${params.length + 1}`; params.push(type); }
  if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
  const result = await pool.query(query, params);
  res.json({ success: true, data: result.rows });
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, type, quantity, unit, location, latitude, longitude } = req.body;
  const hasLatitude = latitude !== undefined && latitude !== null && latitude !== '';
  const hasLongitude = longitude !== undefined && longitude !== null && longitude !== '';
  if (hasLatitude || hasLongitude) {
    const parsedCoordinates = parseLatitudeLongitude(latitude, longitude);
    if (parsedCoordinates.error) {
      return res.status(400).json({ success: false, message: parsedCoordinates.error });
    }

    const result = await pool.query(
      `INSERT INTO resources (name, type, quantity, unit, location, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, type, quantity, unit, location, parsedCoordinates.latitude, parsedCoordinates.longitude]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  }

  const result = await pool.query(
    `INSERT INTO resources (name, type, quantity, unit, location, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, type, quantity, unit, location, latitude, longitude]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

router.put('/:id', authenticate, authorize('volunteer', 'admin'), async (req, res) => {
  const { quantity, status, assigned_incident } = req.body;
  const result = await pool.query(
    `UPDATE resources SET quantity = COALESCE($1, quantity), status = COALESCE($2, status),
     assigned_incident = COALESCE($3, assigned_incident), updated_at = NOW() WHERE id = $4 RETURNING *`,
    [quantity, status, assigned_incident, req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
});

module.exports = router;
