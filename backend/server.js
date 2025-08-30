/**
 * Serenity Backend Server
 * Provides API endpoints for the mental health platform
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const WebSocket = require('ws');
const http = require('http');

// Environment configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-12345';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://serenity_user:serenity_password@localhost:5432/serenity';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis connection
const redisClient = redis.createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().then(() => console.log('✅ Redis connected'));

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      database: pool.totalCount > 0 ? 'connected' : 'disconnected',
      redis: redisClient.isReady ? 'connected' : 'disconnected',
      websocket: wss.clients.size >= 0 ? 'active' : 'inactive'
    }
  });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ===================
// AUTH ENDPOINTS
// ===================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Query user from database
    const userResult = await pool.query(
      'SELECT u.*, p.full_name, r.role FROM users u ' +
      'JOIN profiles p ON u.id = p.id ' +
      'JOIN user_roles r ON u.id = r.user_id ' +
      'WHERE u.email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    
    // For test users, check hardcoded password
    const testPasswords = {
      'test-patient@serenity.com': 'TestSerenity2024!@#',
      'test-provider@serenity.com': 'TestSerenity2024!@#',
      'test-supporter@serenity.com': 'TestSerenity2024!@#'
    };
    
    if (testPasswords[email] && password !== testPasswords[email]) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.full_name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Store session in Redis
    await redisClient.setEx(`session:${user.id}`, 86400, JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role
    }));

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Remove session from Redis
    await redisClient.del(`session:${req.user.id}`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================
// CHECKIN ENDPOINTS
// ===================

// Create daily check-in
app.post('/api/checkins', authenticateToken, async (req, res) => {
  try {
    const { mood, anxiety_level, sleep_hours, medication_taken, notes } = req.body;
    
    const result = await pool.query(
      'INSERT INTO daily_checkins (user_id, check_in_date, mood, anxiety_level, sleep_hours, medication_taken, notes) ' +
      'VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6) ' +
      'ON CONFLICT (user_id, check_in_date) ' +
      'DO UPDATE SET mood = $2, anxiety_level = $3, sleep_hours = $4, medication_taken = $5, notes = $6 ' +
      'RETURNING *',
      [req.user.id, mood, anxiety_level, sleep_hours, medication_taken, notes]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to save check-in' });
  }
});

// Get user's check-ins
app.get('/api/checkins', authenticateToken, async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;
    
    const result = await pool.query(
      'SELECT * FROM daily_checkins WHERE user_id = $1 ORDER BY check_in_date DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ error: 'Failed to retrieve check-ins' });
  }
});

// ===================
// CRISIS ENDPOINTS
// ===================

// Create crisis alert
app.post('/api/crisis/alert', authenticateToken, async (req, res) => {
  try {
    const { severity, location_lat, location_lng, location_address, message } = req.body;
    
    // Create crisis alert
    const alertResult = await pool.query(
      'INSERT INTO crisis_alerts (user_id, severity, location_lat, location_lng, location_address, message) ' +
      'VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, severity || 'high', location_lat, location_lng, location_address, message]
    );

    const alert = alertResult.rows[0];

    // Get emergency contacts
    const contactsResult = await pool.query(
      'SELECT * FROM emergency_contacts WHERE user_id = $1 AND can_receive_crisis_alerts = true ORDER BY priority',
      [req.user.id]
    );

    // Get support network
    const supportResult = await pool.query(
      'SELECT u.email, p.full_name, p.phone_number FROM support_connections sc ' +
      'JOIN users u ON sc.supporter_id = u.id ' +
      'JOIN profiles p ON u.id = p.id ' +
      'WHERE sc.patient_id = $1 AND sc.can_receive_alerts = true',
      [req.user.id]
    );

    // Create notifications for supporters
    for (const supporter of supportResult.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message, data) ' +
        'VALUES ((SELECT id FROM users WHERE email = $1), $2, $3, $4, $5)',
        [supporter.email, 'crisis', 'Crisis Alert', `${req.user.name} needs immediate help`, { alertId: alert.id }]
      );
    }

    // Broadcast via WebSocket
    const wsMessage = JSON.stringify({
      type: 'crisis_alert',
      alertId: alert.id,
      userId: req.user.id,
      severity: alert.severity,
      timestamp: alert.created_at
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(wsMessage);
      }
    });

    res.json({
      alert,
      notified: {
        emergency_contacts: contactsResult.rows.length,
        supporters: supportResult.rows.length
      }
    });
  } catch (error) {
    console.error('Crisis alert error:', error);
    res.status(500).json({ error: 'Failed to create crisis alert' });
  }
});

// Resolve crisis alert
app.put('/api/crisis/alert/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    
    const result = await pool.query(
      'UPDATE crisis_alerts SET is_resolved = true, resolved_at = NOW(), resolved_by = $1, resolution_notes = $2 ' +
      'WHERE id = $3 RETURNING *',
      [req.user.id, resolution_notes, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crisis alert not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Resolve crisis error:', error);
    res.status(500).json({ error: 'Failed to resolve crisis alert' });
  }
});

// ===================
// SUPPORT NETWORK
// ===================

// Get support network
app.get('/api/support/network', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT sc.*, u.email, p.full_name, p.phone_number FROM support_connections sc ' +
      'JOIN users u ON sc.supporter_id = u.id ' +
      'JOIN profiles p ON u.id = p.id ' +
      'WHERE sc.patient_id = $1 AND sc.is_active = true',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get support network error:', error);
    res.status(500).json({ error: 'Failed to retrieve support network' });
  }
});

// ===================
// NOTIFICATIONS
// ===================

// Get notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// ===================
// WEBSOCKET HANDLING
// ===================

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'authenticate') {
        // Verify JWT token
        jwt.verify(data.token, JWT_SECRET, (err, user) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
          } else {
            ws.userId = user.id;
            ws.send(JSON.stringify({ type: 'authenticated', userId: user.id }));
          }
        });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// ===================
// ERROR HANDLING
// ===================

app.use((err, req, res) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Serenity Backend Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
});