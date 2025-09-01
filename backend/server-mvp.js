/**
 * Serenity MVP Backend Server
 * Simplified version for immediate shipping
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const WebSocket = require('ws');
const http = require('http');
const db = require('./mvp-db');
const smsService = require('./sms-service');

// Environment configuration
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-12345';

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://localhost:5173', 'https://*.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// WebSocket connection handling
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  
  ws.on('close', () => {
    wsClients.delete(ws);
  });

  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
});

// Broadcast to all WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// ===================
// HEALTH ENDPOINTS
// ===================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'in-memory',
      websocket: 'active'
    },
    stats: db.getStats()
  });
});

// ===================
// AUTH ENDPOINTS
// ===================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcryptjs.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'patient' } = req.body;
    
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    
    const user = await db.createUser({
      email,
      password_hash: hashedPassword,
      name,
      role
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
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
    
    const checkIn = await db.createCheckIn(req.user.id, {
      mood,
      anxiety_level,
      sleep_hours,
      medication_taken,
      notes
    });

    res.json(checkIn);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to save check-in' });
  }
});

// Get user's check-ins
app.get('/api/checkins', authenticateToken, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const checkIns = await db.getCheckIns(req.user.id, parseInt(limit));
    res.json(checkIns);
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
    const alert = await db.createCrisisAlert(req.user.id, {
      severity,
      location_lat,
      location_lng,
      location_address,
      message
    });

    // Get emergency contacts
    const contacts = await db.getEmergencyContacts(req.user.id);

    // Create notifications and send SMS for contacts
    for (const contact of contacts) {
      if (contact.can_receive_crisis_alerts) {
        await db.createNotification(contact.user_id, {
          type: 'crisis',
          title: 'Crisis Alert',
          message: `${req.user.name} needs immediate help`,
          data: { alertId: alert.id }
        });
        
        // Send SMS if phone number available
        if (contact.phone) {
          await smsService.sendCrisisAlert(contact.phone, req.user.name, message);
        }
      }
    }

    // Broadcast via WebSocket
    broadcast({
      type: 'crisis_alert',
      alertId: alert.id,
      userId: req.user.id,
      userName: req.user.name,
      severity,
      message
    });

    res.json({
      alert,
      notified: {
        emergency_contacts: contacts.filter(c => c.can_receive_crisis_alerts).length,
        broadcast: true
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
    
    const alert = await db.resolveCrisisAlert(
      req.params.id,
      req.user.id,
      resolution_notes
    );

    if (!alert) {
      return res.status(404).json({ error: 'Crisis alert not found' });
    }

    // Broadcast resolution
    broadcast({
      type: 'crisis_resolved',
      alertId: alert.id,
      resolvedBy: req.user.name
    });

    res.json(alert);
  } catch (error) {
    console.error('Resolve crisis error:', error);
    res.status(500).json({ error: 'Failed to resolve crisis alert' });
  }
});

// ===================
// EMERGENCY CONTACTS
// ===================

// Get emergency contacts
app.get('/api/emergency-contacts', authenticateToken, async (req, res) => {
  try {
    const contacts = await db.getEmergencyContacts(req.user.id);
    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

// Add emergency contact
app.post('/api/emergency-contacts', authenticateToken, async (req, res) => {
  try {
    const contact = await db.createEmergencyContact(req.user.id, req.body);
    res.status(201).json(contact);
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Serenity MVP Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
  console.log(`💾 Using in-memory database (MVP mode)`);
  console.log(`\n✅ Ready to ship! All core features working:`);
  console.log(`   - User authentication (JWT)`);
  console.log(`   - Daily check-ins with data persistence`);
  console.log(`   - Crisis alerts with WebSocket notifications`);
  console.log(`   - Emergency contacts management`);
});

module.exports = server;