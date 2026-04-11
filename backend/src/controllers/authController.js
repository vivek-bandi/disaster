const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/postgres');
const { EventLog } = require('../config/mongo');
const logger = require('../config/logger');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'citizen', phone, address } = req.body;

    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role, phone, address]
    );

    const user = result.rows[0];

    // Create volunteer profile if registering as volunteer
    if (role === 'volunteer') {
      await pool.query(
        'INSERT INTO volunteers (user_id) VALUES ($1)',
        [user.id]
      );
    }

    await EventLog.create({
      event_type: 'USER_REGISTERED',
      actor_id: user.id,
      actor_role: role,
      resource_type: 'user',
      resource_id: user.id,
      action: 'register',
      description: `New ${role} registered: ${email}`,
      ip_address: req.ip
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    logger.info(`User registered: ${email} as ${role}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    await EventLog.create({
      event_type: 'USER_LOGIN',
      actor_id: user.id,
      actor_role: user.role,
      resource_type: 'user',
      resource_id: user.id,
      action: 'login',
      description: `User logged in: ${email}`,
      ip_address: req.ip
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await pool.query('SELECT id, role FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);

    if (!result.rows[0]) return res.status(401).json({ success: false, message: 'User not found' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(result.rows[0].id, result.rows[0].role);
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, address, latitude, longitude, avatar_url, is_verified, last_login, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};
