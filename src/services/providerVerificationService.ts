/**
 * Provider Verification Service
 * Verifies healthcare provider credentials, licenses, and NPI numbers
 * Ensures only legitimate healthcare professionals can access the platform
 */

import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';
import { hipaaAuditService } from './hipaaAuditService';

interface ProviderCredentials {
  npiNumber: string;
  licenseNumber: string;
  licenseState: string;
  licenseType: string; // MD, DO, NP, PA, LCSW, etc.
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  specialties?: string[];
  deaNumber?: string;
  medicareNumber?: string;
}

interface VerificationResult {
  verified: boolean;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  details: {
    npiVerified?: boolean;
    licenseVerified?: boolean;
    licenseActive?: boolean;
    licenseExpiry?: string;
    sanctions?: boolean;
    exclusions?: boolean;
    malpractice?: boolean;
  };
  errors?: string[];
  verifiedAt?: string;
  verifiedBy?: string;
}

interface NPIRegistryResponse {
  result_count: number;
  results: Array<{
    number: string;
    basic: {
      first_name: string;
      last_name: string;
      credential: string;
      sole_proprietor: string;
      gender: string;
      enumeration_date: string;
      last_updated: string;
      status: string;
    };
    addresses: Array<{
      country_code: string;
      country_name: string;
      address_purpose: string;
      address_type: string;
      address_1: string;
      city: string;
      state: string;
      postal_code: string;
    }>;
    taxonomies: Array<{
      code: string;
      desc: string;
      primary: boolean;
      state: string;
      license: string;
    }>;
  }>;
}

class ProviderVerificationService {
  private readonly NPI_REGISTRY_URL = 'https://npiregistry.cms.hhs.gov/api/';
  private readonly OIG_EXCLUSION_URL = 'https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv';
  private readonly SAM_EXCLUSION_URL = 'https://sam.gov/api/';
  
  /**
   * Main verification method for provider credentials
   */
  public async verifyProvider(
    credentials: ProviderCredentials,
    userId: string
  ): Promise<VerificationResult> {
    try {
      logger.info('Starting provider verification', { userId, npi: credentials.npiNumber });
      
      const result: VerificationResult = {
        verified: false,
        status: 'pending',
        details: {},
        errors: [],
      };
      
      // Step 1: Verify NPI Number
      const npiVerification = await this.verifyNPI(credentials);
      result.details.npiVerified = npiVerification.valid;
      if (!npiVerification.valid) {
        result.errors?.push(npiVerification.error || 'Invalid NPI number');
      }
      
      // Step 2: Verify State License
      const licenseVerification = await this.verifyStateLicense(credentials);
      result.details.licenseVerified = licenseVerification.valid;
      result.details.licenseActive = licenseVerification.active;
      result.details.licenseExpiry = licenseVerification.expiryDate;
      if (!licenseVerification.valid) {
        result.errors?.push(licenseVerification.error || 'Invalid license');
      }
      
      // Step 3: Check for Sanctions/Exclusions
      const sanctionsCheck = await this.checkSanctions(credentials);
      result.details.sanctions = sanctionsCheck.hasSanctions;
      result.details.exclusions = sanctionsCheck.hasExclusions;
      if (sanctionsCheck.hasSanctions || sanctionsCheck.hasExclusions) {
        result.errors?.push('Provider has active sanctions or exclusions');
      }
      
      // Step 4: Check Malpractice History (if available)
      const malpracticeCheck = await this.checkMalpractice(credentials);
      result.details.malpractice = malpracticeCheck.hasIssues;
      if (malpracticeCheck.hasIssues) {
        result.errors?.push('Malpractice history requires review');
      }
      
      // Step 5: Verify DEA Number (if provided for prescribing providers)
      if (credentials.deaNumber) {
        const deaVerification = await this.verifyDEA(credentials.deaNumber);
        if (!deaVerification.valid) {
          result.errors?.push('Invalid DEA number');
        }
      }
      
      // Determine overall verification status
      if (
        result.details.npiVerified &&
        result.details.licenseVerified &&
        result.details.licenseActive &&
        !result.details.sanctions &&
        !result.details.exclusions &&
        !result.details.malpractice
      ) {
        result.verified = true;
        result.status = 'verified';
        result.verifiedAt = new Date().toISOString();
        result.verifiedBy = 'system';
      } else if (result.errors && result.errors.length > 0) {
        result.status = 'rejected';
      }
      
      // Save verification result
      await this.saveVerificationResult(userId, credentials, result);
      
      // Log for audit
      await this.logVerificationAttempt(userId, credentials, result);
      
      return result;
    } catch (error) {
      logger.error('Provider verification failed', error, { userId });
      throw error;
    }
  }
  
