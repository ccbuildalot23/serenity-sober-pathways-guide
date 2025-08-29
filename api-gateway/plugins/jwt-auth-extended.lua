-- Extended JWT Authentication Plugin for HIPAA Compliance
local jwt = require "resty.jwt"
local cjson = require "cjson"
local http = require "resty.http"

local plugin = {
  PRIORITY = 1500,
  VERSION = "1.0.0"
}

plugin.SCHEMA = {
  name = "jwt-auth-extended",
  fields = {
    {
      config = {
        type = "record",
        fields = {
          {
            secret_key = {
              type = "string",
              required = true,
              encrypted = true
            }
          },
          {
            algorithm = {
              type = "string",
              default = "HS256",
              one_of = { "HS256", "HS384", "HS512", "RS256", "RS384", "RS512" }
            }
          },
          {
            issuer = {
              type = "string",
              required = true
            }
          },
          {
            audience = {
              type = "array",
              elements = { type = "string" },
              default = {}
            }
          },
          {
            claims_to_verify = {
              type = "array",
              elements = { type = "string" },
              default = { "exp", "iat", "iss" }
            }
          },
          {
            session_timeout = {
              type = "number",
              default = 900  -- 15 minutes for HIPAA compliance
            }
          },
          {
            enable_audit_log = {
              type = "boolean",
              default = true
            }
          },
          {
            supabase_url = {
              type = "string",
              required = false
            }
          },
          {
            supabase_service_key = {
              type = "string",
              required = false,
              encrypted = true
            }
          }
        }
      }
    }
  }
}

-- Audit logging function
local function audit_log(event_type, user_id, ip_address, user_agent, success, error_msg)
  local log_entry = {
    timestamp = ngx.time(),
    event_type = event_type,
    user_id = user_id,
    ip_address = ip_address,
    user_agent = user_agent,
    success = success,
    error_message = error_msg or nil,
    service = "api-gateway"
  }
  
  kong.log.info("HIPAA_AUDIT: " .. cjson.encode(log_entry))
end

-- Validate token with Supabase
local function validate_with_supabase(token, config)
  if not config.supabase_url or not config.supabase_service_key then
    return false, "Supabase configuration missing"
  end
  
  local httpc = http.new()
  local res, err = httpc:request_uri(config.supabase_url .. "/auth/v1/user", {
    method = "GET",
    headers = {
      ["Authorization"] = "Bearer " .. token,
      ["apikey"] = config.supabase_service_key,
      ["Content-Type"] = "application/json"
    },
    timeout = 5000
  })
  
  if not res then
    return false, "Failed to validate with Supabase: " .. (err or "unknown error")
  end
  
  if res.status == 200 then
    local user_data = cjson.decode(res.body)
    return true, user_data
  else
    return false, "Invalid token"
  end
end

-- Check session timeout
local function is_session_expired(iat, config)
  local current_time = ngx.time()
  local session_age = current_time - iat
  return session_age > config.session_timeout
end

-- Extract JWT from request
local function extract_jwt()
  local auth_header = kong.request.get_header("authorization")
  local jwt_token = nil
  
  if auth_header then
    local iterator, iter_err = ngx.re.gmatch(auth_header, "\\s*[Bb]earer\\s+(.+)")
    if not iterator then
      return nil, "Invalid authorization header format"
    end
    
    local m, err = iterator()
    if not m then
      return nil, "No JWT token found in authorization header"
    end
    
    jwt_token = m[1]
  end
  
  -- Also check for JWT in query parameters as fallback
  if not jwt_token then
    jwt_token = kong.request.get_query_arg("jwt")
  end
  
  return jwt_token, nil
end

