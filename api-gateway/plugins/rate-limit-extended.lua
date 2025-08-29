-- Extended Rate Limiting Plugin with API Key Management
local cjson = require "cjson"
local redis = require "resty.redis"

local plugin = {
  PRIORITY = 1100,
  VERSION = "1.0.0"
}

plugin.SCHEMA = {
  name = "rate-limit-extended",
  fields = {
    {
      config = {
        type = "record",
        fields = {
          {
            minute = { type = "number", default = 100 }
          },
          {
            hour = { type = "number", default = 1000 }
          },
          {
            day = { type = "number", default = 10000 }
          },
          {
            redis_host = { type = "string", default = "kong-redis" }
          },
          {
            redis_port = { type = "number", default = 6379 }
          },
          {
            redis_password = { type = "string", encrypted = true }
          },
          {
            redis_database = { type = "number", default = 0 }
          },
          {
            api_key_header = { type = "string", default = "X-API-Key" }
          },
          {
            user_id_header = { type = "string", default = "X-User-ID" }
          },
          {
            role_based_limits = {
              type = "record",
              fields = {
                {
                  admin = {
                    type = "record",
                    fields = {
                      { minute = { type = "number", default = 1000 } },
                      { hour = { type = "number", default = 10000 } },
                      { day = { type = "number", default = 100000 } }
                    }
                  }
                },
                {
                  provider = {
                    type = "record",
                    fields = {
                      { minute = { type = "number", default = 500 } },
                      { hour = { type = "number", default = 5000 } },
                      { day = { type = "number", default = 50000 } }
                    }
                  }
                },
                {
                  patient = {
                    type = "record",
                    fields = {
                      { minute = { type = "number", default = 100 } },
                      { hour = { type = "number", default = 1000 } },
                      { day = { type = "number", default = 10000 } }
                    }
                  }
                },
                {
                  supporter = {
                    type = "record",
                    fields = {
                      { minute = { type = "number", default = 200 } },
                      { hour = { type = "number", default = 2000 } },
                      { day = { type = "number", default = 20000 } }
                    }
                  }
                }
              }
            }
          },
          {
            emergency_bypass = {
              type = "record",
              fields = {
                {
                  enabled = { type = "boolean", default = true }
                },
                {
                  emergency_paths = {
                    type = "array",
                    elements = { type = "string" },
                    default = { "/api/crisis", "/api/emergency", "/api/v1/crisis" }
                  }
                },
                {
                  emergency_multiplier = { type = "number", default = 10 }
                }
              }
            }
          },
          {
            whitelist_ips = {
              type = "array",
              elements = { type = "string" },
              default = {}
            }
          },
          {
            enable_analytics = { type = "boolean", default = true }
          }
        }
      }
    }
  }
}

-- Connect to Redis
local function get_redis_connection(config)
  local red = redis:new()
  red:set_timeout(1000)
  
  local ok, err = red:connect(config.redis_host, config.redis_port)
  if not ok then
    return nil, err
  end
  
  if config.redis_password then
    local res, err = red:auth(config.redis_password)
    if not res then
      return nil, err
    end
  end
  
  local ok, err = red:select(config.redis_database)
  if not ok then
    return nil, err
  end
  
  return red, nil
end

-- Get rate limit key
local function get_rate_limit_key(identifier, window)
  return "rate_limit:" .. identifier .. ":" .. window .. ":" .. math.floor(ngx.time() / window)
end

-- Get API key limits from Redis
local function get_api_key_limits(red, api_key)
  local limits_key = "api_key_limits:" .. api_key
  local limits_json, err = red:get(limits_key)
  
  if not limits_json or limits_json == ngx.null then
    return nil, nil
  end
  
  local ok, limits = pcall(cjson.decode, limits_json)
  if not ok then
    return nil, "Invalid JSON in API key limits"
  end
  
  return limits, nil
end

-- Store API usage analytics
local function store_analytics(red, identifier, path, method, status, response_time)
  local analytics_key = "analytics:" .. identifier .. ":" .. os.date("%Y-%m-%d:%H")
  local analytics_data = {
    path = path,
    method = method,
    status = status,
    response_time = response_time,
    timestamp = ngx.time()
  }
  
  red:lpush(analytics_key, cjson.encode(analytics_data))
  red:expire(analytics_key, 86400 * 7) -- Keep for 7 days
end

-- Check if IP is whitelisted
local function is_ip_whitelisted(ip, whitelist)
  for _, whitelisted_ip in ipairs(whitelist) do
    if ip == whitelisted_ip or string.match(ip, whitelisted_ip) then
      return true
    end
  end
  return false
end

-- Get rate limits based on role
local function get_role_limits(config, role)
  if role and config.role_based_limits and config.role_based_limits[role] then
    return config.role_based_limits[role]
  end
  return {
    minute = config.minute,
    hour = config.hour,
    day = config.day
  }
end

-- Check if path is emergency path
local function is_emergency_path(path, emergency_paths)
  for _, emergency_path in ipairs(emergency_paths) do
    if string.match(path, emergency_path) then
      return true
    end
  end
  return false
