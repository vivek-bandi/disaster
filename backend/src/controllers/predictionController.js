const { pool } = require('../config/postgres');
const { PredictionLog } = require('../config/mongo');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const { checkPredictionRisk } = require('./alertController');
const { parseLatitudeLongitude } = require('../utils/coordinates');

// Simplified risk calculation engine (replace with real ML model in production)
function calculateRisk(data) {
  const { rainfall_mm, wind_speed_kmh, temperature_c, humidity_percent, soil_moisture, river_level_m } = data;
  
  const risks = [];

  // Flood risk
  let floodScore = 0;
  if (rainfall_mm > 100) floodScore += 40;
  else if (rainfall_mm > 50) floodScore += 20;
  else if (rainfall_mm > 25) floodScore += 10;
  if (soil_moisture > 80) floodScore += 25;
  if (river_level_m > 5) floodScore += 35;
  risks.push({ type: 'flood', score: Math.min(floodScore, 100) });

  // Cyclone risk
  let cycloneScore = 0;
  if (wind_speed_kmh > 120) cycloneScore += 60;
  else if (wind_speed_kmh > 80) cycloneScore += 35;
  else if (wind_speed_kmh > 50) cycloneScore += 15;
  if (humidity_percent > 85) cycloneScore += 20;
  if (rainfall_mm > 50) cycloneScore += 20;
  risks.push({ type: 'cyclone', score: Math.min(cycloneScore, 100) });

  // Fire risk
  let fireScore = 0;
  if (temperature_c > 40) fireScore += 40;
  else if (temperature_c > 35) fireScore += 20;
  if (humidity_percent < 20) fireScore += 35;
  else if (humidity_percent < 35) fireScore += 15;
  if (wind_speed_kmh > 30) fireScore += 15;
  if (rainfall_mm < 5) fireScore += 10;
  risks.push({ type: 'fire', score: Math.min(fireScore, 100) });

  // Drought risk
  let droughtScore = 0;
  if (rainfall_mm < 5) droughtScore += 30;
  if (temperature_c > 38) droughtScore += 30;
  if (soil_moisture < 20) droughtScore += 40;
  risks.push({ type: 'drought', score: Math.min(droughtScore, 100) });

  return risks.map(r => ({
    ...r,
    probability: r.score / 100,
    risk_level: r.score >= 75 ? 'critical' : r.score >= 50 ? 'high' : r.score >= 25 ? 'moderate' : 'low'
  }));
}

exports.getPredictions = async (req, res) => {
  try {
    const { region, type, risk_level, limit = 20 } = req.query;
    let query = 'SELECT * FROM predictions WHERE valid_until > NOW() OR valid_until IS NULL';
    const params = [];
    let idx = 1;
    if (region) { query += ` AND region_name ILIKE $${idx++}`; params.push(`%${region}%`); }
    if (type) { query += ` AND disaster_type = $${idx++}`; params.push(type); }
    if (risk_level) { query += ` AND risk_level = $${idx++}`; params.push(risk_level); }
    query += ` ORDER BY created_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit));
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch predictions' });
  }
};

exports.createPrediction = async (req, res) => {
  try {
    const { latitude, longitude, region_name, environmental_data } = req.body;
    const parsedCoordinates = parseLatitudeLongitude(latitude, longitude);
    if (parsedCoordinates.error) {
      return res.status(400).json({ success: false, message: parsedCoordinates.error });
    }

    const risks = calculateRisk(environmental_data);

    const predictions = [];
    for (const risk of risks) {
      if (risk.score > 10) {
        const result = await pool.query(`
          INSERT INTO predictions (id, disaster_type, risk_level, probability, latitude, longitude, region_name, input_data, valid_until)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '24 hours')
          RETURNING *
        `, [uuidv4(), risk.type, risk.risk_level, risk.probability, parsedCoordinates.latitude, parsedCoordinates.longitude, region_name, JSON.stringify(environmental_data)]);

        await PredictionLog.create({
          prediction_id: result.rows[0].id,
          disaster_type: risk.type,
          risk_level: risk.risk_level,
          probability: risk.probability,
          environmental_data,
          region_name,
          coordinates: { latitude, longitude }
        });

        predictions.push(result.rows[0]);
      }
    }

    // Smart alert — only fires when probability >= 50%, with cooldown
    const io = req.app.get('io');
    for (const pred of predictions) {
      await checkPredictionRisk(io, pred);
    }

    res.status(201).json({ success: true, data: { predictions, risk_analysis: risks } });
  } catch (error) {
    logger.error('Create prediction error:', error);
    res.status(500).json({ success: false, message: 'Prediction failed' });
  }
};

exports.getRiskMap = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (region_name)
        id, disaster_type, risk_level, probability, latitude, longitude, region_name, created_at
      FROM predictions
      WHERE valid_until > NOW() OR valid_until IS NULL
      ORDER BY region_name, risk_level DESC, created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch risk map' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const riskDistribution = await pool.query(
      'SELECT risk_level, COUNT(*) as count FROM predictions GROUP BY risk_level'
    );
    const byDisasterType = await pool.query(
      'SELECT disaster_type, risk_level, COUNT(*) as count FROM predictions GROUP BY disaster_type, risk_level ORDER BY disaster_type'
    );
    res.json({
      success: true,
      data: { risk_distribution: riskDistribution.rows, by_type: byDisasterType.rows }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch prediction analytics' });
  }
};

// Additional routes files (volunteers, shelters, alerts, analytics, admin)