function plugin:access(config)
  local client_ip = kong.client.get_forwarded_ip()
  local user_agent = kong.request.get_header("user-agent") or "unknown"
  
  -- Extract JWT token
  local jwt_token, extract_err = extract_jwt()
  if not jwt_token then
    audit_log("JWT_VALIDATION_FAILED", "unknown", client_ip, user_agent, false, extract_err)
    return kong.response.exit(401, { error = "Missing JWT token", message = extract_err })
  end
  
  -- Verify JWT signature and claims
  local jwt_obj = jwt:verify(config.secret_key, jwt_token, {
    alg = config.algorithm
  })
  
  if not jwt_obj or not jwt_obj.valid then
    audit_log("JWT_VALIDATION_FAILED", "unknown", client_ip, user_agent, false, "Invalid JWT signature")
    return kong.response.exit(401, { error = "Invalid JWT token" })
  end
  
  local payload = jwt_obj.payload
  
  -- Verify required claims
  for _, claim in ipairs(config.claims_to_verify) do
    if claim == "exp" and (not payload.exp or payload.exp < ngx.time()) then
      audit_log("JWT_VALIDATION_FAILED", payload.sub, client_ip, user_agent, false, "Token expired")
      return kong.response.exit(401, { error = "Token expired" })
    elseif claim == "iss" and payload.iss ~= config.issuer then
      audit_log("JWT_VALIDATION_FAILED", payload.sub, client_ip, user_agent, false, "Invalid issuer")
      return kong.response.exit(401, { error = "Invalid token issuer" })
    elseif claim == "iat" and not payload.iat then
      audit_log("JWT_VALIDATION_FAILED", payload.sub, client_ip, user_agent, false, "Missing issued at claim")
      return kong.response.exit(401, { error = "Invalid token format" })
    end
  end
  
  -- Check session timeout for HIPAA compliance
  if payload.iat and is_session_expired(payload.iat, config) then
    audit_log("SESSION_TIMEOUT", payload.sub, client_ip, user_agent, false, "Session expired due to timeout")
    return kong.response.exit(401, { error = "Session expired", message = "Please login again" })
  end
  
  -- Validate audience if configured
  if #config.audience > 0 then
    local valid_audience = false
    if payload.aud then
      if type(payload.aud) == "table" then
        for _, aud in ipairs(payload.aud) do
          for _, valid_aud in ipairs(config.audience) do
            if aud == valid_aud then
              valid_audience = true
              break
            end
          end
          if valid_audience then break end
        end
      else
        for _, valid_aud in ipairs(config.audience) do
          if payload.aud == valid_aud then
            valid_audience = true
            break
          end
        end
      end
    end
    
    if not valid_audience then
      audit_log("JWT_VALIDATION_FAILED", payload.sub, client_ip, user_agent, false, "Invalid audience")
      return kong.response.exit(401, { error = "Invalid token audience" })
    end
  end
  
  -- Additional validation with Supabase (optional)
  if config.supabase_url and config.supabase_service_key then
    local supabase_valid, user_data_or_error = validate_with_supabase(jwt_token, config)
    if not supabase_valid then
      audit_log("SUPABASE_VALIDATION_FAILED", payload.sub, client_ip, user_agent, false, user_data_or_error)
      return kong.response.exit(401, { error = "Token validation failed", message = user_data_or_error })
    end
  end
  
  -- Set headers for upstream services
  kong.service.request.set_header("X-User-ID", payload.sub)
  kong.service.request.set_header("X-User-Email", payload.email)
  kong.service.request.set_header("X-User-Role", payload.role or "patient")
  kong.service.request.set_header("X-Session-ID", payload.session_id)
  kong.service.request.set_header("X-Auth-Time", payload.iat)
  kong.service.request.set_header("X-Client-IP", client_ip)
  
  -- Success audit log
  audit_log("JWT_VALIDATION_SUCCESS", payload.sub, client_ip, user_agent, true)
  
  -- Set user context for downstream plugins
  kong.ctx.shared.authenticated_user = {
    id = payload.sub,
    email = payload.email,
    role = payload.role or "patient",
    session_id = payload.session_id,
    auth_time = payload.iat
  }
end

function plugin:header_filter(config)
  -- Add security headers
  local headers = kong.response.get_headers()
  if not headers["x-auth-status"] then
    kong.response.set_header("X-Auth-Status", "authenticated")
  end
end

return plugin