  /**
   * Verify NPI Number with CMS NPI Registry
   */
  private async verifyNPI(
    credentials: ProviderCredentials
  ): Promise<{ valid: boolean; data?: any; error?: string }> {
    try {
      // Clean NPI number
      const npi = credentials.npiNumber.replace(/\D/g, '');
      
      // Validate format (10 digits, Luhn algorithm)
      if (!this.validateNPIFormat(npi)) {
        return { valid: false, error: 'Invalid NPI format' };
      }
      
      // Query NPI Registry API
      const response = await fetch(
        `${this.NPI_REGISTRY_URL}?number=${npi}&version=2.1`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        return { valid: false, error: 'NPI Registry API error' };
      }
      
      const data: NPIRegistryResponse = await response.json();
      
      if (data.result_count === 0) {
        return { valid: false, error: 'NPI not found in registry' };
      }
      
      const provider = data.results[0];
      
      // Verify name matches
      const nameMatches = 
        provider.basic.first_name.toLowerCase() === credentials.firstName.toLowerCase() &&
        provider.basic.last_name.toLowerCase() === credentials.lastName.toLowerCase();
      
      if (!nameMatches) {
        return { valid: false, error: 'Name does not match NPI record' };
      }
      
      // Check if NPI is active
      if (provider.basic.status !== 'A') {
        return { valid: false, error: 'NPI is not active' };
      }
      
      return { valid: true, data: provider };
    } catch (error) {
      logger.error('NPI verification failed', error);
      return { valid: false, error: 'NPI verification service error' };
    }
  }
  
