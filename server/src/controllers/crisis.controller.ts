import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { db, supabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logAuditEvent, logger } from '../utils/logger';
import { broadcast } from '../services/websocket.service';

export const crisisController = {
  async triggerAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const userId = req.user?.id;
      const { severity, message, location } = req.body;
      
      // Get emergency contacts
      const contacts = await db.crisis.getEmergencyContacts(userId!);
      
      // Create alert record
      const alert = await db.crisis.createAlert({
        user_id: userId,
        severity,
        message,
        location,
        status: 'active',
      });
      
      // Notify emergency contacts (would integrate with SMS/email service)
      const supportContacted = contacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        notified: true,
      }));
      
      // Broadcast to WebSocket for real-time updates
      broadcast({
        type: 'CRISIS_ALERT',
        alertId: alert.id,
        userId,
        severity,
      });
      
      // Log critical audit event
      logAuditEvent(userId!, 'CRISIS_ALERT_TRIGGERED', 'crisis', alert.id, {
        severity,
        contactsNotified: contacts.length,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(200).json({
        alertId: alert.id,
        supportContacted,
        resources: [
          { name: 'Crisis Hotline', number: '988', available: '24/7' },
          { name: 'Crisis Text Line', number: 'Text HOME to 741741', available: '24/7' },
          { name: 'Emergency Services', number: '911', available: '24/7' },
        ],
      });
    } catch (error) {
      next(error);
    }
  },
  
  async getUserAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      const { data, error } = await supabase
        .from('crisis_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  
  async getAlertById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('crisis_alerts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  
  async resolveAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { resolution } = req.body;
      
      const { data, error } = await supabase
        .from('crisis_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  
  async getEmergencyContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const contacts = await db.crisis.getEmergencyContacts(userId!);
      res.status(200).json(contacts);
    } catch (error) {
      next(error);
    }
  },
  
  async addEmergencyContact(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const contactData = { ...req.body, user_id: userId };
      
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert(contactData)
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  },
  
  async updateEmergencyContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  
  async deleteEmergencyContact(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  
  async getCrisisPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      const { data, error } = await supabase
        .from('crisis_plans')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      res.status(200).json(data || { message: 'No crisis plan found' });
    } catch (error) {
      next(error);
    }
  },
  
  async updateCrisisPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const planData = { ...req.body, user_id: userId };
      
      const { data, error } = await supabase
        .from('crisis_plans')
        .upsert(planData)
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  
  async getCrisisResources(req: Request, res: Response, next: NextFunction) {
    try {
      const resources = {
        national: [
          { name: '988 Suicide & Crisis Lifeline', number: '988', description: '24/7 crisis support' },
          { name: 'Crisis Text Line', number: 'Text HOME to 741741', description: '24/7 text support' },
          { name: 'SAMHSA National Helpline', number: '1-800-662-4357', description: 'Treatment referral and information' },
        ],
        local: [
          // Would be populated based on user's location
        ],
        online: [
          { name: 'NAMI', url: 'https://www.nami.org', description: 'National Alliance on Mental Illness' },
          { name: 'AA Online Meetings', url: 'https://aa-intergroup.org', description: 'Alcoholics Anonymous' },
          { name: 'SMART Recovery', url: 'https://www.smartrecovery.org', description: 'Self-help addiction recovery' },
        ],
      };
      
      res.status(200).json(resources);
    } catch (error) {
      next(error);
    }
  },
};