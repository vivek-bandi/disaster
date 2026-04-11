const { Pool } = require('pg');
const logger = require('./logger');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'disaster_db',
      user: process.env.POSTGRES_USER || 'disaster_user',
      password: process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL error', err);
});

async function connectPostgres() {
  const client = await pool.connect();
  logger.info('PostgreSQL connected successfully');
  client.release();
  await runMigrations();
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen','volunteer','admin')),
        phone VARCHAR(20),
        address TEXT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Incidents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(100) NOT NULL CHECK (type IN ('flood','earthquake','fire','cyclone','landslide','drought','tsunami','other')),
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low','moderate','high','critical')),
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','resolved','closed')),
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        location_name VARCHAR(500),
        reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        images TEXT[],
        affected_count INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Volunteers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS volunteers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        skills TEXT[],
        availability VARCHAR(50) DEFAULT 'available' CHECK (availability IN ('available','busy','unavailable','on_mission')),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        active_mission_id UUID,
        missions_completed INTEGER DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 5.0,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);

    // Shelters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shelters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(500) NOT NULL,
        address TEXT NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        capacity INTEGER NOT NULL,
        current_occupancy INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open','full','closed','reserved')),
        facilities TEXT[],
        contact_phone VARCHAR(20),
        contact_email VARCHAR(255),
        managed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Resources table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(500) NOT NULL,
        type VARCHAR(100) NOT NULL CHECK (type IN ('medical','food','rescue_team','vehicles','equipment','shelter_supplies')),
        quantity INTEGER NOT NULL DEFAULT 0,
        unit VARCHAR(50),
        location VARCHAR(500),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available','deployed','depleted','maintenance')),
        assigned_incident UUID REFERENCES incidents(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Help requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS help_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
        incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
        type VARCHAR(100) NOT NULL CHECK (type IN ('food','medical','evacuation','shelter','water','rescue','other')),
        description TEXT NOT NULL,
        urgency VARCHAR(50) DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','critical')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','fulfilled','cancelled')),
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        location_name VARCHAR(500),
        assigned_volunteer UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Predictions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        disaster_type VARCHAR(100) NOT NULL,
        risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('low','moderate','high','critical')),
        probability DECIMAL(5,4) NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        region_name VARCHAR(500),
        input_data JSONB,
        valid_from TIMESTAMPTZ DEFAULT NOW(),
        valid_until TIMESTAMPTZ,
        created_by VARCHAR(50) DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(latitude, longitude);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shelters_status ON shelters(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_volunteers_availability ON volunteers(availability);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_predictions_risk ON predictions(risk_level, disaster_type);`);

    await client.query('COMMIT');
    logger.info('Database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, connectPostgres };
