const mongoose = require('mongoose');
const logger = require('./logger');

async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_logs', {
      serverSelectionTimeoutMS: 5000
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

// Alert Schema (real-time events)
const AlertSchema = new mongoose.Schema({
  type: { type: String, enum: ['disaster_alert','prediction_warning','volunteer_task','help_request','system'], required: true },
  severity: { type: String, enum: ['info','warning','critical'], default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  target_roles: [{ type: String, enum: ['citizen','volunteer','admin','all'] }],
  target_region: {
    latitude: Number,
    longitude: Number,
    radius_km: Number
  },
  is_read: { type: Boolean, default: false },
  read_by: [{ type: String }],
  expires_at: { type: Date },
  created_by: { type: String },
  incident_id: { type: String }
}, { timestamps: true });

// Event Log Schema (audit trail)
const EventLogSchema = new mongoose.Schema({
  event_type: { type: String, required: true },
  actor_id: { type: String },
  actor_role: { type: String },
  resource_type: { type: String },
  resource_id: { type: String },
  action: { type: String, required: true },
  description: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
  success: { type: Boolean, default: true }
}, { timestamps: true });

// Prediction Log Schema
const PredictionLogSchema = new mongoose.Schema({
  prediction_id: { type: String, required: true },
  disaster_type: { type: String, required: true },
  risk_level: { type: String, required: true },
  probability: { type: Number, required: true },
  environmental_data: {
    rainfall_mm: Number,
    wind_speed_kmh: Number,
    temperature_c: Number,
    humidity_percent: Number,
    soil_moisture: Number,
    river_level_m: Number
  },
  region_name: { type: String },
  coordinates: { latitude: Number, longitude: Number },
  model_version: { type: String, default: '1.0' },
  factors: [{ name: String, weight: Number, value: Number }]
}, { timestamps: true });

// Notification Schema
const NotificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['alert','task','update','system'], default: 'alert' },
  link: { type: String },
  is_read: { type: Boolean, default: false },
  priority: { type: String, enum: ['low','medium','high'], default: 'medium' }
}, { timestamps: true });

const Alert = mongoose.model('Alert', AlertSchema);
const EventLog = mongoose.model('EventLog', EventLogSchema);
const PredictionLog = mongoose.model('PredictionLog', PredictionLogSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = { connectMongo, Alert, EventLog, PredictionLog, Notification };
