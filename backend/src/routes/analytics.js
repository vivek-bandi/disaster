// routes/analytics.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/postgres');

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [incidents, volunteers, shelters, helpRequests, predictions] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='open') as open,
        COUNT(*) FILTER (WHERE status='in_progress') as in_progress,
        COUNT(*) FILTER (WHERE severity='critical') as critical,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') as last_24h
        FROM incidents`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE availability='available') as available,
        COUNT(*) FILTER (WHERE availability='on_mission') as on_mission FROM volunteers`),
      pool.query(`SELECT COUNT(*) as total, SUM(capacity) as total_capacity,
        SUM(current_occupancy) as total_occupied, COUNT(*) FILTER (WHERE status='open') as open
        FROM shelters`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='pending') as pending,
        COUNT(*) FILTER (WHERE urgency='critical') as critical FROM help_requests`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE risk_level='critical') as critical,
        COUNT(*) FILTER (WHERE risk_level='high') as high FROM predictions
        WHERE valid_until > NOW() OR valid_until IS NULL`)
    ]);

    const incidentTrend = await pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('day', created_at), 'Mon DD') as date, COUNT(*) as incidents,
        COUNT(*) FILTER (WHERE severity IN ('high','critical')) as severe
      FROM incidents WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at) ORDER BY DATE_TRUNC('day', created_at)`);

    const disasterTypes = await pool.query(`
      SELECT type, COUNT(*) as count FROM incidents GROUP BY type ORDER BY count DESC`);

    res.json({
      success: true,
      data: {
        summary: {
          incidents: incidents.rows[0],
          volunteers: volunteers.rows[0],
          shelters: shelters.rows[0],
          help_requests: helpRequests.rows[0],
          predictions: predictions.rows[0]
        },
        charts: {
          incident_trend: incidentTrend.rows,
          disaster_types: disasterTypes.rows
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Analytics fetch failed' });
  }
});

module.exports = router;
