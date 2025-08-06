import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import { EnhancedSecurityAuditService } from './EnhancedSecurityAuditService';

export interface ExportRequest {
  id?: string;
  reason: string;
  format: 'json' | 'csv' | 'pdf' | 'ccd';
  dateRange?: {
    start: string;
    end: string;
  };
  categories: string[];
  requiresApproval?: boolean;
}

export interface ExportData {
  profile?: any;
  dailyCheckins?: any[];
  crisisEvents?: any[];
  auditLogs?: any[];
  assessments?: any[];
  goals?: any[];
  contacts?: any[];
  [key: string]: any;
}

/**
 * HIPAA-compliant data export service
 * Handles secure data compilation, encryption, and audit logging
 */
export class HIPAADataExportService {
  private static readonly DOWNLOAD_EXPIRY_HOURS = 48;
  
  /**
   * Create a new export request
   */
  static async createExportRequest(request: ExportRequest): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated');

      // Log the export request initiation
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'DATA_EXPORT_REQUESTED',
        details: {
          format: request.format,
          categories: request.categories,
          dateRange: request.dateRange,
          reason: request.reason
        }
      });

      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          user_id: user.id,
          request_reason: request.reason,
          export_format: request.format,
          date_range_start: request.dateRange?.start,
          date_range_end: request.dateRange?.end,
          data_categories: request.categories,
          admin_approval_required: request.requiresApproval || false,
          download_expires_at: new Date(Date.now() + this.DOWNLOAD_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Start processing the export in background
      this.processExportRequest(data.id);

      return data.id;
    } catch (error) {
      console.error('Failed to create export request:', error);
      throw error;
    }
  }

  /**
   * Process export request and compile data
   */
  private static async processExportRequest(requestId: string): Promise<void> {
    try {
      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Log processing start
      await supabase.rpc('log_export_activity', {
        request_id: requestId,
        activity_action: 'PROCESSING_STARTED'
      });

      // Compile all user data
      const categories = Array.isArray(request.data_categories) 
        ? request.data_categories.map(cat => String(cat))
        : [String(request.data_categories)].filter(Boolean);
        
      const exportData = await this.compileUserData(
        request.user_id,
        categories,
        request.date_range_start,
        request.date_range_end
      );

      // Format data based on requested format
      const formattedData = await this.formatExportData(exportData, request.export_format);

      // Encrypt the export data
      const encryptedData = await serverSideEncryption.encrypt(JSON.stringify(formattedData));

      // Calculate checksum
      const checksum = await this.calculateChecksum(formattedData);

      // Update request with completion details
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_size_bytes: new Blob([JSON.stringify(formattedData)]).size,
          checksum,
          export_metadata: {
            recordCounts: this.getRecordCounts(exportData),
            generatedAt: new Date().toISOString(),
            format: request.export_format
          }
        })
        .eq('id', requestId);

      // Log completion
      await supabase.rpc('log_export_activity', {
        request_id: requestId,
        activity_action: 'PROCESSING_COMPLETED',
        activity_details: { file_size: new Blob([JSON.stringify(formattedData)]).size }
      });

    } catch (error) {
      console.error('Failed to process export request:', error);
      
      // Update request status to failed
      await supabase
        .from('data_export_requests')
        .update({
          status: 'failed',
          export_metadata: { error: error.message }
        })
        .eq('id', requestId);

      // Log failure
      await supabase.rpc('log_export_activity', {
        request_id: requestId,
        activity_action: 'PROCESSING_FAILED',
        activity_details: { error: error.message }
      });
    }
  }

  /**
   * Compile all user data from various tables
   */
  private static async compileUserData(
    userId: string,
    categories: string[],
    startDate?: string,
    endDate?: string
  ): Promise<ExportData> {
    const exportData: ExportData = {};

    // Profile data
    if (categories.includes('profile')) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      exportData.profile = data;
    }

    // Daily check-ins
    if (categories.includes('checkins')) {
      let query = supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId);

      if (startDate) query = query.gte('checkin_date', startDate);
      if (endDate) query = query.lte('checkin_date', endDate);

      const { data } = await query;
      exportData.dailyCheckins = data || [];
    }

    // Crisis events
    if (categories.includes('crisis')) {
      let query = supabase
        .from('crisis_events')
        .select('*')
        .eq('user_id', userId);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data } = await query;
      exportData.crisisEvents = data || [];
    }

    // Audit logs
    if (categories.includes('audit')) {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId);

      if (startDate) query = query.gte('timestamp', startDate);
      if (endDate) query = query.lte('timestamp', endDate);

      const { data } = await query;
      exportData.auditLogs = data || [];
    }

    // Clinical assessments
    if (categories.includes('assessments')) {
      let query = supabase
        .from('clinical_assessments')
        .select('*')
        .eq('user_id', userId);

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data } = await query;
      exportData.assessments = data || [];
    }

    // Recovery goals
    if (categories.includes('goals')) {
      const { data: goals } = await supabase
        .from('recovery_goals')
        .select('*, goal_progress(*)')
        .eq('user_id', userId);

      exportData.goals = goals || [];
    }

    // Emergency contacts
    if (categories.includes('contacts')) {
      const { data } = await supabase
        .from('crisis_contacts')
        .select('*')
        .eq('user_id', userId);

      exportData.contacts = data || [];
    }

    return exportData;
  }

  /**
   * Format export data based on requested format
   */
  private static async formatExportData(data: ExportData, format: string): Promise<any> {
    switch (format) {
      case 'json':
        return {
          exportInfo: {
            generatedAt: new Date().toISOString(),
            format: 'json',
            dataIncluded: Object.keys(data),
            disclaimer: 'This export contains your personal health information. Handle securely and in compliance with applicable privacy laws.'
          },
          dataDictionary: this.getDataDictionary(),
          userData: data
        };

      case 'csv':
        return this.convertToCSV(data);

      case 'pdf':
        return this.formatForPDF(data);

      case 'ccd':
        return this.formatAsCCD(data);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: ExportData): string {
    let csv = 'Export Generated: ' + new Date().toISOString() + '\n\n';
    
    Object.entries(data).forEach(([category, records]) => {
      if (Array.isArray(records) && records.length > 0) {
        csv += `${category.toUpperCase()}\n`;
        const headers = Object.keys(records[0]);
        csv += headers.join(',') + '\n';
        
        records.forEach(record => {
          const values = headers.map(header => {
            const value = record[header];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          });
          csv += values.join(',') + '\n';
        });
        csv += '\n';
      }
    });
    
    return csv;
  }

  /**
   * Format data for PDF generation
   */
  private static formatForPDF(data: ExportData): any {
    return {
      title: 'Personal Health Data Export',
      generatedAt: new Date().toISOString(),
      watermark: 'CONFIDENTIAL - PERSONAL HEALTH INFORMATION',
      sections: Object.entries(data).map(([category, records]) => ({
        title: category.toUpperCase().replace(/([A-Z])/g, ' $1').trim(),
        data: records
      }))
    };
  }

  /**
   * Format as Continuity of Care Document (CCD)
   */
  private static formatAsCCD(data: ExportData): any {
    // Simplified CCD format - in production would generate full HL7 CCD XML
    return {
      documentType: 'Continuity of Care Document',
      patient: data.profile,
      assessments: data.assessments,
      carePlans: data.goals,
      disclaimer: 'This document contains protected health information.'
    };
  }

  /**
   * Get data dictionary for export
   */
  private static getDataDictionary(): Record<string, string> {
    return {
      profile: 'User profile information including recovery start date and preferences',
      dailyCheckins: 'Daily wellness check-in responses including mood, energy, and hope ratings',
      crisisEvents: 'Crisis intervention events and outcomes',
      auditLogs: 'System access and security audit logs',
      assessments: 'Clinical assessment responses and scores',
      goals: 'Recovery goals and progress tracking',
      contacts: 'Emergency and crisis support contacts'
    };
  }

  /**
   * Calculate record counts for metadata
   */
  private static getRecordCounts(data: ExportData): Record<string, number> {
    const counts: Record<string, number> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        counts[key] = value.length;
      } else if (value) {
        counts[key] = 1;
      }
    });
    return counts;
  }

  /**
   * Calculate checksum for data integrity
   */
  private static async calculateChecksum(data: any): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataArray = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get user's export requests
   */
  static async getUserExportRequests(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Download export data (logs the access)
   */
  static async downloadExport(requestId: string, downloadToken: string): Promise<any> {
    try {
      // Verify token and get request
      const { data: request, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', requestId)
        .eq('secure_download_token', downloadToken)
        .single();

      if (error || !request) {
        throw new Error('Invalid download token or request not found');
      }

      // Check if download link has expired
      if (new Date() > new Date(request.download_expires_at)) {
        throw new Error('Download link has expired');
      }

      // Log the download access
      await supabase.rpc('log_export_activity', {
        request_id: requestId,
        activity_action: 'DATA_DOWNLOADED'
      });

      // Update download timestamp
      await supabase
        .from('data_export_requests')
        .update({ downloaded_at: new Date().toISOString() })
        .eq('id', requestId);

      // In a real implementation, this would return the encrypted file
      // For now, return the request metadata
      return {
        fileName: `health_data_export_${request.export_format}.${request.export_format}`,
        fileSize: request.file_size_bytes,
        checksum: request.checksum,
        downloadUrl: `#download-${requestId}` // Placeholder
      };

    } catch (error) {
      console.error('Failed to download export:', error);
      throw error;
    }
  }
}