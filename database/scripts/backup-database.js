/**
 * Database Backup Script
 * HIPAA-compliant database backup with encryption and audit logging
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { databaseConfig } = require('./database-config');

class DatabaseBackup {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.s3Bucket = process.env.BACKUP_S3_BUCKET;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Create a comprehensive database backup
   */
  async createBackup(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `serenity-db-backup-${this.environment}-${timestamp}`;
    
    console.log(`🗄️  Starting database backup: ${backupName}`);
    
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();
      
      // Create database dump
      const dumpFile = await this.createDatabaseDump(backupName);
      
      // Create metadata file
      const metadataFile = await this.createBackupMetadata(backupName);
      
      // Encrypt backup if encryption key provided
      let finalBackupFile = dumpFile;
      if (this.encryptionKey) {
        finalBackupFile = await this.encryptBackup(dumpFile, backupName);
      }
      
      // Compress backup
      const compressedFile = await this.compressBackup(finalBackupFile, backupName);
      
      // Upload to S3 if configured
      if (this.s3Bucket) {
        await this.uploadToS3(compressedFile, backupName);
      }
      
      // Verify backup integrity
      await this.verifyBackup(compressedFile);
      
      // Log backup creation
      await this.logBackup(backupName, {
        file: compressedFile,
        encrypted: !!this.encryptionKey,
        compressed: true,
        uploaded: !!this.s3Bucket,
        size: (await fs.stat(compressedFile)).size
      });
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      console.log(`✅ Backup completed successfully: ${compressedFile}`);
      return compressedFile;
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      await this.logBackupFailure(backupName, error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFile, options = {}) {
    console.log(`🔄 Restoring database from backup: ${backupFile}`);
    
    if (this.environment === 'production' && !options.confirmRestore) {
      throw new Error('Production restore requires explicit confirmation');
    }
    
    try {
      // Verify backup file exists
      await fs.access(backupFile);
      
      // Decompress if needed
      let restoreFile = backupFile;
      if (backupFile.endsWith('.gz')) {
        restoreFile = await this.decompressBackup(backupFile);
      }
      
      // Decrypt if needed
      if (this.encryptionKey && restoreFile.endsWith('.enc')) {
        restoreFile = await this.decryptBackup(restoreFile);
      }
      
      // Create pre-restore backup
      if (options.createPreRestoreBackup !== false) {
        await this.createBackup({ type: 'pre-restore' });
      }
      
      // Restore database
      await this.restoreFromDump(restoreFile);
      
      // Verify restoration
      await this.verifyRestoration();
      
      console.log('✅ Database restored successfully');
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  /**
   * Create PostgreSQL database dump
   */
  async createDatabaseDump(backupName) {
    const dumpFile = path.join(this.backupDir, `${backupName}.sql`);
    
    const dbConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    };
    
    // Set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const dumpCommand = [
      'pg_dump',
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.username}`,
      '--verbose',
      '--clean',
      '--if-exists',
      '--create',
      '--format=custom',
      '--compress=9',
      '--no-password',
      `--file=${dumpFile}`,
      dbConfig.database
    ].join(' ');
    
    console.log('📦 Creating database dump...');
    
    const { stdout, stderr } = await execAsync(dumpCommand, { env });
    
    if (stderr && !stderr.includes('NOTICE:')) {
      console.warn('⚠️  pg_dump warnings:', stderr);
    }
    
    // Verify dump file was created
    const stats = await fs.stat(dumpFile);
    if (stats.size === 0) {
      throw new Error('Database dump file is empty');
    }
    
    console.log(`✅ Database dump created: ${dumpFile} (${Math.round(stats.size / 1024 / 1024)}MB)`);
    return dumpFile;
  }

  /**
   * Create backup metadata
   */
  async createBackupMetadata(backupName) {
    const metadataFile = path.join(this.backupDir, `${backupName}.metadata.json`);
    
    const db = await databaseConfig.initialize();
    
    // Gather database statistics
    const tableStats = await db.raw(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(schemaname||'.'||tablename) DESC
    `);
    
    const dbSize = await db.raw(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    
    const version = await db.raw('SELECT version()');
    
    const metadata = {
      backup_name: backupName,
      created_at: new Date().toISOString(),
      environment: this.environment,
      database: {
        name: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        version: version.rows[0].version,
        size: dbSize.rows[0].size
      },
      tables: tableStats.rows,
      backup_info: {
        type: 'full',
        method: 'pg_dump',
        compressed: true,
        encrypted: !!this.encryptionKey
      }
    };
    
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    console.log(`✅ Backup metadata created: ${metadataFile}`);
    return metadataFile;
  }

  /**
   * Encrypt backup file
   */
  async encryptBackup(inputFile, backupName) {
    if (!this.encryptionKey) {
      return inputFile;
    }
    
    const encryptedFile = path.join(this.backupDir, `${backupName}.sql.enc`);
    
    // Use OpenSSL for encryption (AES-256-CBC)
    const encryptCommand = [
      'openssl enc -aes-256-cbc',
      '-salt',
      '-pbkdf2',
      `-pass pass:${this.encryptionKey}`,
      `-in ${inputFile}`,
      `-out ${encryptedFile}`
    ].join(' ');
    
    console.log('🔐 Encrypting backup...');
    
    await execAsync(encryptCommand);
    
    // Remove unencrypted file
    await fs.unlink(inputFile);
    
    console.log(`✅ Backup encrypted: ${encryptedFile}`);
    return encryptedFile;
  }

  /**
   * Compress backup file
   */
  async compressBackup(inputFile, backupName) {
    const compressedFile = `${inputFile}.gz`;
    
    const compressCommand = `gzip "${inputFile}"`;
    
    console.log('🗜️  Compressing backup...');
    
    await execAsync(compressCommand);
    
    const stats = await fs.stat(compressedFile);
    console.log(`✅ Backup compressed: ${compressedFile} (${Math.round(stats.size / 1024 / 1024)}MB)`);
    
    return compressedFile;
  }

  /**
   * Upload backup to S3
   */
  async uploadToS3(backupFile, backupName) {
    if (!this.s3Bucket) {
      return;
    }
    
    const s3Key = `database-backups/${this.environment}/${backupName}/${path.basename(backupFile)}`;
    
    const uploadCommand = [
      'aws s3 cp',
      `"${backupFile}"`,
      `"s3://${this.s3Bucket}/${s3Key}"`,
      '--storage-class STANDARD_IA', // Infrequent access for backups
      '--server-side-encryption AES256'
    ].join(' ');
    
    console.log('☁️  Uploading backup to S3...');
    
    await execAsync(uploadCommand);
    
    console.log(`✅ Backup uploaded to S3: s3://${this.s3Bucket}/${s3Key}`);
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFile) {
    console.log('🔍 Verifying backup integrity...');
    
    // Check file exists and has content
    const stats = await fs.stat(backupFile);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }
    
    // Test decompression if compressed
    if (backupFile.endsWith('.gz')) {
      const testCommand = `gzip -t "${backupFile}"`;
      await execAsync(testCommand);
    }
    
    console.log('✅ Backup integrity verified');
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Cleanup old backups
   */
  async cleanupOldBackups() {
    console.log('🧹 Cleaning up old backups...');
    
    const files = await fs.readdir(this.backupDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate && file.includes('backup')) {
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`🗑️  Deleted old backup: ${file}`);
      }
    }
    
    console.log(`✅ Cleaned up ${deletedCount} old backup files`);
  }

  /**
   * Log backup activity
   */
  async logBackup(backupName, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      backup_name: backupName,
      status: 'success',
      details
    };
    
    // Log to audit system if database is available
    try {
      const db = databaseConfig.getDatabase();
      await db('audit_logs').insert({
        id: require('uuid').v4(),
        action: 'database_backup',
        resource_type: 'database',
        status: 'success',
        additional_info: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.warn('Could not log to audit table:', error.message);
    }
    
    console.log('📝 Backup logged successfully');
  }

  /**
   * Log backup failure
   */
  async logBackupFailure(backupName, error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      backup_name: backupName,
      status: 'failure',
      error: error.message,
      stack: error.stack
    };
    
    // Try to log failure
    try {
      const db = databaseConfig.getDatabase();
      await db('audit_logs').insert({
        id: require('uuid').v4(),
        action: 'database_backup',
        resource_type: 'database',
        status: 'failure',
        error_message: error.message,
        additional_info: JSON.stringify(logEntry)
      });
    } catch (logError) {
      console.warn('Could not log failure to audit table:', logError.message);
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.includes('backup') && (file.endsWith('.gz') || file.endsWith('.sql'))) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            age_days: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }
      
      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
}

