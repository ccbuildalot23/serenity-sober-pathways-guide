/**
 * Central agent initialization and registration
 * Manages all healthcare AI agents for the platform
 */

import { agentRegistry } from './base/AgentRegistry';
import { CrisisSupportAgent } from './CrisisSupportAgent';
import { ProgressTrackingAgent } from './ProgressTrackingAgent';
import { ClinicalDocumentationAgent } from './ClinicalDocumentationAgent';
import logger from '../services/loggerService';

/**
 * Initialize and register all agents
 */
export async function initializeAgents(): Promise<void> {
  try {
    logger.debug('Initializing healthcare AI agents...', { component: 'index' });

    // Register Crisis Support Agent
    const crisisAgent = new CrisisSupportAgent();
    await agentRegistry.registerAgent(crisisAgent);

    // Register Progress Tracking Agent
    const progressAgent = new ProgressTrackingAgent();
    await agentRegistry.registerAgent(progressAgent);

    // Register Clinical Documentation Agent
    const clinicalAgent = new ClinicalDocumentationAgent();
    await agentRegistry.registerAgent(clinicalAgent);

    logger.debug('All agents registered successfully', { component: 'index' });
    
    // Perform health check
    const healthStatus = await agentRegistry.healthCheck();
    logger.debug('Agent health check results:', healthStatus, { component: 'index' });

    // Log registry statistics
    const stats = agentRegistry.getStatistics();
    logger.debug('Agent registry statistics:', stats, { component: 'index' });
  } catch (error) {
    console.error('Failed to initialize agents:', error);
    throw error;
  }
}

/**
 * Export agent registry and agents for direct access
 */
export { agentRegistry } from './base/AgentRegistry';
export { CrisisSupportAgent } from './CrisisSupportAgent';
export { ProgressTrackingAgent } from './ProgressTrackingAgent';
export { ClinicalDocumentationAgent } from './ClinicalDocumentationAgent';