/**
 * MVP In-Memory Database
 * Simple database for immediate shipping
 */

const bcrypt = require('bcryptjs');

// In-memory data store
const db = {
  users: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'test-patient@serenity.com',
      password_hash: '$2a$10$APSiJwTQ.jGoiHxRHZcg/u9M8O0t.xCKG8Mb3WmmzeeruzpwNbv2m',
      name: 'Test Patient',
      role: 'patient',
      created_at: new Date()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'test-provider@serenity.com',
      password_hash: '$2a$10$APSiJwTQ.jGoiHxRHZcg/u9M8O0t.xCKG8Mb3WmmzeeruzpwNbv2m',
      name: 'Test Provider',
      role: 'provider',
      created_at: new Date()
    }
  ],
  checkins: [],
  crisis_alerts: [],
  emergency_contacts: [],
  notifications: []
};

// Simple UUID generator
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Database methods
const mvpDb = {
  // User methods
  async findUserByEmail(email) {
    return db.users.find(u => u.email === email);
  },

  async findUserById(id) {
    return db.users.find(u => u.id === id);
  },

  async createUser(userData) {
    const user = {
      id: generateId(),
      ...userData,
      created_at: new Date()
    };
    db.users.push(user);
    return user;
  },

  // Check-in methods
  async createCheckIn(userId, checkInData) {
    const today = new Date().toISOString().split('T')[0];
    
    // Update or create check-in for today
    const existingIndex = db.checkins.findIndex(
      c => c.user_id === userId && c.check_in_date === today
    );

    const checkIn = {
      id: generateId(),
      user_id: userId,
      check_in_date: today,
      ...checkInData,
      created_at: new Date()
    };

    if (existingIndex >= 0) {
      db.checkins[existingIndex] = checkIn;
    } else {
      db.checkins.push(checkIn);
    }

    return checkIn;
  },

  async getCheckIns(userId, limit = 30) {
    return db.checkins
      .filter(c => c.user_id === userId)
      .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date))
      .slice(0, limit);
  },

  // Crisis alert methods
  async createCrisisAlert(userId, alertData) {
    const alert = {
      id: generateId(),
      user_id: userId,
      severity: alertData.severity || 'high',
      ...alertData,
      is_resolved: false,
      created_at: new Date()
    };
    db.crisis_alerts.push(alert);
    return alert;
  },

  async resolveCrisisAlert(alertId, resolvedBy, notes) {
    const alert = db.crisis_alerts.find(a => a.id === alertId);
    if (alert) {
      alert.is_resolved = true;
      alert.resolved_at = new Date();
      alert.resolved_by = resolvedBy;
      alert.resolution_notes = notes;
    }
    return alert;
  },

  // Emergency contacts
  async getEmergencyContacts(userId) {
    return db.emergency_contacts.filter(c => c.user_id === userId);
  },

  async createEmergencyContact(userId, contactData) {
    const contact = {
      id: generateId(),
      user_id: userId,
      ...contactData,
      created_at: new Date()
    };
    db.emergency_contacts.push(contact);
    return contact;
  },

  // Notifications
  async createNotification(userId, notification) {
    const notif = {
      id: generateId(),
      user_id: userId,
      ...notification,
      is_read: false,
      created_at: new Date()
    };
    db.notifications.push(notif);
    return notif;
  },

  // Stats
  getStats() {
    return {
      users: db.users.length,
      checkins: db.checkins.length,
      crisis_alerts: db.crisis_alerts.length,
      notifications: db.notifications.length
    };
  }
};

module.exports = mvpDb;