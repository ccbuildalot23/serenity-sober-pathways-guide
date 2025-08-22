import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@utils/logger';
import { deepClone, getNestedProperty, setNestedProperty } from '@utils/helpers';
import { TransformationConfig } from '@types/index';

const logger = createLogger('Transformation');

export interface TransformationRule {
  source: string;
  target: string;
  transform?: (value: any) => any;
  condition?: (req: Request) => boolean;
}

export interface ApiVersionConfig {
  version: string;
  deprecated?: boolean;
  sunset?: Date;
  transformations?: {
    request?: TransformationRule[];
    response?: TransformationRule[];
  };
}

/**
 * Request Transformation Middleware
 */
export const requestTransformation = (config: TransformationConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.request) {
        return next();
      }

      const originalBody = req.body;
      const originalHeaders = req.headers;
      const originalQuery = req.query;

      // Transform headers
      if (config.request.headers) {
        for (const [key, value] of Object.entries(config.request.headers)) {
          req.headers[key.toLowerCase()] = value;
        }
      }

      // Transform query parameters
      if (config.request.query) {
        for (const [key, value] of Object.entries(config.request.query)) {
          req.query[key] = value;
        }
      }

      // Transform body
      if (config.request.body && req.body) {
        req.body = transformObject(req.body, config.request.body);
      }

      logger.debug('Request transformed', {
        request_id: req.request_id,
        path: req.path,
        originalHeaders: Object.keys(originalHeaders),
        transformedHeaders: Object.keys(req.headers),
        originalQuery: Object.keys(originalQuery),
        transformedQuery: Object.keys(req.query)
      });

      next();
    } catch (error) {
      logger.error('Request transformation error:', error);
      next(error);
    }
  };
};

/**
 * Response Transformation Middleware
 */
export const responseTransformation = (config: TransformationConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.response) {
      return next();
    }

    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send
    res.send = function(body: any) {
      try {
        if (config.response?.headers) {
          for (const [key, value] of Object.entries(config.response.headers)) {
            res.setHeader(key, value);
          }
        }

        if (config.response?.body && body) {
          if (typeof body === 'string') {
            try {
              const parsedBody = JSON.parse(body);
              const transformedBody = transformObject(parsedBody, config.response.body);
              body = JSON.stringify(transformedBody);
            } catch {
              // If not JSON, leave as is
            }
          } else {
            body = transformObject(body, config.response.body);
          }
        }

        return originalSend.call(this, body);
      } catch (error) {
        logger.error('Response transformation error:', error);
        return originalSend.call(this, body);
      }
    };

    // Override res.json
    res.json = function(obj: any) {
      try {
        if (config.response?.headers) {
          for (const [key, value] of Object.entries(config.response.headers)) {
            res.setHeader(key, value);
          }
        }

        if (config.response?.body && obj) {
          obj = transformObject(obj, config.response.body);
        }

        return originalJson.call(this, obj);
      } catch (error) {
        logger.error('Response transformation error:', error);
        return originalJson.call(this, obj);
      }
    };

    next();
  };
};

/**
 * API Versioning Middleware
 */
export const apiVersioning = (versionConfigs: Map<string, ApiVersionConfig>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract version from header, query, or path
      const version = extractApiVersion(req);
      
      if (!version) {
        return res.status(400).json({
          error: {
            code: 'MISSING_API_VERSION',
            message: 'API version is required',
            supported_versions: Array.from(versionConfigs.keys()),
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }

      const versionConfig = versionConfigs.get(version);
      
      if (!versionConfig) {
        return res.status(400).json({
          error: {
            code: 'UNSUPPORTED_API_VERSION',
            message: `API version ${version} is not supported`,
            supported_versions: Array.from(versionConfigs.keys()),
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }

      // Check if version is deprecated
      if (versionConfig.deprecated) {
        res.setHeader('Warning', `299 - "API version ${version} is deprecated"`);
        
        if (versionConfig.sunset) {
          res.setHeader('Sunset', versionConfig.sunset.toISOString());
        }

        logger.warn('Deprecated API version used', {
          request_id: req.request_id,
          version,
          path: req.path,
          sunset: versionConfig.sunset
        });
      }

      // Apply version-specific transformations
      if (versionConfig.transformations) {
        if (versionConfig.transformations.request) {
          applyTransformationRules(req, versionConfig.transformations.request, 'request');
        }

        if (versionConfig.transformations.response) {
          applyResponseTransformationRules(res, versionConfig.transformations.response);
        }
      }

      // Store version info in request
      req.api_version = version;
      
      next();
    } catch (error) {
      logger.error('API versioning error:', error);
      next(error);
    }
  };
};

/**
 * Field Mapping Middleware
 */
export const fieldMapping = (mappings: Record<string, string>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body) {
        req.body = mapFields(req.body, mappings);
      }

      const originalJson = res.json;
      res.json = function(obj: any) {
        if (obj) {
          // Reverse mapping for response
          const reverseMappings: Record<string, string> = {};
          for (const [key, value] of Object.entries(mappings)) {
            reverseMappings[value] = key;
          }
          obj = mapFields(obj, reverseMappings);
        }
        return originalJson.call(this, obj);
      };

      next();
    } catch (error) {
      logger.error('Field mapping error:', error);
      next(error);
    }
  };
};

/**
 * Data Format Conversion Middleware
 */
export const dataFormatConversion = (config: {
  dateFormat?: 'iso' | 'unix' | 'custom';
  customDateFormat?: string;
  numberFormat?: 'string' | 'number';
  booleanFormat?: 'string' | 'number' | 'boolean';
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body) {
        req.body = convertDataFormats(req.body, config);
      }

      const originalJson = res.json;
      res.json = function(obj: any) {
        if (obj) {
          obj = convertDataFormats(obj, config);
        }
        return originalJson.call(this, obj);
      };

      next();
    } catch (error) {
      logger.error('Data format conversion error:', error);
      next(error);
    }
  };
};

