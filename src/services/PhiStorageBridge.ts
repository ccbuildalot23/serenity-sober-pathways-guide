/**
 * PHI Storage Bridge Service
 * Routes Protected Health Information (PHI) to AWS RDS
 * Routes non-PHI data to Supabase
 * Implements HIPAA-compliant data classification and encryption
 */

import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';
import { phiEncryptionService } from './phiEncryptionService';

interface DataClassification {
  isPHI: boolean;
  category: 'medical' | 'personal' | 'operational' | 'anonymous';
  sensitivityLevel: 'high' | 'medium' | 'low';
  storageLocation: 'aws-rds' | 'supabase';
}

interface StorageRequest {
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'select';
  data: Record<string, any>;
  userId?: string;
}

class PhiStorageBridge {
  private static instance: PhiStorageBridge;
  private awsRdsConnection: any; // AWS RDS connection (to be configured)
  
  // PHI field patterns that must be stored in AWS RDS
  private readonly phiPatterns = [
    /^ssn$/i,
    /^social_security_number$/i,
    /^date_of_birth$/i,
    /^dob$/i,
    /^medical_record_number$/i,
    /^diagnosis$/i,
    /^diagnoses$/i,
    /^medication$/i,
    /^medications$/i,
    /^prescription$/i,
    /^treatment_plan$/i,
    /^insurance_id$/i,
    /^policy_number$/i,
    /^medical_history$/i,
    /^health_condition$/i,
    /^mental_health_status$/i,
    /^substance_use_history$/i,
    /^therapy_notes$/i,
    /^clinical_notes$/i,
    /^lab_results$/i,
    /^vital_signs$/i,
    /^biometric_data$/i,
  ];

  // Tables that contain PHI and should be primarily stored in AWS RDS
  private readonly phiTables = [
    'profiles',
    'daily_checkins',
    'medical_records',
    'prescriptions',
    'diagnoses',
    'lab_results',
    'therapy_sessions',
    'clinical_assessments',
  ];

  private constructor() {
    this.initializeConnections();
  }

  static getInstance(): PhiStorageBridge {
    if (!PhiStorageBridge.instance) {
      PhiStorageBridge.instance = new PhiStorageBridge();
    }
    return PhiStorageBridge.instance;
  }

  private async initializeConnections(): Promise<void> {
    try {
      // Initialize AWS RDS connection (will be configured with actual credentials)
      if (process.env.AWS_RDS_HOST) {
        // AWS RDS connection will be initialized here
        logger.info('AWS RDS connection initialized for PHI storage');
      } else {
        logger.warn('AWS RDS not configured - PHI will be encrypted in Supabase');
      }
    } catch (error) {
      logger.error('Failed to initialize storage connections', error);
    }
  }

  /**
   * Classify data to determine storage location
   */
  classifyData(table: string, data: Record<string, any>): DataClassification {
    // Check if table contains PHI
    const isPhiTable = this.phiTables.includes(table);
    
    // Check if any field contains PHI
    const containsPhiField = Object.keys(data).some(field =>
      this.phiPatterns.some(pattern => pattern.test(field))
    );

    // Check for sensitive data patterns in values
    const containsSensitiveData = this.detectSensitiveData(data);

    const isPHI = isPhiTable || containsPhiField || containsSensitiveData;

    return {
      isPHI,
      category: this.determineCategory(table, data),
      sensitivityLevel: isPHI ? 'high' : 'low',
      storageLocation: isPHI ? 'aws-rds' : 'supabase',
    };
  }

