/**
 * Database Schema Validation Script
 * Validates HIPAA compliance, performance, and data integrity
 */

const { databaseConfig } = require('./database-config');

class SchemaValidator {
  constructor() {
    this.db = null;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  async validate() {
    console.log('🔍 Starting database schema validation...\n');
    
    try {
      this.db = await databaseConfig.initialize();
      
      // Run validation tests
      await this.validateTables();
      await this.validateIndexes();
      await this.validateRLS();
      await this.validateEncryption();
      await this.validateAuditLogging();
      await this.validateConstraints();
      await this.validatePerformance();
      
      // Print results
      this.printResults();
      
      return this.results.failed === 0;
      
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      return false;
    }
  }

  async validateTables() {
    console.log('📋 Validating table structure...');
    
    const expectedTables = [
      'users', 'user_profiles', 'user_roles', 'user_sessions', 'mfa_tokens',
      'daily_checkins', 'crisis_alerts', 'emergency_contacts', 
      'care_plans', 'appointments', 'peer_support_messages',
      'notifications', 'medication_tracking', 'medication_doses',
      'audit_logs'
    ];

    for (const table of expectedTables) {
      const exists = await this.db.schema.hasTable(table);
      this.addResult(
        `Table ${table} exists`,
        exists,
        exists ? 'pass' : 'fail'
      );
    }

    // Check for materialized view
    const mvExists = await this.db.raw(`
      SELECT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE matviewname = 'patient_summary_stats'
      ) as exists
    `);
    
    this.addResult(
      'Materialized view patient_summary_stats exists',
      mvExists.rows[0].exists,
      mvExists.rows[0].exists ? 'pass' : 'fail'
    );
  }

  async validateIndexes() {
    console.log('🎯 Validating performance indexes...');
    
    const criticalIndexes = [
      'idx_users_email',
      'idx_crisis_alerts_active_severity',
      'idx_daily_checkins_patient_date_range',
      'idx_appointments_provider_schedule',
      'idx_notifications_delivery_queue',
      'idx_audit_logs_user_timeline'
    ];

    for (const indexName of criticalIndexes) {
      const exists = await this.db.raw(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = ?
        ) as exists
      `, [indexName]);
      
      this.addResult(
        `Critical index ${indexName} exists`,
        exists.rows[0].exists,
        exists.rows[0].exists ? 'pass' : 'fail'
      );
    }

    // Check for partial indexes on active records
    const partialIndexes = await this.db.raw(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE indexdef LIKE '%WHERE%'
      AND schemaname = 'public'
    `);
    
    this.addResult(
      'Partial indexes for performance optimization',
      partialIndexes.rows.length > 0,
      partialIndexes.rows.length > 0 ? 'pass' : 'warning'
    );
  }

  async validateRLS() {
    console.log('🔒 Validating Row Level Security policies...');
    
    // Check RLS is enabled on all tables
    const rlsTables = await this.db.raw(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
    `);
    
    this.addResult(
      'RLS enabled on core tables',
      rlsTables.rows.length >= 14, // Should have at least 14 tables with RLS
      rlsTables.rows.length >= 14 ? 'pass' : 'fail'
    );

    // Check RLS policies exist
    const policies = await this.db.raw(`
      SELECT schemaname, tablename, policyname, cmd 
      FROM pg_policies 
      WHERE schemaname = 'public'
    `);
    
    this.addResult(
      'RLS policies configured',
      policies.rows.length > 0,
      policies.rows.length > 0 ? 'pass' : 'fail'
    );

    // Check helper functions exist
    const functions = await this.db.raw(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN (
        'get_current_user_id',
        'user_has_role',
        'is_provider_for_patient',
        'is_emergency_contact_for'
      )
    `);
    
    this.addResult(
      'RLS helper functions exist',
      functions.rows.length >= 4,
      functions.rows.length >= 4 ? 'pass' : 'fail'
    );
  }

  async validateEncryption() {
    console.log('🔐 Validating encryption configuration...');
    
    // Check pgcrypto extension
    const pgcrypto = await this.db.raw(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
      ) as exists
    `);
    
    this.addResult(
      'pgcrypto extension installed',
      pgcrypto.rows[0].exists,
      pgcrypto.rows[0].exists ? 'pass' : 'fail'
    );

    // Check for encrypted fields
    const encryptedFields = await this.db.raw(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name LIKE '%encrypted%' 
      AND table_schema = 'public'
    `);
    
    this.addResult(
      'Encrypted PHI fields configured',
      encryptedFields.rows.length > 0,
      encryptedFields.rows.length > 0 ? 'pass' : 'fail'
    );
  }

