const { pool }      = require('../config/postgres');
const { Alert }     = require('../config/mongo');
const logger        = require('../config/logger');

// ─────────────────────────────────────────────────────────────
// THRESHOLDS — alerts are ONLY sent when these are crossed
// ─────────────────────────────────────────────────────────────
const THRESHOLDS = {
  prediction: {
    critical: 0.75,   // probability >= 75% → send critical alert
    high:     0.50,   // probability >= 50% → send warning alert
    // below 50% → no alert sent at all
  },
  shelter_occupancy: {
    warning:  0.80,   // >= 80% full → warning
    critical: 0.95,   // >= 95% full → critical
  },
  incident_severity: ['critical', 'high'],  // only these severities trigger alerts
  unassigned_critical_wait_minutes: 30,     // alert if critical incident unassigned > 30 min
};

// Tracks recently sent alerts to avoid spamming the same alert repeatedly
// Key: "type:resource_id", Value: timestamp last sent
const recentlySent = new Map();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per alert type per resource

function shouldSend(key) {
  const last = recentlySent.get(key);
  if (!last) return true;
  return Date.now() - last > COOLDOWN_MS;
}
function markSent(key) {
  recentlySent.set(key, Date.now());
}

// ─────────────────────────────────────────────────────────────
// ALERT SENDER — deduplicates and emits via Socket.IO
// ─────────────────────────────────────────────────────────────
async function sendAlert(io, { type, severity, title, message, data, target_roles, incident_id }) {
  try {
    const alert = await Alert.create({
      type, severity, title, message, data,
      target_roles: target_roles || ['all'],
      incident_id,
      created_by: 'system',
    });
    io.emit('new-alert', {
      _id: alert._id, type, severity, title, message, data,
      createdAt: alert.createdAt,
    });
    logger.info(`Alert sent [${severity}]: ${title}`);
    return alert;
  } catch (err) {
    logger.error('Failed to send alert:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// CHECK 1: New incident reported
// Called from incidentController after creation
// ─────────────────────────────────────────────────────────────
async function checkNewIncident(io, incident) {
  // Only alert for high or critical
  if (!THRESHOLDS.incident_severity.includes(incident.severity)) return;

  const key = `incident:${incident.id}`;
  if (!shouldSend(key)) return;
  markSent(key);

  await sendAlert(io, {
    type:        'disaster_alert',
    severity:    incident.severity === 'critical' ? 'critical' : 'warning',
    title:       `${incident.severity === 'critical' ? '🚨' : '⚠️'} ${incident.severity.toUpperCase()} Incident: ${incident.title}`,
    message:     `A ${incident.severity} ${incident.type} has been reported at ${incident.location_name || 'unknown location'}. ${incident.affected_count > 0 ? incident.affected_count.toLocaleString() + ' people affected.' : ''}`.trim(),
    target_roles: ['volunteer', 'admin'],
    incident_id: incident.id,
    data:        { incident_id: incident.id, type: incident.type, severity: incident.severity, location: incident.location_name },
  });
}

// ─────────────────────────────────────────────────────────────
// CHECK 2: Prediction risk threshold
// Called from predictionController after analysis
// ─────────────────────────────────────────────────────────────
async function checkPredictionRisk(io, prediction) {
  const prob = parseFloat(prediction.probability);

  if (prob < THRESHOLDS.prediction.high) {
    // Below 50% — no alert needed
    logger.info(`Prediction for ${prediction.region_name}: ${(prob*100).toFixed(0)}% — below threshold, no alert`);
    return;
  }

  const severity = prob >= THRESHOLDS.prediction.critical ? 'critical' : 'warning';
  const key = `prediction:${prediction.disaster_type}:${prediction.region_name}`;
  if (!shouldSend(key)) return;
  markSent(key);

  await sendAlert(io, {
    type:        'prediction_warning',
    severity,
    title:       `${severity === 'critical' ? '🚨' : '⚠️'} ${prediction.disaster_type.charAt(0).toUpperCase() + prediction.disaster_type.slice(1)} Risk: ${prediction.region_name}`,
    message:     `${(prob*100).toFixed(0)}% probability of ${prediction.disaster_type} in ${prediction.region_name}. Risk level: ${prediction.risk_level}. Take precautionary measures.`,
    target_roles: ['all'],
    data:        { disaster_type: prediction.disaster_type, probability: prob, region_name: prediction.region_name, risk_level: prediction.risk_level },
  });
}

// ─────────────────────────────────────────────────────────────
// CHECK 3: Shelter near capacity
// Run this periodically (every 30 minutes via cron)
// ─────────────────────────────────────────────────────────────
async function checkShelterCapacity(io) {
  try {
    const result = await pool.query(
      `SELECT id, name, capacity, current_occupancy, status FROM shelters WHERE status = 'open' AND capacity > 0`
    );

    for (const shelter of result.rows) {
      const ratio = shelter.current_occupancy / shelter.capacity;

      if (ratio < THRESHOLDS.shelter_occupancy.warning) continue; // fine, no alert

      const isCritical = ratio >= THRESHOLDS.shelter_occupancy.critical;
      const key = `shelter:${shelter.id}:${isCritical ? 'critical' : 'warning'}`;
      if (!shouldSend(key)) continue;
      markSent(key);

      await sendAlert(io, {
        type:        'disaster_alert',
        severity:    isCritical ? 'critical' : 'warning',
        title:       `${isCritical ? '🚨' : '⚠️'} Shelter ${isCritical ? 'FULL' : 'Nearly Full'}: ${shelter.name}`,
        message:     `${shelter.name} is at ${(ratio*100).toFixed(0)}% capacity (${shelter.current_occupancy}/${shelter.capacity} beds). ${isCritical ? 'Redirect evacuees to other shelters immediately.' : 'Consider opening additional capacity.'}`,
        target_roles: ['volunteer', 'admin'],
        data:        { shelter_id: shelter.id, shelter_name: shelter.name, occupancy_ratio: ratio },
      });
    }
  } catch (err) {
    logger.error('Shelter capacity check error:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// CHECK 4: Critical incident unassigned for too long
// Run periodically (every 15 minutes)
// ─────────────────────────────────────────────────────────────
async function checkUnassignedCritical(io) {
  try {
    const threshold = THRESHOLDS.unassigned_critical_wait_minutes;
    const result = await pool.query(`
      SELECT id, title, type, location_name, created_at
      FROM incidents
      WHERE severity = 'critical'
        AND status = 'open'
        AND assigned_to IS NULL
        AND created_at < NOW() - INTERVAL '${threshold} minutes'
    `);

    for (const incident of result.rows) {
      const key = `unassigned:${incident.id}`;
      if (!shouldSend(key)) continue;
      markSent(key);

      await sendAlert(io, {
        type:        'disaster_alert',
        severity:    'critical',
        title:       `🚨 Unassigned Critical Incident: ${incident.title}`,
        message:     `Critical ${incident.type} incident at ${incident.location_name || 'unknown'} has been open for over ${threshold} minutes with no volunteer assigned.`,
        target_roles: ['admin'],
        incident_id: incident.id,
        data:        { incident_id: incident.id, title: incident.title },
      });
    }
  } catch (err) {
    logger.error('Unassigned incident check error:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// SCHEDULER — runs periodic checks
// Call startAlertScheduler(io) once from server.js
// ─────────────────────────────────────────────────────────────
function startAlertScheduler(io) {
  logger.info('Smart alert scheduler started');

  // Check shelter capacity every 30 minutes
  setInterval(() => checkShelterCapacity(io), 30 * 60 * 1000);

  // Check unassigned critical incidents every 15 minutes
  setInterval(() => checkUnassignedCritical(io), 15 * 60 * 1000);

  // Initial run after 2 minutes (let server fully start first)
  setTimeout(() => {
    checkShelterCapacity(io);
    checkUnassignedCritical(io);
  }, 2 * 60 * 1000);
}

module.exports = {
  checkNewIncident,
  checkPredictionRisk,
  checkShelterCapacity,
  checkUnassignedCritical,
  startAlertScheduler,
};
