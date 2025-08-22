import fs from 'fs';
import path from 'path';
import { db } from './connection';
import logger from '@/utils/logger';

export class DatabaseMigrator {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  public async migrate(): Promise<void> {
    try {
      logger.info('Starting database migration...');

      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Get list of migration files
      const migrationFiles = this.getMigrationFiles();
      
      if (migrationFiles.length === 0) {
        logger.info('No migration files found');
        return;
      }

      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations();

      // Apply pending migrations
      for (const migrationFile of migrationFiles) {
        if (!appliedMigrations.includes(migrationFile)) {
          await this.applyMigration(migrationFile);
        } else {
          logger.debug(`Migration ${migrationFile} already applied, skipping`);
        }
      }

      logger.info('Database migration completed successfully');
    } catch (error) {
      logger.error('Database migration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  public async rollback(steps: number = 1): Promise<void> {
    try {
      logger.info(`Starting rollback of ${steps} migration(s)...`);

      const appliedMigrations = await this.getAppliedMigrations();
      const migrationsToRollback = appliedMigrations.slice(-steps);

      for (const migration of migrationsToRollback.reverse()) {
        await this.rollbackMigration(migration);
      }

      logger.info('Rollback completed successfully');
    } catch (error) {
      logger.error('Rollback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  public async initializeSchema(): Promise<void> {
    try {
      logger.info('Initializing database schema...');

      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

      await db.transaction(async (client) => {
        const statements = schemaSql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }
      });

      // Mark schema as applied
      await this.markMigrationApplied('0001_initial_schema.sql');

      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Schema initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64)
      );
    `;

    await db.query(createTableSql);
    logger.debug('Migrations table ensured');
  }

  private getMigrationFiles(): string[] {
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        fs.mkdirSync(this.migrationsPath, { recursive: true });
        return [];
      }

      return fs
        .readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();
    } catch (error) {
      logger.error('Error reading migration files', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: this.migrationsPath,
      });
      return [];
    }
  }

  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await db.query(
        'SELECT version FROM schema_migrations ORDER BY applied_at'
      );
      return result.rows.map(row => row.version);
    } catch (error) {
      logger.warn('Could not fetch applied migrations', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  private async applyMigration(migrationFile: string): Promise<void> {
    const migrationPath = path.join(this.migrationsPath, migrationFile);
    
    try {
      logger.info(`Applying migration: ${migrationFile}`);

      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
      const checksum = this.calculateChecksum(migrationSql);

      await db.transaction(async (client) => {
        // Apply the migration
        const statements = migrationSql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }

        // Record the migration
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migrationFile, checksum]
        );
      });

      logger.info(`Migration ${migrationFile} applied successfully`);
    } catch (error) {
      logger.error(`Failed to apply migration ${migrationFile}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async rollbackMigration(migrationFile: string): Promise<void> {
    const rollbackPath = path.join(
      this.migrationsPath,
      migrationFile.replace('.sql', '.rollback.sql')
    );

    try {
      if (!fs.existsSync(rollbackPath)) {
        throw new Error(`Rollback file not found: ${rollbackPath}`);
      }

      logger.info(`Rolling back migration: ${migrationFile}`);

      const rollbackSql = fs.readFileSync(rollbackPath, 'utf-8');

      await db.transaction(async (client) => {
        // Apply the rollback
        const statements = rollbackSql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }

        // Remove migration record
        await client.query(
          'DELETE FROM schema_migrations WHERE version = $1',
          [migrationFile]
        );
      });

      logger.info(`Migration ${migrationFile} rolled back successfully`);
    } catch (error) {
      logger.error(`Failed to rollback migration ${migrationFile}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async markMigrationApplied(migrationFile: string): Promise<void> {
    try {
      const checksum = this.calculateChecksum('initial_schema');
      await db.query(
        'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
        [migrationFile, checksum]
      );
    } catch (error) {
      logger.warn(`Could not mark migration ${migrationFile} as applied`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  public async getStatus(): Promise<{
    applied: string[];
    pending: string[];
    total: number;
  }> {
    const allMigrations = this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.includes(migration)
    );

    return {
      applied: appliedMigrations,
      pending: pendingMigrations,
      total: allMigrations.length,
    };
  }
}

// CLI script execution
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      migrator.initializeSchema()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'migrate':
      migrator.migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'rollback':
      const steps = parseInt(process.argv[3]) || 1;
      migrator.rollback(steps)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'status':
      migrator.getStatus()
        .then(status => {
          console.log('Migration Status:');
          console.log(`Applied: ${status.applied.length}`);
          console.log(`Pending: ${status.pending.length}`);
          console.log(`Total: ${status.total}`);
          process.exit(0);
        })
        .catch(() => process.exit(1));
      break;
    default:
      console.log('Usage: tsx migrate.ts [init|migrate|rollback|status] [steps]');
      process.exit(1);
  }
}