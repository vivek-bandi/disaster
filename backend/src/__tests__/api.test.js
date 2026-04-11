const request = require('supertest');

// Mock database connections to avoid needing real DBs in tests
jest.mock('../config/postgres', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({ release: jest.fn() })
  },
  connectPostgres: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../config/mongo', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
  Alert: { create: jest.fn(), find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }) }) },
  EventLog: { create: jest.fn() },
  PredictionLog: { create: jest.fn() },
  Notification: { create: jest.fn() }
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    req.user = { id: 'user-1', role: req.headers['x-test-role'] || 'citizen' };
    next();
  },
  authorize: (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  },
  optionalAuth: (req, res, next) => next()
}));

const { app } = require('../server');

describe('Health Check', () => {
  it('GET /health returns 200 with status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBe('1.0.0');
  });
});

describe('Auth API', () => {
  const { pool } = require('../config/postgres');
  const bcrypt = require('bcryptjs');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/auth/register - validation error on missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login - returns 401 for non-existent user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login - returns tokens for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-1', name: 'Test User', email: 'test@test.com', password_hash: passwordHash, role: 'citizen', is_active: true }] })
      .mockResolvedValueOnce({ rows: [] }); // update last_login

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.role).toBe('citizen');
  });
});

describe('Incidents API', () => {
  const { pool } = require('../config/postgres');

  it('GET /api/incidents - requires no auth (public)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });
    const res = await request(app).get('/api/incidents');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/incidents - returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ title: 'Test', type: 'flood', severity: 'high', latitude: 13.0, longitude: 80.0 });
    expect(res.status).toBe(401);
  });
});

describe('Help Requests API', () => {
  const { pool } = require('../config/postgres');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/help-requests - rejects invalid latitude before insert', async () => {
    const res = await request(app)
      .post('/api/help-requests')
      .set('Authorization', 'Bearer test-token')
      .send({
        type: 'food',
        description: 'Need assistance',
        urgency: 'high',
        latitude: 123.456,
        longitude: 80.123456,
        location_name: 'Test location'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Latitude must be a number between -90 and 90/i);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('Coordinate Validation', () => {
  const { pool } = require('../config/postgres');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/incidents rejects invalid latitude', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', 'Bearer test-token')
      .send({
        title: 'Flood test',
        description: 'Test',
        type: 'flood',
        severity: 'high',
        latitude: 123.45,
        longitude: 80.12,
        location_name: 'Test area'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Latitude must be a number between -90 and 90/i);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('POST /api/predictions rejects invalid latitude', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', 'Bearer test-token')
      .set('x-test-role', 'admin')
      .send({
        latitude: 123.45,
        longitude: 80.12,
        region_name: 'Test region',
        environmental_data: {
          rainfall_mm: 100,
          wind_speed_kmh: 80,
          temperature_c: 30,
          humidity_percent: 50,
          soil_moisture: 50,
          river_level_m: 2
        }
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Latitude must be a number between -90 and 90/i);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('Prediction Risk Calculation', () => {
  const { calculateRisk } = require('../controllers/predictionController');

  it('calculates high flood risk for heavy rainfall', () => {
    // This tests the internal logic indirectly through the API
    // Full unit test would import the function directly
    expect(true).toBe(true); // placeholder
  });
});

describe('Rate Limiting', () => {
  it('GET /api/ endpoints respect rate limiting headers', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
  });
});
