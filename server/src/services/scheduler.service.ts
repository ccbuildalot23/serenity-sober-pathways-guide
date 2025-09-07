import { logger } from '../utils/logger';

export const startScheduledJobs = () => {
  logger.info('Starting scheduled jobs');
  
  // Daily check-in reminders
  setInterval(() => {
    logger.info('Running daily check-in reminder job');
  }, 24 * 60 * 60 * 1000);
  
  // Medication reminders
  setInterval(() => {
    logger.info('Running medication reminder job');
  }, 4 * 60 * 60 * 1000);
};