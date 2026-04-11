// routes/volunteers.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/postgres');

router.get('/', authenticate, async (req, res) => {
  const { availability, skills } = req.query;
  let query = `SELECT v.*, u.name, u.email, u.phone FROM volunteers v JOIN users u ON v.user_id = u.id WHERE 1=1`;
  const params = [];
  if (availability) { query += ` AND v.availability = $${params.length + 1}`; params.push(availability); }
  query += ' ORDER BY v.missions_completed DESC';
  const result = await pool.query(query, params);
  res.json({ success: true, data: result.rows });
});

router.get('/profile', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT v.*, u.name, u.email, u.phone FROM volunteers v JOIN users u ON v.user_id = u.id WHERE v.user_id = $1`,
    [req.user.id]
  );
  res.json({ success: true, data: result.rows[0] || null });
});

router.put('/status', authenticate, authorize('volunteer'), async (req, res) => {
  const { availability, latitude, longitude } = req.body;
  const result = await pool.query(
    `UPDATE volunteers SET availability = COALESCE($1, availability), latitude = COALESCE($2, latitude),
     longitude = COALESCE($3, longitude), updated_at = NOW() WHERE user_id = $4 RETURNING *`,
    [availability, latitude, longitude, req.user.id]
  );
  res.json({ success: true, data: result.rows[0] });
});

router.post('/accept-task/:incidentId', authenticate, authorize('volunteer'), async (req, res) => {
  const { incidentId } = req.params;
  await pool.query(`UPDATE incidents SET assigned_to = $1, status = 'assigned', updated_at = NOW() WHERE id = $2`, [req.user.id, incidentId]);
  await pool.query(`UPDATE volunteers SET availability = 'on_mission', active_mission_id = $1, updated_at = NOW() WHERE user_id = $2`, [incidentId, req.user.id]);
  res.json({ success: true, message: 'Task accepted successfully' });
});

router.post('/complete-task/:incidentId', authenticate, authorize('volunteer'), async (req, res) => {
  await pool.query(`UPDATE incidents SET status = 'resolved', updated_at = NOW() WHERE id = $1`, [req.params.incidentId]);
  await pool.query(`UPDATE volunteers SET availability = 'available', active_mission_id = NULL, missions_completed = missions_completed + 1, updated_at = NOW() WHERE user_id = $1`, [req.user.id]);
  res.json({ success: true, message: 'Task completed' });
});

module.exports = router;