/**
 * Response Wrapping Middleware
 */
export const responseWrapping = (config: {
  wrapData?: boolean;
  dataKey?: string;
  includeMetadata?: boolean;
  metadataFields?: string[];
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { wrapData = true, dataKey = 'data', includeMetadata = true, metadataFields = [] } = config;

    if (!wrapData) {
      return next();
    }

    const originalJson = res.json;
    res.json = function(obj: any) {
      try {
        if (obj && typeof obj === 'object' && !obj.error) {
          const wrapped: any = {};
          
          // Wrap data
          wrapped[dataKey] = obj;
          
          // Add metadata
          if (includeMetadata) {
            wrapped.metadata = {
              request_id: req.request_id,
              timestamp: new Date().toISOString(),
              api_version: req.api_version,
              ...getMetadataFields(req, res, metadataFields)
            };
          }

          return originalJson.call(this, wrapped);
        }
        
        return originalJson.call(this, obj);
      } catch (error) {
        logger.error('Response wrapping error:', error);
        return originalJson.call(this, obj);
      }
    };

    next();
  };
};

/**
 * Legacy API Support Middleware
 */
export const legacyApiSupport = (legacyMappings: Record<string, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const isLegacyClient = checkIfLegacyClient(userAgent);

      if (isLegacyClient && req.body) {
        req.body = applyLegacyTransformations(req.body, legacyMappings);
      }

      if (isLegacyClient) {
        const originalJson = res.json;
        res.json = function(obj: any) {
          if (obj) {
            obj = applyLegacyResponseTransformations(obj, legacyMappings);
          }
          return originalJson.call(this, obj);
        };
      }

      next();
    } catch (error) {
      logger.error('Legacy API support error:', error);
      next(error);
    }
  };
};

// Helper Functions

/**
 * Transform object based on transformation rules
 */
function transformObject(obj: any, transformations: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = deepClone(obj);

  if (Array.isArray(transformations)) {
    // Array of transformation rules
    for (const rule of transformations) {
      if (rule.source && rule.target) {
        const value = getNestedProperty(result, rule.source);
        if (value !== undefined) {
          const transformedValue = rule.transform ? rule.transform(value) : value;
          setNestedProperty(result, rule.target, transformedValue);
          
          // Remove source if different from target
          if (rule.source !== rule.target) {
            deleteNestedProperty(result, rule.source);
          }
        }
      }
    }
  } else {
    // Object mapping
    for (const [key, value] of Object.entries(transformations)) {
      if (result.hasOwnProperty(key)) {
        if (typeof value === 'string') {
          // Simple key mapping
          result[value] = result[key];
          delete result[key];
        } else if (typeof value === 'function') {
          // Value transformation
          result[key] = value(result[key]);
        } else if (typeof value === 'object') {
          // Nested transformation
          result[key] = transformObject(result[key], value);
        }
      }
    }
  }

  return result;
}

/**
 * Apply transformation rules to request
 */
function applyTransformationRules(req: Request, rules: TransformationRule[], type: 'request'): void {
  for (const rule of rules) {
    if (rule.condition && !rule.condition(req)) {
      continue;
    }

    const value = getNestedProperty(req.body, rule.source);
    if (value !== undefined) {
      const transformedValue = rule.transform ? rule.transform(value) : value;
      setNestedProperty(req.body, rule.target, transformedValue);
      
      if (rule.source !== rule.target) {
        deleteNestedProperty(req.body, rule.source);
      }
    }
  }
}