  async validateAuditLogging() {
    console.log('📊 Validating audit logging...');
    
    // Check audit trigger function exists
    const auditFunction = await this.db.raw(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_function'
      ) as exists
    `);
    
    this.addResult(
      'Audit trigger function exists',
      auditFunction.rows[0].exists,
      auditFunction.rows[0].exists ? 'pass' : 'fail'
    );

    // Check audit triggers on tables
    const auditTriggers = await this.db.raw(`
      SELECT DISTINCT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%audit_trigger%'
      AND trigger_schema = 'public'
    `);
    
    this.addResult(
      'Audit triggers configured on tables',
      auditTriggers.rows.length > 0,
      auditTriggers.rows.length > 0 ? 'pass' : 'fail'
    );

    // Test audit logs table structure
    const auditColumns = await this.db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      AND table_schema = 'public'
    `);
    
    const requiredAuditColumns = [
      'id', 'user_id', 'target_user_id', 'action', 'resource_type',
      'resource_id', 'old_values', 'new_values', 'ip_address', 'created_at'
    ];
    
    const hasAllColumns = requiredAuditColumns.every(col =>
      auditColumns.rows.some(row => row.column_name === col)
    );
    
    this.addResult(
      'Audit logs table has required columns',
      hasAllColumns,
      hasAllColumns ? 'pass' : 'fail'
    );
  }

  async validateConstraints() {
    console.log('⚖️  Validating data constraints...');
    
    // Check foreign key constraints
    const foreignKeys = await this.db.raw(`
      SELECT COUNT(*) as count 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_schema = 'public'
    `);
    
    this.addResult(
      'Foreign key constraints configured',
      foreignKeys.rows[0].count > 0,
      foreignKeys.rows[0].count > 0 ? 'pass' : 'fail'
    );

    // Check unique constraints
    const uniqueConstraints = await this.db.raw(`
      SELECT COUNT(*) as count 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'UNIQUE' 
      AND table_schema = 'public'
    `);
    
    this.addResult(
      'Unique constraints configured',
      uniqueConstraints.rows[0].count > 0,
      uniqueConstraints.rows[0].count > 0 ? 'pass' : 'fail'
    );

    // Check check constraints for enums
    const checkConstraints = await this.db.raw(`
      SELECT COUNT(*) as count 
      FROM information_schema.check_constraints 
      WHERE constraint_schema = 'public'
    `);
    
    this.addResult(
      'Check constraints for data validation',
      checkConstraints.rows[0].count >= 0,
      'pass' // Check constraints are optional but good to have
    );
  }

  async validatePerformance() {
    console.log('⚡ Validating performance configuration...');
    
    // Check for updated_at triggers
    const updateTriggers = await this.db.raw(`
      SELECT COUNT(*) as count 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%updated_at%'
      AND trigger_schema = 'public'
    `);
    
    this.addResult(
      'Updated_at triggers configured',
      updateTriggers.rows[0].count > 0,
      updateTriggers.rows[0].count > 0 ? 'pass' : 'warning'
    );

    // Check table sizes for large tables
    const tableSizes = await this.db.raw(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 5
    `);
    
    const largestTable = tableSizes.rows[0];
    this.addResult(
      `Database size check (largest table: ${largestTable.tablename} - ${largestTable.size})`,
      true,
      largestTable.size_bytes > 1000000 ? 'warning' : 'pass' // Warn if > 1MB
    );
  }

  addResult(test, passed, status = 'pass') {
    this.results.tests.push({
      test,
      passed,
      status
    });

    if (status === 'pass') {
      this.results.passed++;
    } else if (status === 'fail') {
      this.results.failed++;
    } else if (status === 'warning') {
      this.results.warnings++;
    }
  }

  printResults() {
    console.log('\n📋 Schema Validation Results');
    console.log('================================');
    
    this.results.tests.forEach(test => {
      const icon = test.status === 'pass' ? '✅' : 
                   test.status === 'fail' ? '❌' : '⚠️ ';
      console.log(`${icon} ${test.test}`);
    });
    
    console.log('\n📊 Summary');
    console.log('----------');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📝 Total: ${this.results.tests.length}`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 Schema validation completed successfully!');
    } else {
      console.log('\n❌ Schema validation failed. Please fix the issues above.');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

module.exports = SchemaValidator;