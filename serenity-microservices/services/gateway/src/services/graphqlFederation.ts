import { ApolloServer } from 'apollo-server-express';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLSchema, GraphQLError } from 'graphql';
import { createLogger, securityLogger } from '@utils/logger';
import { loadBalancer } from './loadBalancer';
import { circuitBreakerManager } from './circuitBreaker';
import { serviceDiscovery } from './serviceDiscovery';
import { jwtAuth } from '@middleware/auth';
import { rateLimitBypass } from '@middleware/rateLimiter';
import { monitoringService } from './monitoring';
import { GraphQLFederationConfig } from '@types/index';
import config from '@config/index';
import { Express, Request, Response } from 'express';

const logger = createLogger('GraphQLFederation');

/**
 * Enhanced RemoteGraphQLDataSource with load balancing and circuit breaker
 */
class EnhancedRemoteGraphQLDataSource extends RemoteGraphQLDataSource {
  private serviceName: string;

  constructor(serviceName: string, url?: string) {
    super({ url: url || 'http://placeholder' });
    this.serviceName = serviceName;
  }

  willSendRequest({ request, context }: any) {
    // Add authentication headers
    if (context.req?.user) {
      request.http.headers.set('x-user-id', context.req.user.id);
      request.http.headers.set('x-user-role', context.req.user.role);
    }

    // Add request tracking
    if (context.req?.request_id) {
      request.http.headers.set('x-request-id', context.req.request_id);
    }

    // Add API key if present
    if (context.req?.api_key) {
      request.http.headers.set('x-api-key-id', context.req.api_key.id);
    }
  }

