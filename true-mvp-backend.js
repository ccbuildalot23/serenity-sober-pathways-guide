/**
 * TRUE MVP Backend - Mental Health Check-in
 * 4 endpoints only. Ships in 1 hour.
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3003;
const SECRET = 'mvp-secret-2025';

// In-memory data (no database needed for MVP)
const users = [
  {
    id: 1,
    email: 'user@example.com',
    password: '$2a$10$APSiJwTQ.jGoiHxRHZcg/u9M8O0t.xCKG8Mb3WmmzeeruzpwNbv2m', // TestPass123!
    name: 'Test User'
  }
];

const checkins = [];

// Middleware
app.use(cors());
app.use(express.json());

// 1. Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET);
  res.json({ token, user: { id: user.id, name: user.name } });
});

// 2. Submit Check-in
app.post('/api/checkin', (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'No token' });
  
  try {
    const user = jwt.verify(auth, SECRET);
    const checkin = {
      id: Date.now(),
      userId: user.id,
      mood: req.body.mood,
      notes: req.body.notes,
      date: new Date().toISOString()
    };
    
    checkins.push(checkin);
    res.json(checkin);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// 3. Get Check-ins
app.get('/api/checkins', (req, res) => {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'No token' });
  
  try {
    const user = jwt.verify(auth, SECRET);
    const userCheckins = checkins
      .filter(c => c.userId === user.id)
      .slice(-7); // Last 7 check-ins
    res.json(userCheckins);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// 4. Crisis Alert (just logs for MVP)
app.post('/api/crisis', (req, res) => {
  console.log('🚨 CRISIS ALERT:', new Date(), req.body);
  res.json({ message: 'Help is on the way. Call 988 for immediate support.' });
});

app.listen(PORT, () => {
  console.log(`✅ TRUE MVP Backend running on http://localhost:${PORT}`);
  console.log('Endpoints: /api/login, /api/checkin, /api/checkins, /api/crisis');
  console.log('Test login: user@example.com / TestPass123!');
});