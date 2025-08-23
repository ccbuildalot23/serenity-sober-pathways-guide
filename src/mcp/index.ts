/**
 * MCP (Model Context Protocol) Integration Module
 * Manages external service connections through MCP interfaces
 */

import { MCPClient } from './client';
import { MCPAuthManager } from './auth';
import { MCPDataTransformer } from './transformer';
import { MCPErrorHandler } from './error-handler';
import { MCPConnectionPool } from './connection-pool';
import type { MCPConfig, MCPResponse, MCPRequest } from './types';
import logger from '../services/loggerService';

export class MCPIntegration {
  private client: MCPClient;
  private authManager: MCPAuthManager;
  private transformer: MCPDataTransformer;
  private errorHandler: MCPErrorHandler;
  private connectionPool: MCPConnectionPool;

  constructor(config: MCPConfig) {
    this.authManager = new MCPAuthManager(config.auth);
    this.transformer = new MCPDataTransformer(config.transformers);
    this.errorHandler = new MCPErrorHandler(config.errorHandling);
    this.connectionPool = new MCPConnectionPool(config.pooling);
    this.client = new MCPClient(config, {
      authManager: this.authManager,
      errorHandler: this.errorHandler,
      connectionPool: this.connectionPool,
    });
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverName: string): Promise<void> {
    try {
      const connection = await this.connectionPool.acquire(serverName);
      await this.authManager.authenticate(serverName);
      logger.debug(`Connected to MCP server: ${serverName}`, { component: 'index' });
    } catch (error) {
      await this.errorHandler.handle(error, 'connect', { serverName });
    }
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool<T = any>(
    serverName: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<MCPResponse<T>> {
    try {
      // Validate input
      this.validateRequest({ serverName, toolName, args });

      // Transform request data
      const transformedArgs = await this.transformer.transformRequest(args, toolName);

      // Execute with retry logic
      const response = await this.errorHandler.withRetry(async () => {
        return await this.client.executeTool(serverName, toolName, transformedArgs);
      });

      // Transform response data
      const transformedResponse = await this.transformer.transformResponse(
        response,
        toolName
      );

      return {
        success: true,
        data: transformedResponse,
        metadata: {
          serverName,
          toolName,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.errorHandler.createErrorResponse(error, {
        serverName,
        toolName,
      });
    }
  }

  /**
   * Access a resource from an MCP server
   */
  async accessResource<T = any>(
    serverName: string,
    uri: string
  ): Promise<MCPResponse<T>> {
    try {
      // Validate URI
      this.validateResourceURI(uri);

      // Access with caching
      const cached = await this.getCachedResource(serverName, uri);
      if (cached) {
        return cached;
      }

      const response = await this.errorHandler.withRetry(async () => {
        return await this.client.accessResource(serverName, uri);
      });

      // Cache successful responses
      await this.cacheResource(serverName, uri, response);

      return {
        success: true,
        data: response,
        metadata: {
          serverName,
          uri,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.errorHandler.createErrorResponse(error, {
        serverName,
        uri,
      });
    }
  }

  /**
   * List available tools from an MCP server
   */
  async listTools(serverName: string): Promise<MCPResponse<string[]>> {
    try {
      const tools = await this.client.listTools(serverName);
      return {
        success: true,
        data: tools,
        metadata: {
          serverName,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.errorHandler.createErrorResponse(error, { serverName });
    }
  }

  /**
   * Batch execute multiple operations
   */
  async batchExecute(
    operations: MCPRequest[]
  ): Promise<MCPResponse<any[]>> {
    try {
      const results = await Promise.allSettled(
        operations.map((op) =>
          this.executeTool(op.serverName, op.toolName, op.args)
        )
      );

      const data = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason,
            operation: operations[index],
          };
        }
      });

      return {
        success: true,
        data,
        metadata: {
          totalOperations: operations.length,
          successful: results.filter((r) => r.status === 'fulfilled').length,
          failed: results.filter((r) => r.status === 'rejected').length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.errorHandler.createErrorResponse(error, { operations });
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverName: string): Promise<void> {
    try {
      await this.connectionPool.release(serverName);
      logger.debug(`Disconnected from MCP server: ${serverName}`, { component: 'index' });
    } catch (error) {
      await this.errorHandler.handle(error, 'disconnect', { serverName });
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    await this.connectionPool.releaseAll();
  }

  /**
   * Get server health status
   */
  async getHealth(serverName: string): Promise<MCPResponse<any>> {
    try {
      const health = await this.client.getHealth(serverName);
      return {
        success: true,
        data: health,
        metadata: {
          serverName,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.errorHandler.createErrorResponse(error, { serverName });
    }
  }

  /**
   * Validate request parameters
   */
  private validateRequest(request: MCPRequest): void {
    if (!request.serverName) {
      throw new Error('Server name is required');
    }
    if (!request.toolName) {
      throw new Error('Tool name is required');
    }
    if (!request.args || typeof request.args !== 'object') {
      throw new Error('Arguments must be an object');
    }
  }

  /**
   * Validate resource URI
   */
  private validateResourceURI(uri: string): void {
    if (!uri) {
      throw new Error('Resource URI is required');
    }
    if (!uri.startsWith('resource://')) {
      throw new Error('Invalid resource URI format');
    }
  }

  /**
   * Get cached resource
   */
  private async getCachedResource(
    serverName: string,
    uri: string
  ): Promise<MCPResponse<any> | null> {
    // Implement caching logic
    return null;
  }

  /**
   * Cache resource
   */
  private async cacheResource(
    serverName: string,
    uri: string,
    response: any
  ): Promise<void> {
    // Implement caching logic
  }
}

// Export singleton instance
let mcpIntegration: MCPIntegration | null = null;

export function initializeMCP(config: MCPConfig): MCPIntegration {
  if (!mcpIntegration) {
    mcpIntegration = new MCPIntegration(config);
  }
  return mcpIntegration;
}

export function getMCPIntegration(): MCPIntegration {
  if (!mcpIntegration) {
    throw new Error('MCP integration not initialized');
  }
  return mcpIntegration;
}

export * from './types';
export * from './client';
export * from './auth';
export * from './transformer';
export * from './error-handler';
export * from './connection-pool';