  async process({ request, context }: any) {
    try {
      // Use load balancer to select instance
      const instance = loadBalancer.selectInstance(this.serviceName);
      
      if (!instance) {
        throw new GraphQLError(`No healthy instances available for service: ${this.serviceName}`, {
          extensions: {
            code: 'SERVICE_UNAVAILABLE',
            service: this.serviceName
          }
        });
      }

      // Update URL with selected instance
      request.http.url = `http://${instance.address}:${instance.port}/graphql`;

      // Execute request through circuit breaker
      const startTime = Date.now();
      
      const result = await circuitBreakerManager.execute(
        this.serviceName,
        async () => {
          return super.process({ request, context });
        },
        async () => {
          // Fallback response
          return {
            data: null,
            errors: [new GraphQLError('Service temporarily unavailable', {
              extensions: {
                code: 'SERVICE_FALLBACK',
                service: this.serviceName
              }
            })]
          };
        }
      );

      const duration = Date.now() - startTime;

      // Record metrics
      monitoringService.recordServiceResponseTime(this.serviceName, instance.id, duration);
      loadBalancer.recordResponseTime(this.serviceName, instance.id, duration);

      // Release connection
      loadBalancer.releaseConnection(this.serviceName, instance.id);

      return result;

    } catch (error) {
      logger.error(`GraphQL request error for service ${this.serviceName}:`, error);
      
      // Record error metrics
      monitoringService.recordCircuitBreakerRequest(this.serviceName, 'failure');

      throw new GraphQLError(`Service error: ${this.serviceName}`, {
        extensions: {
          code: 'SERVICE_ERROR',
          service: this.serviceName,
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}

/**
 * GraphQL Federation Service
 */
export class GraphQLFederationService {
  private gateway: ApolloGateway | null = null;
  private server: ApolloServer | null = null;
  private federationConfig: GraphQLFederationConfig;

  constructor(federationConfig: GraphQLFederationConfig) {
    this.federationConfig = federationConfig;
  }

  /**
   * Initialize GraphQL Gateway
   */
  async initialize(): Promise<ApolloGateway> {
    try {
      logger.info('Initializing GraphQL Federation Gateway...');

      // Build service list with dynamic URLs
      const serviceList = await this.buildServiceList();

      this.gateway = new ApolloGateway({
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: serviceList,
        }),
        buildService: ({ url, name }) => {
          return new EnhancedRemoteGraphQLDataSource(name, url);
        },
        debug: config.server.environment !== 'production',
        serviceHealthCheck: true,
        experimental_pollInterval: 30000, // Poll for schema changes every 30 seconds
      });

      // Handle gateway events
      this.gateway.onSchemaLoadOrUpdate((result) => {
        if (result.isNewSchema) {
          logger.info('GraphQL schema updated', {
            schema_hash: result.schema ? this.hashSchema(result.schema) : 'unknown'
          });
        }
      });

      await this.gateway.load();
      
      logger.info('GraphQL Federation Gateway initialized successfully');
      return this.gateway;

    } catch (error) {
      logger.error('Failed to initialize GraphQL Federation Gateway:', error);
      throw error;
    }
  }

  /**
   * Create Apollo Server
   */
  async createServer(app: Express): Promise<ApolloServer> {
    try {
      if (!this.gateway) {
        await this.initialize();
      }

      this.server = new ApolloServer({
        gateway: this.gateway!,
        context: ({ req, res }: { req: Request; res: Response }) => {
          return {
            req,
            res,
            user: req.user,
            api_key: req.api_key,
            request_id: req.request_id
          };
        },
        introspection: this.federationConfig.introspection,
        debug: config.server.environment !== 'production',
        formatError: (error) => this.formatGraphQLError(error),
        formatResponse: (response, { request, context }) => {
          // Log GraphQL operations
          this.logGraphQLOperation(request, context, response);
          return response;
        },
        plugins: [
          {
            requestDidStart() {
              return {
                didResolveOperation(requestContext) {
                  // Track GraphQL operations
                  const operationName = requestContext.request.operationName;
                  const operationType = requestContext.operation?.operation;
                  
                  logger.debug('GraphQL operation started', {
                    request_id: requestContext.context.request_id,
                    operation_name: operationName,
                    operation_type: operationType,
                    user_id: requestContext.context.user?.id
                  });
                },
                didEncounterErrors(requestContext) {
                  // Log GraphQL errors
                  securityLogger.warn('GraphQL errors encountered', {
                    request_id: requestContext.context.request_id,
                    errors: requestContext.errors?.map(e => ({
                      message: e.message,
                      code: e.extensions?.code,
                      path: e.path
                    })),
                    operation_name: requestContext.request.operationName,
                    user_id: requestContext.context.user?.id
                  });
                }
              };
            }
          }
        ]
      });

      await this.server.start();

      // Apply middleware and mount GraphQL endpoint
      app.use(
        config.graphql?.path || '/graphql',
        rateLimitBypass,
        jwtAuth,
        this.server.getMiddleware({
          path: config.graphql?.path || '/graphql',
          cors: this.federationConfig.cors ? {
            origin: config.security.cors.origin,
            credentials: config.security.cors.credentials
          } : false
        })
      );

      // Add GraphQL Playground if enabled
      if (this.federationConfig.playground && config.server.environment !== 'production') {
        app.get('/playground', (req, res) => {
          res.redirect(`${config.graphql?.path || '/graphql'}`);
        });
      }

      logger.info(`GraphQL Federation Server started at ${config.graphql?.path || '/graphql'}`);
      return this.server;

    } catch (error) {
      logger.error('Failed to create GraphQL Federation Server:', error);
      throw error;
    }
  }

  /**
   * Build service list with health checking
   */
  private async buildServiceList(): Promise<Array<{ name: string; url: string }>> {
    const serviceList: Array<{ name: string; url: string }> = [];

    for (const service of this.federationConfig.services) {
      try {
        // Check if service is available
        if (!serviceDiscovery.isServiceAvailable(service.name)) {
          logger.warn(`Service ${service.name} is not available, skipping GraphQL federation`);
          continue;
        }

        // Get healthy instance
        const instance = loadBalancer.selectInstance(service.name);
        if (!instance) {
          logger.warn(`No healthy instances for service ${service.name}, skipping GraphQL federation`);
          continue;
        }

        const serviceUrl = service.url || `http://${instance.address}:${instance.port}/graphql`;
        
        // Validate GraphQL endpoint
        if (await this.validateGraphQLEndpoint(serviceUrl)) {
          serviceList.push({
            name: service.name,
            url: serviceUrl
          });
          
          logger.info(`Added service to GraphQL federation: ${service.name} at ${serviceUrl}`);
        } else {
          logger.warn(`GraphQL endpoint validation failed for service: ${service.name} at ${serviceUrl}`);
        }

      } catch (error) {
        logger.error(`Error adding service ${service.name} to federation:`, error);
      }
    }

    if (serviceList.length === 0) {
      throw new Error('No services available for GraphQL federation');
    }

    return serviceList;
  }

  /**
   * Validate GraphQL endpoint
   */
  private async validateGraphQLEndpoint(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'query { __schema { queryType { name } } }'
        }),
        timeout: 5000
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.data && result.data.__schema;

    } catch (error) {
      logger.error(`GraphQL endpoint validation failed for ${url}:`, error);
      return false;
    }
  }