/**
 * Apply transformation rules to response
 */
function applyResponseTransformationRules(res: Response, rules: TransformationRule[]): void {
  const originalJson = res.json;
  
  res.json = function(obj: any) {
    try {
      for (const rule of rules) {
        const value = getNestedProperty(obj, rule.source);
        if (value !== undefined) {
          const transformedValue = rule.transform ? rule.transform(value) : value;
          setNestedProperty(obj, rule.target, transformedValue);
          
          if (rule.source !== rule.target) {
            deleteNestedProperty(obj, rule.source);
          }
        }
      }
      
      return originalJson.call(this, obj);
    } catch (error) {
      logger.error('Response transformation rules error:', error);
      return originalJson.call(this, obj);
    }
  };
}

/**
 * Extract API version from request
 */
function extractApiVersion(req: Request): string | null {
  // Check header
  const headerVersion = req.headers['api-version'] || req.headers['x-api-version'];
  if (headerVersion) {
    return headerVersion as string;
  }

  // Check query parameter
  if (req.query.version) {
    return req.query.version as string;
  }

  // Check path (e.g., /api/v1/users)
  const pathMatch = req.path.match(/\/api\/v(\d+(?:\.\d+)?)/);
  if (pathMatch) {
    return `v${pathMatch[1]}`;
  }

  // Check Accept header
  const acceptHeader = req.headers.accept;
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.serenity\.v(\d+(?:\.\d+)?)\+json/);
    if (versionMatch) {
      return `v${versionMatch[1]}`;
    }
  }

  return null;
}

/**
 * Map fields in object
 */
function mapFields(obj: any, mappings: Record<string, string>): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mapFields(item, mappings));
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = mappings[key] || key;
    
    if (typeof value === 'object' && value !== null) {
      result[mappedKey] = mapFields(value, mappings);
    } else {
      result[mappedKey] = value;
    }
  }

  return result;
}

/**
 * Convert data formats
 */
function convertDataFormats(obj: any, config: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertDataFormats(item, config));
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      // Date conversion
      switch (config.dateFormat) {
        case 'unix':
          result[key] = Math.floor(value.getTime() / 1000);
          break;
        case 'iso':
          result[key] = value.toISOString();
          break;
        default:
          result[key] = value;
      }
    } else if (typeof value === 'number' && config.numberFormat === 'string') {
      result[key] = value.toString();
    } else if (typeof value === 'boolean') {
      switch (config.booleanFormat) {
        case 'string':
          result[key] = value.toString();
          break;
        case 'number':
          result[key] = value ? 1 : 0;
          break;
        default:
          result[key] = value;
      }
    } else if (typeof value === 'object') {
      result[key] = convertDataFormats(value, config);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Get metadata fields from request/response
 */
function getMetadataFields(req: Request, res: Response, fields: string[]): Record<string, any> {
  const metadata: Record<string, any> = {};
  
  for (const field of fields) {
    switch (field) {
      case 'user_id':
        metadata.user_id = req.user?.id;
        break;
      case 'ip_address':
        metadata.ip_address = req.ip;
        break;
      case 'user_agent':
        metadata.user_agent = req.headers['user-agent'];
        break;
      case 'response_time':
        metadata.response_time = Date.now() - req.start_time;
        break;
      case 'status_code':
        metadata.status_code = res.statusCode;
        break;
    }
  }
  
  return metadata;
}

/**
 * Check if client is legacy
 */
function checkIfLegacyClient(userAgent: string): boolean {
  const legacyPatterns = [
    /SerenityApp\/1\./,
    /SerenityApp\/2\.0/,
    /OldClient/
  ];
  
  return legacyPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Apply legacy transformations
 */
function applyLegacyTransformations(obj: any, mappings: Record<string, any>): any {
  // Implementation for legacy request transformations
  return transformObject(obj, mappings.request || {});
}

/**
 * Apply legacy response transformations
 */
function applyLegacyResponseTransformations(obj: any, mappings: Record<string, any>): any {
  // Implementation for legacy response transformations
  return transformObject(obj, mappings.response || {});
}

/**
 * Delete nested property
 */
function deleteNestedProperty(obj: any, path: string): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => current?.[key], obj);
  
  if (target && target.hasOwnProperty(lastKey)) {
    delete target[lastKey];
  }
}

// Add to Request interface
declare global {
  namespace Express {
    interface Request {
      api_version?: string;
    }
  }
}