// CLI interface
if (require.main === module) {
  const backup = new DatabaseBackup();
  
  const command = process.argv[2];
  const backupFile = process.argv[3];
  
  switch (command) {
    case 'create':
      backup.createBackup().then(file => {
        console.log(`Backup created: ${file}`);
        process.exit(0);
      }).catch(error => {
        console.error('Backup failed:', error);
        process.exit(1);
      });
      break;
      
    case 'restore':
      if (!backupFile) {
        console.error('Please provide backup file path');
        process.exit(1);
      }
      backup.restoreBackup(backupFile).then(() => {
        console.log('Restore completed');
        process.exit(0);
      }).catch(error => {
        console.error('Restore failed:', error);
        process.exit(1);
      });
      break;
      
    case 'list':
      backup.listBackups().then(backups => {
        console.log('Available backups:');
        backups.forEach(b => {
          console.log(`  ${b.name} (${Math.round(b.size / 1024 / 1024)}MB, ${b.age_days} days old)`);
        });
        process.exit(0);
      }).catch(error => {
        console.error('Failed to list backups:', error);
        process.exit(1);
      });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node backup-database.js create    # Create new backup');
      console.log('  node backup-database.js restore <file>  # Restore from backup');
      console.log('  node backup-database.js list      # List available backups');
      process.exit(1);
  }
}

module.exports = DatabaseBackup;