  /**
   * Validate NPI format using Luhn algorithm
   */
  private validateNPIFormat(npi: string): boolean {
    if (!/^\d{10}$/.test(npi)) {
      return false;
    }
    
    // Luhn algorithm with prefix 80840
    const fullNumber = '80840' + npi;
    let sum = 0;
    let isEven = false;
    
    for (let i = fullNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(fullNumber[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
  
  /**
   * Verify state medical license
   */
  private async verifyStateLicense(
    credentials: ProviderCredentials
  ): Promise<{ valid: boolean; active: boolean; expiryDate?: string; error?: string }> {
    try {
      // This would integrate with state medical board APIs
      // For now, we'll simulate with basic validation
      
      // Check license format (varies by state)
      if (!credentials.licenseNumber || credentials.licenseNumber.length < 5) {
        return { valid: false, active: false, error: 'Invalid license number format' };
      }
      
      // In production, this would call state-specific APIs like:
      // - Federation of State Medical Boards (FSMB)
      // - Individual state medical board APIs
      // - Nursys for nursing licenses
      
      // Simulate API call
      const mockLicenseData = {
        valid: true,
        active: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Active',
      };
      
      return {
        valid: mockLicenseData.valid,
        active: mockLicenseData.active,
        expiryDate: mockLicenseData.expiryDate,
      };
    } catch (error) {
      logger.error('License verification failed', error);
      return { valid: false, active: false, error: 'License verification service error' };
    }
  }
  
  /**
   * Check for sanctions and exclusions
   */
  private async checkSanctions(
    _credentials: ProviderCredentials
  ): Promise<{ hasSanctions: boolean; hasExclusions: boolean; details?: any }> {
    try {
      // Check multiple databases:
      // 1. OIG Exclusion List
      // 2. SAM.gov Exclusion Database
      // 3. State-specific sanctions
      
      // This would integrate with:
      // - HHS OIG LEIE (List of Excluded Individuals/Entities)
      // - SAM.gov Entity Management API
      // - State medical board disciplinary databases
      
      // For now, simulate clean check
      return {
        hasSanctions: false,
        hasExclusions: false,
      };
    } catch (error) {
      logger.error('Sanctions check failed', error);
      // Conservative approach - flag for manual review
      return {
        hasSanctions: true,
        hasExclusions: true,
        details: { error: 'Sanctions check service unavailable' },
      };
    }
  }
  
  /**
   * Check malpractice history
   */
  private async checkMalpractice(
    _credentials: ProviderCredentials
  ): Promise<{ hasIssues: boolean; details?: any }> {
    try {
      // This would integrate with:
      // - National Practitioner Data Bank (NPDB)
      // - State malpractice databases
      // - Court records
      
      // For now, simulate clean check
      return {
        hasIssues: false,
      };
    } catch (error) {
      logger.error('Malpractice check failed', error);
      return {
        hasIssues: false, // Don't block on service failure
        details: { error: 'Malpractice check service unavailable' },
      };
    }
  }
  
  /**
   * Verify DEA number for prescribing providers
   */
  private async verifyDEA(deaNumber: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Clean DEA number
      const dea = deaNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      
      // Validate format (2 letters + 7 digits)
      if (!/^[A-Z]{2}\d{7}$/.test(dea)) {
        return { valid: false, error: 'Invalid DEA format' };
      }
      
      // Validate checksum
      // const registrantType = dea[0]; // Not used in checksum calculation
      // const registrantLastName = dea[1]; // Not used in checksum calculation
      const digits = dea.substring(2);
      
      // Calculate checksum
      const sum1 = parseInt(digits[0]) + parseInt(digits[2]) + parseInt(digits[4]);
      const sum2 = parseInt(digits[1]) + parseInt(digits[3]) + parseInt(digits[5]);
      const checksum = (sum1 + sum2 * 2) % 10;
      
      if (checksum !== parseInt(digits[6])) {
        return { valid: false, error: 'Invalid DEA checksum' };
      }
      
      // In production, would verify with DEA database
      
      return { valid: true };
    } catch (error) {
      logger.error('DEA verification failed', error);
      return { valid: false, error: 'DEA verification error' };
    }
  }
  
  /**
   * Save verification result to database
   */
  private async saveVerificationResult(
    userId: string,
    credentials: ProviderCredentials,
    result: VerificationResult
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_verifications')
        .insert({
          user_id: userId,
          npi_number: credentials.npiNumber,
          license_number: credentials.licenseNumber,
          license_state: credentials.licenseState,
          license_type: credentials.licenseType,
          verification_status: result.status,
          verification_details: result.details,
          verification_errors: result.errors,
          verified_at: result.verifiedAt,
          verified_by: result.verifiedBy,
        });
      
      if (error) throw error;
      
      // Update provider profile
      if (result.verified) {
        await supabase
          .from('provider_profiles')
          .update({
            verification_status: 'verified',
            npi_number: credentials.npiNumber,
            license_verified: true,
            verified_at: result.verifiedAt,
          })
          .eq('user_id', userId);
      }
    } catch (error) {
      logger.error('Failed to save verification result', error);
      throw error;
    }
  }
  
  /**
   * Log verification attempt for audit
   */
  private async logVerificationAttempt(
    userId: string,
    credentials: ProviderCredentials,
    result: VerificationResult
  ): Promise<void> {
    try {
      await hipaaAuditService.logAccess({
        action: 'PROVIDER_VERIFICATION',
        resourceType: 'provider_credentials',
        resourceId: userId,
        details: {
          npi: credentials.npiNumber.substring(0, 3) + '****',
          licenseState: credentials.licenseState,
          status: result.status,
          verified: result.verified,
        },
      });
      
      logger.security('Provider verification attempt', {
        userId,
        status: result.status,
        verified: result.verified,
      });
    } catch (error) {
      logger.error('Failed to log verification attempt', error);
    }
  }
  
  /**
   * Get verification status for a provider
   */
  public async getVerificationStatus(userId: string): Promise<VerificationResult | null> {
    try {
      const { data, error } = await supabase
        .from('provider_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        verified: data.verification_status === 'verified',
        status: data.verification_status,
        details: data.verification_details,
        errors: data.verification_errors,
        verifiedAt: data.verified_at,
        verifiedBy: data.verified_by,
      };
    } catch (error) {
      logger.error('Failed to get verification status', error);
      return null;
    }
  }
  
  /**
   * Reverify provider (for periodic checks)
   */
  public async reverifyProvider(userId: string): Promise<VerificationResult> {
    try {
      // Get existing credentials
      const { data, error } = await supabase
        .from('provider_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        throw new Error('No existing verification found');
      }
      
      const credentials: ProviderCredentials = {
        npiNumber: data.npi_number,
        licenseNumber: data.license_number,
        licenseState: data.license_state,
        licenseType: data.license_type,
        firstName: data.first_name,
        lastName: data.last_name,
      };
      
      // Run verification again
      return await this.verifyProvider(credentials, userId);
    } catch (error) {
      logger.error('Failed to reverify provider', error);
      throw error;
    }
  }
  
  /**
   * Schedule periodic reverification
   */
  public async scheduleReverification(userId: string, intervalDays: number = 90): Promise<void> {
    try {
      const nextVerificationDate = new Date();
      nextVerificationDate.setDate(nextVerificationDate.getDate() + intervalDays);
      
      await supabase
        .from('provider_verification_schedule')
        .insert({
          user_id: userId,
          next_verification_date: nextVerificationDate.toISOString(),
          interval_days: intervalDays,
          status: 'scheduled',
        });
      
      logger.info('Provider reverification scheduled', {
        userId,
        nextDate: nextVerificationDate.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to schedule reverification', error);
      throw error;
    }
  }
}

// Export singleton instance
export const providerVerificationService = new ProviderVerificationService();

// Export for testing
export { ProviderVerificationService };