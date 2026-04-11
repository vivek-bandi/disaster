// routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/postgres');
const { EventLog } = require('../config/mongo');

router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  const result = await pool.query(`SELECT id, name, email, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC`);
  res.json({ success: true, data: result.rows });
});

router.put('/users/:id/status', authenticate, authorize('admin'), async (req, res) => {
  const result = await pool.query(`UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, is_active`, [req.body.is_active, req.params.id]);
  res.json({ success: true, data: result.rows[0] });
});

router.get('/logs', authenticate, authorize('admin'), async (req, res) => {
  const logs = await EventLog.find().sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: logs });
});

router.get('/system-stats', authenticate, authorize('admin'), async (req, res) => {
  const [users, incidents, volunteers, shelters, resources, helpReqs] = await Promise.all([
    pool.query('SELECT COUNT(*), role FROM users GROUP BY role'),
    pool.query('SELECT COUNT(*), status FROM incidents GROUP BY status'),
    pool.query('SELECT COUNT(*), availability FROM volunteers GROUP BY availability'),
    pool.query('SELECT COUNT(*), status FROM shelters GROUP BY status'),
    pool.query('SELECT COUNT(*), type FROM resources GROUP BY type'),
    pool.query('SELECT COUNT(*), urgency FROM help_requests WHERE status=\'pending\' GROUP BY urgency')
  ]);
  res.json({ success: true, data: { users: users.rows, incidents: incidents.rows, volunteers: volunteers.rows, shelters: shelters.rows, resources: resources.rows, pending_help: helpReqs.rows } });
});

module.exports = router;
