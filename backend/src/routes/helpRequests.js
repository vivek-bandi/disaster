const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/postgres');
const { parseLatitudeLongitude } = require('../utils/coordinates');

router.get('/', authenticate, async (req, res) => {
  const { status, type, urgency } = req.query;
  let query = `SELECT hr.*, u.name as requester_name, u.phone as requester_phone,
    v.name as volunteer_name FROM help_requests hr
    LEFT JOIN users u ON hr.requester_id = u.id
    LEFT JOIN users v ON hr.assigned_volunteer = v.id WHERE 1=1`;
  const params = [];
  if (status) { query += ` AND hr.status = $${params.length+1}`; params.push(status); }
  if (type) { query += ` AND hr.type = $${params.length+1}`; params.push(type); }
  if (urgency) { query += ` AND hr.urgency = $${params.length+1}`; params.push(urgency); }
  query += ' ORDER BY CASE hr.urgency WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, hr.created_at DESC';
  const result = await pool.query(query, params);
  res.json({ success: true, data: result.rows });
});

router.post('/', authenticate, async (req, res) => {
  const { type, description, urgency, latitude, longitude, location_name, incident_id } = req.body;
  const parsedCoordinates = parseLatitudeLongitude(latitude, longitude);
  if (parsedCoordinates.error) {
    return res.status(400).json({
      success: false,
      message: parsedCoordinates.error,
    });
  }

  const result = await pool.query(
    `INSERT INTO help_requests (requester_id, incident_id, type, description, urgency, latitude, longitude, location_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, incident_id, type, description, urgency || 'medium', parsedCoordinates.latitude, parsedCoordinates.longitude, location_name]
  );
  const io = req.app.get('io');
  io.emit('new-help-request', result.rows[0]);
  res.status(201).json({ success: true, data: result.rows[0] });
});

router.put('/:id/assign', authenticate, authorize('volunteer', 'admin'), async (req, res) => {
  const result = await pool.query(
    `UPDATE help_requests SET assigned_volunteer = $1, status = 'assigned', updated_at = NOW() WHERE id = $2 RETURNING *`,
    [req.user.id, req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
});

router.put('/:id/status', authenticate, async (req, res) => {
  const result = await pool.query(
    `UPDATE help_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [req.body.status, req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
});

module.exports = router;
