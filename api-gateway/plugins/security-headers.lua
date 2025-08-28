-- HIPAA-Compliant Security Headers Plugin
local plugin = {
  PRIORITY = 1000,
  VERSION = "1.0.0"
}

plugin.SCHEMA = {
  name = "security-headers",
  fields = {
    {
      config = {
        type = "record",
        fields = {
          {
            enable_cors = { type = "boolean", default = true }
          },
          {
            cors_origins = {
              type = "array",
              elements = { type = "string" },
              default = { "http://localhost:3000", "http://localhost:8080", "https://*.serenity.app" }
            }
          },
          {
            cors_methods = {
              type = "array", 
              elements = { type = "string" },
              default = { "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS" }
            }
          },
          {
            cors_headers = {
              type = "array",
              elements = { type = "string" },
              default = { "Accept", "Content-Type", "Authorization", "X-API-Key", "X-Auth-Token" }
            }
          },
          {
            cors_expose_headers = {
              type = "array",
              elements = { type = "string" },
              default = { "X-RateLimit-Remaining", "X-RateLimit-Limit", "X-Request-ID" }
            }
          },
          {
            cors_credentials = { type = "boolean", default = true }
          },
          {
            cors_max_age = { type = "number", default = 3600 }
          },
          {
            security_headers = {
              type = "record",
              fields = {
                {
                  x_frame_options = { type = "string", default = "DENY" }
                },
                {
                  x_content_type_options = { type = "string", default = "nosniff" }
                },
                {
                  x_xss_protection = { type = "string", default = "1; mode=block" }
                },
                {
                  strict_transport_security = { 
                    type = "string", 
                    default = "max-age=31536000; includeSubDomains; preload" 
                  }
                },
                {
                  referrer_policy = { 
                    type = "string", 
                    default = "strict-origin-when-cross-origin" 
                  }
                },
                {
                  content_security_policy = {
                    type = "string",
                    default = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' wss: https: data:; font-src 'self' https://fonts.gstatic.com data:; object-src 'none'; media-src 'self' https:; child-src 'self' https:; worker-src 'self' blob:; manifest-src 'self'; frame-ancestors 'none';"
                  }
                },
                {
                  permissions_policy = {
                    type = "string",
                    default = "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()"
                  }
                },
                {
                  cross_origin_embedder_policy = { type = "string", default = "require-corp" }
                },
                {
                  cross_origin_opener_policy = { type = "string", default = "same-origin" }
                },
                {
                  cross_origin_resource_policy = { type = "string", default = "cross-origin" }
                }
              }
            }
          },
          {
            hipaa_headers = {
              type = "record",
              fields = {
                {
                  enable_audit_headers = { type = "boolean", default = true }
                },
                {
                  enable_encryption_headers = { type = "boolean", default = true }
                },
                {
                  data_classification = { type = "string", default = "PHI" }
                }
              }
            }
          },
          {
            remove_server_header = { type = "boolean", default = true }
          },
          {
            remove_x_powered_by = { type = "boolean", default = true }
          }
        }
      }
    }
  }
}

-- Check if origin matches allowed origins (supports wildcards)
local function is_origin_allowed(origin, allowed_origins)
  if not origin then
    return false
  end
  
  for _, allowed_origin in ipairs(allowed_origins) do
    if allowed_origin == "*" then
      return true
    elseif allowed_origin == origin then
      return true
    elseif string.match(allowed_origin, "%*") then
      -- Handle wildcard patterns like "https://*.example.com"
      local pattern = allowed_origin:gsub("([%.%-%+%[%]%(%)])", "%%%1"):gsub("%*", "[^%.]*")
      if string.match(origin, "^" .. pattern .. "$") then
        return true
      end
    end
  end
  
  return false
end

function plugin:access(config)
  local method = kong.request.get_method()
  local origin = kong.request.get_header("origin")
  
  -- Handle CORS preflight requests
  if config.enable_cors and method == "OPTIONS" then
    if origin and is_origin_allowed(origin, config.cors_origins) then
      kong.response.set_header("Access-Control-Allow-Origin", origin)
      kong.response.set_header("Access-Control-Allow-Credentials", config.cors_credentials and "true" or "false")
      kong.response.set_header("Access-Control-Allow-Methods", table.concat(config.cors_methods, ", "))
      kong.response.set_header("Access-Control-Allow-Headers", table.concat(config.cors_headers, ", "))
      kong.response.set_header("Access-Control-Max-Age", tostring(config.cors_max_age))
      
      return kong.response.exit(204)
    else
      return kong.response.exit(403, { error = "CORS: Origin not allowed" })
    end
  end
  
  -- Store origin for response phase
  if config.enable_cors and origin then
    kong.ctx.shared.cors_origin = is_origin_allowed(origin, config.cors_origins) and origin or nil
  end
