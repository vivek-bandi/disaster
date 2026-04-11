require('dotenv').config();
const { pool, connectPostgres } = require('./postgres');
const { connectMongo, Alert } = require('./mongo');
const bcrypt = require('bcryptjs');

async function seed() {
  await connectPostgres();
  await connectMongo();
  console.log('🌱 Seeding database...');

  // Seed users
  const adminHash     = await bcrypt.hash('Admin@123', 12);
  const volunteerHash = await bcrypt.hash('Vol@123',  12);
  const citizenHash   = await bcrypt.hash('Cit@123',  12);

  await pool.query(`
    INSERT INTO users (name, email, password_hash, role, phone, is_verified)
    VALUES
      ('System Admin',      'admin@disaster.com',     $1, 'admin',     '+91-9000000001', true),
      ('Rajesh Volunteer',  'volunteer@disaster.com', $2, 'volunteer', '+91-9000000002', true),
      ('Priya Citizen',     'citizen@disaster.com',   $3, 'citizen',   '+91-9000000003', true)
    ON CONFLICT (email) DO NOTHING
  `, [adminHash, volunteerHash, citizenHash]);

  // Get user IDs
  const adminRes = await pool.query("SELECT id FROM users WHERE email = 'admin@disaster.com'");
  const volRes   = await pool.query("SELECT id FROM users WHERE email = 'volunteer@disaster.com'");
  const adminId  = adminRes.rows[0]?.id;
  const volId    = volRes.rows[0]?.id;

  // Seed volunteer profile
  if (volId) {
    await pool.query(`
      INSERT INTO volunteers (user_id, skills, availability, missions_completed, rating)
      VALUES ($1, '{Search & Rescue, First Aid, Driving}', 'available', 12, 4.8)
      ON CONFLICT (user_id) DO NOTHING
    `, [volId]);
  }

  // Seed shelters
  await pool.query(`
    INSERT INTO shelters (name, address, latitude, longitude, capacity, current_occupancy, status, facilities, contact_phone)
    VALUES
      ('Chennai Relief Center 1', 'Anna Nagar, Chennai, TN', 13.0850, 80.2101, 500, 120, 'open', '{Food,Medical,Toilets,WiFi}', '+91-44-2345-6789'),
      ('Velachery Shelter', 'Velachery, Chennai, TN', 12.9785, 80.2209, 300, 280, 'open', '{Food,Beds,Toilets}', '+91-44-2345-6790'),
      ('Tambaram Emergency Hub', 'Tambaram, Chennai, TN', 12.9249, 80.1000, 400, 0, 'open', '{Food,Medical,Beds,WiFi,Charging}', '+91-44-2345-6791'),
      ('Egmore Relief Camp', 'Egmore, Chennai, TN', 13.0732, 80.2608, 200, 195, 'full', '{Food,Beds}', '+91-44-2345-6792')
    ON CONFLICT DO NOTHING
  `);

  // Seed incidents
  if (adminId) {
    await pool.query(`
      INSERT INTO incidents (title, description, type, severity, status, latitude, longitude, location_name, reported_by, affected_count, verified)
      VALUES
        ('Flooding in Velachery',   'Heavy flooding due to cyclone Michaung. Streets submerged.',    'flood',      'critical', 'open',        12.9785, 80.2209, 'Velachery, Chennai',       $1, 5000, true),
        ('Fire at Industrial Zone', 'Chemical fire at Ambattur industrial estate. Fumes spreading.', 'fire',       'high',     'in_progress', 13.0989, 80.1647, 'Ambattur, Chennai',        $1, 200,  true),
        ('Landslide on Nilgiris',   'Roadblock due to landslide near Coonoor.',                      'landslide',  'moderate', 'open',        11.3530, 76.7959, 'Coonoor, Nilgiris',        $1, 50,   false),
        ('Drought Alert - Madurai', 'Severe water shortage reported across Madurai district.',        'drought',    'high',     'open',        9.9252,  78.1198, 'Madurai District, TN',     $1, 15000,true),
        ('Cyclone Warning - Trichy', 'Cyclone approaching coastal areas near Trichy.',               'cyclone',    'critical', 'open',        10.7905, 78.7047, 'Tiruchirappalli, TN',      $1, 8000, true)
    `, [adminId]);
  }

  // Seed resources
  await pool.query(`
    INSERT INTO resources (name, type, quantity, unit, location, status)
    VALUES
      ('Medical Supply Kit A', 'medical',       150, 'kits',   'Chennai Medical Depot',   'available'),
      ('Food Packets Batch 1', 'food',          2000,'packets','Anna Nagar Distribution', 'available'),
      ('Rescue Team Alpha',    'rescue_team',   1,   'team',   'Chennai HQ',              'available'),
      ('Emergency Vehicles',   'vehicles',      8,   'units',  'Tambaram Base',           'available'),
      ('Water Purifiers',      'equipment',     25,  'units',  'Velachery Relief Center', 'deployed'),
      ('Tents & Blankets',     'shelter_supplies',500,'sets',  'Egmore Depot',            'available')
    ON CONFLICT DO NOTHING
  `);

  // Seed predictions
  await pool.query(`
    INSERT INTO predictions (disaster_type, risk_level, probability, latitude, longitude, region_name, valid_until)
    VALUES
      ('flood',    'critical', 0.89, 12.9785, 80.2209, 'Velachery, Chennai',    NOW() + INTERVAL '24 hours'),
      ('cyclone',  'high',     0.72, 10.7905, 78.7047, 'Trichy Coast, TN',      NOW() + INTERVAL '48 hours'),
      ('fire',     'moderate', 0.45, 13.0989, 80.1647, 'Ambattur Industrial',   NOW() + INTERVAL '12 hours'),
      ('drought',  'high',     0.68, 9.9252,  78.1198, 'Madurai District, TN',  NOW() + INTERVAL '72 hours'),
      ('flood',    'low',      0.22, 13.0827, 80.2707, 'Central Chennai',       NOW() + INTERVAL '24 hours')
    ON CONFLICT DO NOTHING
  `);

  // Seed MongoDB alerts
  await Alert.insertMany([
    { type: 'disaster_alert', severity: 'critical', title: '🚨 Cyclone Michaung: Critical Flood Warning', message: 'Velachery and surrounding areas face critical flood risk. Evacuation in progress.', target_roles: ['all'], created_by: 'system' },
    { type: 'prediction_warning', severity: 'warning', title: '⚠️ High Cyclone Risk: Trichy Coast', message: 'Cyclone landfall predicted within 48 hours near Trichy coastal belt.', target_roles: ['all'], created_by: 'system' },
    { type: 'volunteer_task', severity: 'info', title: 'New Rescue Task Available', message: 'Flooding incident in Velachery requires immediate volunteer response.', target_roles: ['volunteer'], created_by: 'system' }
  ]).catch(() => {});

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo Credentials:');
  console.log('  Admin:     admin@disaster.com     / Admin@123');
  console.log('  Volunteer: volunteer@disaster.com  / Vol@123');
  console.log('  Citizen:   citizen@disaster.com    / Cit@123');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