  /**
   * Format GraphQL errors
   */
  private formatGraphQLError(error: GraphQLError): any {
    // Log error for monitoring
    logger.error('GraphQL error:', {
      message: error.message,
      path: error.path,
      code: error.extensions?.code,
      service: error.extensions?.service
    });

    // Don't expose internal errors in production
    if (config.server.environment === 'production') {
      if (error.extensions?.code === 'INTERNAL_ERROR') {
        return new GraphQLError('Internal server error', {
          extensions: {
            code: 'INTERNAL_ERROR'
          }
        });
      }
    }

    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: error.extensions?.code || 'UNKNOWN_ERROR',
        service: error.extensions?.service,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Log GraphQL operations
   */
  private logGraphQLOperation(request: any, context: any, response: any): void {
    const operationName = request.operationName;
    const operationType = request.query?.match(/^\s*(query|mutation|subscription)/i)?.[1];
    const hasErrors = response.errors && response.errors.length > 0;

    logger.info('GraphQL operation completed', {
      request_id: context.request_id,
      operation_name: operationName,
      operation_type: operationType,
      user_id: context.user?.id,
      has_errors: hasErrors,
      error_count: hasErrors ? response.errors.length : 0
    });

    // Track GraphQL metrics
    monitoringService.recordGatewayRequest(
      'graphql',
      'federation',
      hasErrors ? 400 : 200,
      Date.now() - context.req.start_time
    );
  }

  /**
   * Hash schema for change detection
   */
  private hashSchema(schema: GraphQLSchema): string {
    const crypto = require('crypto');
    const schemaString = schema.toString();
    return crypto.createHash('md5').update(schemaString).digest('hex');
  }

  /**
   * Health check for GraphQL Gateway
   */
  getHealthStatus(): Record<string, any> {
    return {
      gateway_initialized: !!this.gateway,
      server_started: !!this.server,
      federated_services: this.federationConfig.services.map(service => ({
        name: service.name,
        url: service.url,
        available: serviceDiscovery.isServiceAvailable(service.name)
      })),
      config: {
        introspection: this.federationConfig.introspection,
        playground: this.federationConfig.playground,
        cors: this.federationConfig.cors
      }
    };
  }

  /**
   * Refresh schema from services
   */
  async refreshSchema(): Promise<void> {
    try {
      if (!this.gateway) {
        throw new Error('Gateway not initialized');
      }

      logger.info('Refreshing GraphQL federation schema...');
      
      // This would trigger schema refresh in newer versions of Apollo Gateway
      // For now, we log that a refresh was requested
      logger.info('Schema refresh requested - gateway will poll for changes automatically');

    } catch (error) {
      logger.error('Error refreshing GraphQL schema:', error);
      throw error;
    }
  }

  /**
   * Get federation statistics
   */
  getStats(): Record<string, any> {
    return {
      total_services: this.federationConfig.services.length,
      healthy_services: this.federationConfig.services.filter(service => 
        serviceDiscovery.isServiceAvailable(service.name)
      ).length,
      gateway_status: this.gateway ? 'initialized' : 'not_initialized',
      server_status: this.server ? 'started' : 'not_started'
    };
  }

  /**
   * Shutdown GraphQL Federation
   */
  async shutdown(): Promise<void> {
    try {
      if (this.server) {
        await this.server.stop();
        this.server = null;
      }

      if (this.gateway) {
        await this.gateway.stop();
        this.gateway = null;
      }

      logger.info('GraphQL Federation Service shutdown complete');
    } catch (error) {
      logger.error('Error shutting down GraphQL Federation:', error);
    }
  }
}

// Export service instance
let graphqlFederationService: GraphQLFederationService | null = null;

export const initializeGraphQLFederation = (app: Express): Promise<ApolloServer | null> => {
  if (!config.graphql) {
    logger.info('GraphQL federation not enabled');
    return Promise.resolve(null);
  }

  graphqlFederationService = new GraphQLFederationService(config.graphql);
  return graphqlFederationService.createServer(app);
};

export const getGraphQLFederationService = (): GraphQLFederationService | null => {
  return graphqlFederationService;
};