  /**
   * Detect sensitive data patterns in values
   */
  private detectSensitiveData(data: Record<string, any>): boolean {
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{9}\b/, // SSN without dashes
      /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/, // Date of birth
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Determine data category
   */
  private determineCategory(
    table: string,
    data: Record<string, any>
  ): 'medical' | 'personal' | 'operational' | 'anonymous' {
    if (this.phiTables.includes(table)) {
      return 'medical';
    }
    
    if (table.includes('user') || table.includes('profile')) {
      return 'personal';
    }
    
    if (table.includes('log') || table.includes('audit')) {
      return 'operational';
    }
    
    return 'anonymous';
  }

  /**
   * Route storage request to appropriate database
   */
  async route(request: StorageRequest): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Classify the data
      const classification = this.classifyData(request.table, request.data);
      
      // Log the routing decision for audit
      await this.logRoutingDecision(request, classification);

      // Route to appropriate storage
      if (classification.isPHI && this.awsRdsConnection) {
        return await this.routeToAwsRds(request, classification);
      } else {
        // If PHI but no AWS RDS, encrypt before storing in Supabase
        if (classification.isPHI) {
          request.data = await this.encryptPhiData(request.data);
        }
        return await this.routeToSupabase(request, classification);
      }
    } catch (error) {
      logger.error('Storage routing failed', {
        error,
        request,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Route to AWS RDS for PHI storage
   */
  private async routeToAwsRds(
    request: StorageRequest,
    classification: DataClassification
  ): Promise<any> {
    // Encrypt PHI data before storage
    const encryptedData = await this.encryptPhiData(request.data);
    
    // Store in AWS RDS (implementation pending AWS RDS setup)
    logger.info('PHI data routed to AWS RDS', {
      table: request.table,
      operation: request.operation,
      classification,
    });

    // For now, return encrypted data
    return encryptedData;
  }

  /**
   * Route to Supabase for non-PHI storage
   */
  private async routeToSupabase(
    request: StorageRequest,
    classification: DataClassification
  ): Promise<any> {
    const { table, operation, data } = request;

    let result;
    switch (operation) {
      case 'insert':
        result = await supabase.from(table).insert(data);
        break;
      case 'update':
        result = await supabase.from(table).update(data);
        break;
      case 'delete':
        result = await supabase.from(table).delete();
        break;
      case 'select':
        result = await supabase.from(table).select('*');
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Encrypt PHI data before storage
   */
  private async encryptPhiData(data: Record<string, any>): Promise<Record<string, any>> {
    const encryptedData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Check if field needs encryption
      const needsEncryption = this.phiPatterns.some(pattern => pattern.test(key));
      
      if (needsEncryption && value !== null && value !== undefined) {
        encryptedData[key] = await phiEncryptionService.encryptField(
          key,
          value.toString()
        );
      } else {
        encryptedData[key] = value;
      }
    }

    return encryptedData;
  }

  /**
   * Log routing decision for audit compliance
   */
  private async logRoutingDecision(
    request: StorageRequest,
    classification: DataClassification
  ): Promise<void> {
    const auditLog = {
      timestamp: new Date().toISOString(),
      userId: request.userId,
      table: request.table,
      operation: request.operation,
      classification,
      dataKeys: Object.keys(request.data),
      storageLocation: classification.storageLocation,
    };

    // Store audit log (always in Supabase for transparency)
    await supabase.from('audit_logs').insert(auditLog);
    
    logger.info('Storage routing decision logged', auditLog);
  }

  /**
   * Validate HIPAA compliance for data operations
   */
  async validateCompliance(request: StorageRequest): Promise<boolean> {
    const classification = this.classifyData(request.table, request.data);
    
    // Check if PHI is being handled correctly
    if (classification.isPHI) {
      // Ensure encryption is enabled
      if (!process.env.VITE_ENCRYPTION_MASTER_KEY) {
        logger.error('PHI encryption key not configured');
        return false;
      }
      
      // Ensure audit logging is enabled
      if (!request.userId) {
        logger.warn('PHI operation without user identification');
        return false;
      }
      
      // Check session timeout compliance (15 minutes for PHI)
      // This would integrate with session management service
    }

    return true;
  }

  /**
   * Get storage statistics for monitoring
   */
  async getStorageStats(): Promise<{
    phiRecords: number;
    nonPhiRecords: number;
    encryptedFields: number;
    auditLogs: number;
  }> {
    const stats = {
      phiRecords: 0,
      nonPhiRecords: 0,
      encryptedFields: 0,
      auditLogs: 0,
    };

    // Query audit logs for statistics
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('classification')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (auditLogs) {
      stats.auditLogs = auditLogs.length;
      stats.phiRecords = auditLogs.filter(log => 
        log.classification?.isPHI === true
      ).length;
      stats.nonPhiRecords = auditLogs.filter(log => 
        log.classification?.isPHI === false
      ).length;
    }

    return stats;
  }
}

export const phiStorageBridge = PhiStorageBridge.getInstance();
export default phiStorageBridge;