end

function plugin:header_filter(config)
  local response_headers = {}
  
  -- CORS headers for actual requests
  if config.enable_cors and kong.ctx.shared.cors_origin then
    response_headers["Access-Control-Allow-Origin"] = kong.ctx.shared.cors_origin
    response_headers["Access-Control-Allow-Credentials"] = config.cors_credentials and "true" or "false"
    response_headers["Access-Control-Expose-Headers"] = table.concat(config.cors_expose_headers, ", ")
  end
  
  -- Security Headers
  local sec_headers = config.security_headers
  if sec_headers.x_frame_options then
    response_headers["X-Frame-Options"] = sec_headers.x_frame_options
  end
  if sec_headers.x_content_type_options then
    response_headers["X-Content-Type-Options"] = sec_headers.x_content_type_options
  end
  if sec_headers.x_xss_protection then
    response_headers["X-XSS-Protection"] = sec_headers.x_xss_protection
  end
  if sec_headers.strict_transport_security then
    response_headers["Strict-Transport-Security"] = sec_headers.strict_transport_security
  end
  if sec_headers.referrer_policy then
    response_headers["Referrer-Policy"] = sec_headers.referrer_policy
  end
  if sec_headers.content_security_policy then
    response_headers["Content-Security-Policy"] = sec_headers.content_security_policy
  end
  if sec_headers.permissions_policy then
    response_headers["Permissions-Policy"] = sec_headers.permissions_policy
  end
  if sec_headers.cross_origin_embedder_policy then
    response_headers["Cross-Origin-Embedder-Policy"] = sec_headers.cross_origin_embedder_policy
  end
  if sec_headers.cross_origin_opener_policy then
    response_headers["Cross-Origin-Opener-Policy"] = sec_headers.cross_origin_opener_policy
  end
  if sec_headers.cross_origin_resource_policy then
    response_headers["Cross-Origin-Resource-Policy"] = sec_headers.cross_origin_resource_policy
  end
  
  -- HIPAA Compliance Headers
  if config.hipaa_headers.enable_audit_headers then
    response_headers["X-Data-Classification"] = config.hipaa_headers.data_classification
    response_headers["X-Audit-Required"] = "true"
    response_headers["X-Encryption-Required"] = "true"
  end
  
  if config.hipaa_headers.enable_encryption_headers then
    response_headers["X-Content-Encryption"] = "AES-256"
    response_headers["X-Transport-Encryption"] = "TLS-1.3"
  end
  
  -- Additional security headers
  response_headers["X-Request-ID"] = kong.request.get_header("X-Request-ID") or kong.log.serialize().request.id
  response_headers["X-Gateway"] = "Kong-Serenity"
  response_headers["X-API-Version"] = "v1.0"
  
  -- Remove server identification headers
  if config.remove_server_header then
    kong.response.clear_header("Server")
  end
  if config.remove_x_powered_by then
    kong.response.clear_header("X-Powered-By")
  end
  
  -- Set all response headers
  for header_name, header_value in pairs(response_headers) do
    kong.response.set_header(header_name, header_value)
  end
end

function plugin:body_filter(config)
  -- Additional body filtering for sensitive data
  local body = kong.response.get_raw_body()
  local content_type = kong.response.get_header("Content-Type")
  
  -- Log potential PHI exposure (for audit purposes)
  if body and content_type and string.match(content_type, "application/json") then
    local sensitive_patterns = {
      "ssn", "social_security", "date_of_birth", "dob", 
      "medical_record", "diagnosis", "medication", "treatment"
    }
    
    local body_lower = string.lower(body)
    for _, pattern in ipairs(sensitive_patterns) do
      if string.find(body_lower, pattern) then
        kong.log.warn("Potential PHI detected in response body for pattern: " .. pattern)
        break
      end
    end
  end
end

return plugin