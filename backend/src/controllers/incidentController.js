const { pool } = require('../config/postgres');
const { Alert, EventLog } = require('../config/mongo');
const logger = require('../config/logger');
const { checkNewIncident } = require('./alertController');
const { parseLatitudeLongitude, parseCoordinate } = require('../utils/coordinates');

exports.getAllIncidents = async (req, res) => {
  try {
    const { status, type, severity, limit = 50, offset = 0, lat, lng, radius } = req.query;
    const parsedLimit = Number.parseInt(limit, 10);
    const parsedOffset = Number.parseInt(offset, 10);
    
    let query = `
      SELECT i.*, u.name as reporter_name, v.name as assignee_name
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN users v ON i.assigned_to = v.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { query += ` AND i.status = $${idx++}`; params.push(status); }
    if (type) { query += ` AND i.type = $${idx++}`; params.push(type); }
    if (severity) { query += ` AND i.severity = $${idx++}`; params.push(severity); }
    if (lat && lng && radius) {
      const parsedLat = parseCoordinate(lat, -90, 90);
      const parsedLng = parseCoordinate(lng, -180, 180);
      const parsedRadius = Number(radius);
      if (parsedLat === null || parsedLng === null || !Number.isFinite(parsedRadius) || parsedRadius <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid latitude, longitude, or radius.' });
      }

      query += ` AND earth_distance(ll_to_earth($${idx++}, $${idx++}), ll_to_earth(i.latitude, i.longitude)) <= $${idx++}`;
      params.push(parsedLat, parsedLng, parsedRadius * 1000);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50, Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0);

    const result = await pool.query(query, params);
    const countResult = await pool.query(`SELECT COUNT(*) FROM incidents WHERE 1=1`);

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countResult.rows[0].count), limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    logger.error('Get incidents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch incidents' });
  }
};

exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT i.*, u.name as reporter_name, u.phone as reporter_phone,
             v.name as assignee_name, v.phone as assignee_phone
      FROM incidents i
      LEFT JOIN users u ON i.reported_by = u.id
      LEFT JOIN users v ON i.assigned_to = v.id
      WHERE i.id = $1
    `, [id]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Incident not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch incident' });
  }
};

exports.createIncident = async (req, res) => {
  try {
    const { title, description, type, severity, latitude, longitude, location_name, affected_count } = req.body;
    const images = req.files ? req.files.map(f => f.filename) : [];
    const parsedCoordinates = parseLatitudeLongitude(latitude, longitude);

    if (parsedCoordinates.error) {
      return res.status(400).json({ success: false, message: parsedCoordinates.error });
    }

    const result = await pool.query(`
      INSERT INTO incidents (title, description, type, severity, latitude, longitude, location_name, affected_count, reported_by, images)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [title, description, type, severity, parsedCoordinates.latitude, parsedCoordinates.longitude, location_name, affected_count || 0, req.user.id, images]);

    const incident = result.rows[0];

    // Smart alert — only fires for high/critical, with cooldown deduplication
    const io = req.app.get('io');
    await checkNewIncident(io, incident);

    await EventLog.create({
      event_type: 'INCIDENT_CREATED',
      actor_id: req.user.id,
      actor_role: req.user.role,
      resource_type: 'incident',
      resource_id: incident.id,
      action: 'create',
      description: `Incident reported: ${title}`
    });

    res.status(201).json({ success: true, message: 'Incident reported successfully', data: incident });
  } catch (error) {
    logger.error('Create incident error:', error);
    res.status(500).json({ success: false, message: 'Failed to create incident' });
  }
};

exports.updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, severity, assigned_to, verified, affected_count } = req.body;

    const result = await pool.query(`
      UPDATE incidents SET
        status = COALESCE($1, status),
        severity = COALESCE($2, severity),
        assigned_to = COALESCE($3, assigned_to),
        verified = COALESCE($4, verified),
        affected_count = COALESCE($5, affected_count),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [status, severity, assigned_to, verified, affected_count, id]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Incident not found' });

    const io = req.app.get('io');
    io.emit('incident-updated', result.rows[0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update incident' });
  }
};

exports.getIncidentStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        SUM(affected_count) as total_affected
      FROM incidents
    `);

    const byType = await pool.query(`
      SELECT type, COUNT(*) as count FROM incidents GROUP BY type ORDER BY count DESC
    `);

    const byRegion = await pool.query(`
      SELECT location_name, COUNT(*) as count, MAX(severity) as max_severity
      FROM incidents 
      WHERE location_name IS NOT NULL
      GROUP BY location_name
      ORDER BY count DESC LIMIT 10
    `);

    const trend = await pool.query(`
      SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
      FROM incidents
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);

    res.json({
      success: true,
      data: {
        summary: stats.rows[0],
        by_type: byType.rows,
        by_region: byRegion.rows,
        trend: trend.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};