end

-- Increment counter and check limit
local function check_rate_limit(red, key, limit, window)
  local current, err = red:incr(key)
  if not current then
    return false, 0, err
  end
  
  if current == 1 then
    red:expire(key, window)
  end
  
  local remaining = math.max(0, limit - current)
  return current <= limit, remaining, nil
end

function plugin:access(config)
  local client_ip = kong.client.get_forwarded_ip()
  local path = kong.request.get_path()
  local method = kong.request.get_method()
  local user_id = kong.request.get_header(config.user_id_header)
  local api_key = kong.request.get_header(config.api_key_header)
  local user_role = kong.request.get_header("X-User-Role") or "patient"
  
  -- Skip rate limiting for whitelisted IPs
  if is_ip_whitelisted(client_ip, config.whitelist_ips) then
    kong.log.info("Rate limiting bypassed for whitelisted IP: " .. client_ip)
    return
  end
  
  -- Connect to Redis
  local red, err = get_redis_connection(config)
  if not red then
    kong.log.err("Failed to connect to Redis: " .. err)
    return kong.response.exit(500, { error = "Rate limiting service unavailable" })
  end
  
  -- Determine identifier (user_id, api_key, or IP)
  local identifier = user_id or api_key or client_ip
  local identifier_type = user_id and "user" or (api_key and "api_key" or "ip")
  
  -- Get rate limits
  local limits = get_role_limits(config, user_role)
  
  -- Check for API key specific limits
  if api_key then
    local api_key_limits, err = get_api_key_limits(red, api_key)
    if api_key_limits then
      limits = api_key_limits
    end
  end
  
  -- Emergency bypass for crisis endpoints
  if config.emergency_bypass.enabled and is_emergency_path(path, config.emergency_bypass.emergency_paths) then
    limits.minute = limits.minute * config.emergency_bypass.emergency_multiplier
    limits.hour = limits.hour * config.emergency_bypass.emergency_multiplier
    limits.day = limits.day * config.emergency_bypass.emergency_multiplier
    kong.log.info("Emergency bypass activated for path: " .. path)
  end
  
  -- Check rate limits for different time windows
  local windows = {
    { name = "minute", limit = limits.minute, window = 60 },
    { name = "hour", limit = limits.hour, window = 3600 },
    { name = "day", limit = limits.day, window = 86400 }
  }
  
  local headers = {}
  local blocked = false
  local blocking_window = nil
  
  for _, window_config in ipairs(windows) do
    local key = get_rate_limit_key(identifier, window_config.window)
    local allowed, remaining, err = check_rate_limit(red, key, window_config.limit, window_config.window)
    
    if err then
      kong.log.err("Rate limit check failed: " .. err)
      -- Fail open - allow request if Redis is having issues
      red:set_keepalive(10000, 100)
      return
    end
    
    headers["X-RateLimit-Limit-" .. window_config.name:gsub("^%l", string.upper)] = window_config.limit
    headers["X-RateLimit-Remaining-" .. window_config.name:gsub("^%l", string.upper)] = remaining
    
    if not allowed then
      blocked = true
      blocking_window = window_config.name
      break
    end
  end
  
  -- Set response headers
  for header_name, header_value in pairs(headers) do
    kong.response.set_header(header_name, header_value)
  end
  
  -- Store analytics if enabled
  if config.enable_analytics then
    store_analytics(red, identifier, path, method, blocked and 429 or 200, 0)
  end
  
  -- Close Redis connection
  red:set_keepalive(10000, 100)
  
  -- Block request if rate limited
  if blocked then
    kong.log.warn(string.format("Rate limit exceeded for %s (%s) on %s window", identifier, identifier_type, blocking_window))
    return kong.response.exit(429, {
      error = "Rate limit exceeded",
      message = string.format("Too many requests per %s", blocking_window),
      retry_after = blocking_window == "minute" and 60 or (blocking_window == "hour" and 3600 or 86400)
    })
  end
  
  -- Success - add identifier to context for logging
  kong.ctx.shared.rate_limit_identifier = identifier
  kong.ctx.shared.rate_limit_type = identifier_type
end

function plugin:header_filter(config)
  -- Add rate limiting status headers
  kong.response.set_header("X-RateLimit-Policy", "redis")
  if kong.ctx.shared.rate_limit_identifier then
    kong.response.set_header("X-RateLimit-Identifier", kong.ctx.shared.rate_limit_type)
  end
end

function plugin:log(config)
  -- Log rate limiting information
  if config.enable_analytics and kong.ctx.shared.rate_limit_identifier then
    local response_time = kong.ctx.shared.response_time or 0
    local status = kong.response.get_status()
    
    kong.log.info(string.format("Rate limit log: identifier=%s, type=%s, status=%d, response_time=%dms",
      kong.ctx.shared.rate_limit_identifier,
      kong.ctx.shared.rate_limit_type,
      status,
      response_time
    ))
  end
end

return plugin