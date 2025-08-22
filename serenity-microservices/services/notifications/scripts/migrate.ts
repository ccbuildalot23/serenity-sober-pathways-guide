import { readFileSync } from 'fs';
import { join } from 'path';
import { database } from '../src/models/database';
import { logger } from '../src/utils/logger';

async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    // Read and execute the initial schema migration
    const migrationPath = join(__dirname, '..', 'migrations', '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        await database.query(statement);
        logger.debug('Executed migration statement', { 
          statement: statement.substring(0, 100) + '...' 
        });
      } catch (error: any) {
        // Ignore errors for statements that already exist
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    logger.info('Database migrations completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}