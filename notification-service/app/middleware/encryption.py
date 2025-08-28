"""
PHI Encryption Middleware for HIPAA compliance
"""
import json
from typing import Dict, Any, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import structlog
from cryptography.fernet import Fernet
import base64

from app.core.config import settings
from app.core.logging import security_logger

logger = structlog.get_logger(__name__)


class PHIEncryptionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to encrypt PHI data in requests and responses
    
    HIPAA Requirements:
    - Encrypt PHI at rest and in transit
    - Audit all PHI access
    - Secure key management
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.cipher = Fernet(settings.encryption_key.encode())
        self.phi_fields = {
            # Fields that contain PHI and need encryption
            'phone', 'email', 'message', 'recipient', 'user_name',
            'patient_id', 'medical_record_number', 'ssn', 'dob',
            'medication_name', 'diagnosis', 'treatment_notes',
            'lab_results', 'appointment_notes', 'provider_notes'
        }
        self.endpoints_requiring_phi = {
            # Endpoints that handle PHI data
            '/api/v1/notifications/',
            '/api/v1/notifications/bulk',
            '/api/v1/notifications/crisis',
            '/api/v1/notifications/healthcare',
            '/api/v1/templates/',
            '/api/v1/preferences/'
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process request and response with PHI encryption"""
        
        # Skip encryption for health checks and non-PHI endpoints
        if not self._endpoint_requires_phi(request.url.path):
            return await call_next(request)
        
        # Decrypt incoming request if needed
        await self._decrypt_request(request)
        
        # Process request
        response = await call_next(request)
        
        # Encrypt outgoing response if needed
        await self._encrypt_response(response, request)
        
        return response
    
    def _endpoint_requires_phi(self, path: str) -> bool:
        """Check if endpoint requires PHI handling"""
        return any(path.startswith(endpoint) for endpoint in self.endpoints_requiring_phi)
    
    async def _decrypt_request(self, request: Request) -> None:
        """Decrypt PHI fields in incoming request"""
        try:
            if request.method in ['POST', 'PUT', 'PATCH']:
                # Get request body
                body = await request.body()
                
                if body:
                    try:
                        data = json.loads(body.decode('utf-8'))
                        
                        # Check if data contains encrypted PHI
                        if isinstance(data, dict) and data.get('_encrypted'):
                            decrypted_data = self._decrypt_data(data)
                            
                            # Replace request body with decrypted data
                            new_body = json.dumps(decrypted_data).encode('utf-8')
                            request._body = new_body
                            
                            logger.debug(
                                "Request PHI decrypted",
                                path=request.url.path,
                                fields_decrypted=len(self._find_phi_fields(decrypted_data))
                            )
                        
                    except json.JSONDecodeError:
                        # Not JSON data, skip decryption
                        pass
                    except Exception as e:
                        logger.error(
                            "Failed to decrypt request PHI",
                            path=request.url.path,
                            error=str(e)
                        )
                        
                        security_logger.log_suspicious_activity(
                            user_id=None,
                            ip_address=request.client.host,
                            activity_type="phi_decryption_failure",
                            details={"path": request.url.path, "error": str(e)}
                        )
        
        except Exception as e:
            logger.error("PHI request decryption error", error=str(e))
    
    async def _encrypt_response(self, response: Response, request: Request) -> None:
        """Encrypt PHI fields in outgoing response"""
        try:
            if response.headers.get('content-type', '').startswith('application/json'):
                # Get response body
                body = b''
                async for chunk in response.body_iterator:
                    body += chunk
                
                if body:
                    try:
                        data = json.loads(body.decode('utf-8'))
                        
                        # Find and encrypt PHI fields
                        phi_fields_found = self._find_phi_fields(data)
                        
                        if phi_fields_found:
                            encrypted_data = self._encrypt_data(data, phi_fields_found)
                            
                            # Replace response body
                            new_body = json.dumps(encrypted_data).encode('utf-8')
                            response.body = new_body
                            response.headers['content-length'] = str(len(new_body))
                            
                            logger.debug(
                                "Response PHI encrypted",
                                path=request.url.path,
                                fields_encrypted=len(phi_fields_found)
                            )
                    
                    except json.JSONDecodeError:
                        # Not JSON data, skip encryption
                        pass
                    except Exception as e:
                        logger.error(
                            "Failed to encrypt response PHI",
                            path=request.url.path,
                            error=str(e)
                        )
        
        except Exception as e:
            logger.error("PHI response encryption error", error=str(e))
    
    def _find_phi_fields(self, data: Any, parent_key: str = "") -> Dict[str, Any]:
        """Recursively find fields containing PHI"""
        phi_data = {}
        
        if isinstance(data, dict):
            for key, value in data.items():
                full_key = f"{parent_key}.{key}" if parent_key else key
                
                if key.lower() in self.phi_fields:
                    phi_data[full_key] = value
                elif isinstance(value, (dict, list)):
                    phi_data.update(self._find_phi_fields(value, full_key))
        
        elif isinstance(data, list):
            for i, item in enumerate(data):
                full_key = f"{parent_key}[{i}]"
                if isinstance(item, (dict, list)):
                    phi_data.update(self._find_phi_fields(item, full_key))
        
        return phi_data
    
    def _encrypt_data(self, data: Any, phi_fields: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt PHI fields in data"""
        try:
            encrypted_phi = {}
            
            for field_path, value in phi_fields.items():
                if value and isinstance(value, str):
                    # Encrypt the PHI value
                    encrypted_value = self.cipher.encrypt(value.encode('utf-8'))
                    encrypted_phi[field_path] = base64.b64encode(encrypted_value).decode('utf-8')
            
            # Return data with encrypted PHI and encryption metadata
            result = {
                "data": data,
                "_encrypted": True,
                "_phi_fields": list(phi_fields.keys()),
                "_encrypted_values": encrypted_phi,
                "_encryption_timestamp": datetime.utcnow().isoformat()
            }
            
            return result
        
        except Exception as e:
            logger.error("PHI encryption failed", error=str(e))
            return data  # Return original data on encryption failure
    
    def _decrypt_data(self, encrypted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt PHI fields in data"""
        try:
            if not encrypted_data.get('_encrypted'):
                return encrypted_data
            
            data = encrypted_data.get('data', {})
            encrypted_values = encrypted_data.get('_encrypted_values', {})
            
            # Decrypt PHI values
            for field_path, encrypted_value in encrypted_values.items():
                try:
                    # Decode and decrypt
                    encrypted_bytes = base64.b64decode(encrypted_value.encode('utf-8'))
                    decrypted_value = self.cipher.decrypt(encrypted_bytes).decode('utf-8')
                    
                    # Set decrypted value in data structure
                    self._set_nested_value(data, field_path, decrypted_value)
                
                except Exception as e:
                    logger.error(
                        "Failed to decrypt PHI field",
                        field=field_path,
                        error=str(e)
                    )
            
            return data
        
        except Exception as e:
            logger.error("PHI decryption failed", error=str(e))
            return encrypted_data.get('data', encrypted_data)
    
    def _set_nested_value(self, data: Dict[str, Any], field_path: str, value: str) -> None:
        """Set value in nested data structure using dot notation path"""
        try:
            parts = field_path.split('.')
            current = data
            
            # Navigate to parent
            for part in parts[:-1]:
                if '[' in part and ']' in part:
                    # Handle array index
                    key, index_str = part.split('[')
                    index = int(index_str.rstrip(']'))
                    
                    if key not in current:
                        current[key] = []
                    
                    while len(current[key]) <= index:
                        current[key].append({})
                    
                    current = current[key][index]
                else:
                    if part not in current:
                        current[part] = {}
                    current = current[part]
            
            # Set final value
            final_key = parts[-1]
            if '[' in final_key and ']' in final_key:
                key, index_str = final_key.split('[')
                index = int(index_str.rstrip(']'))
                
                if key not in current:
                    current[key] = []
                
                while len(current[key]) <= index:
                    current[key].append(None)
                
                current[key][index] = value
            else:
                current[final_key] = value
        
        except Exception as e:
            logger.error("Failed to set nested value", field_path=field_path, error=str(e))


class PHIRedactionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to redact PHI from logs and error responses
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.redaction_patterns = {
            # Patterns to redact in logs and error messages
            r'\b\d{3}-\d{2}-\d{4}\b': '***-**-****',  # SSN
            r'\b\d{3}-\d{3}-\d{4}\b': '***-***-****',  # Phone number
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b': '***@***.***',  # Email
            r'\b\d{2}/\d{2}/\d{4}\b': '**/**/****',  # DOB
            r'\bMRN\d+\b': 'MRN***',  # Medical record number
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process request with PHI redaction"""
        try:
            response = await call_next(request)
            return response
        
        except Exception as e:
            # Redact PHI from error messages
            error_message = str(e)
            redacted_message = self._redact_phi(error_message)
            
            logger.error(
                "Request error with PHI redaction",
                path=request.url.path,
                error=redacted_message,
                user_agent=request.headers.get('user-agent'),
                ip_address=request.client.host
            )
            
            # Re-raise with redacted message in production
            if settings.environment == "production":
                raise Exception("An error occurred while processing your request")
            else:
                raise Exception(redacted_message)
    
    def _redact_phi(self, text: str) -> str:
        """Redact PHI patterns from text"""
        import re
        
        redacted = text
        for pattern, replacement in self.redaction_patterns.items():
            redacted = re.sub(pattern, replacement, redacted)
        
        return redacted


class DataMaskingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to mask sensitive data in API responses for different user roles
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.role_permissions = {
            'admin': set(),  # No masking for admin
            'provider': {'ssn', 'full_dob'},  # Mask SSN and full DOB
            'support': {'ssn', 'full_dob', 'medical_details'},  # Mask more fields
            'user': {'ssn', 'full_dob', 'medical_details', 'provider_notes'}  # Mask most fields
        }
    
    async def dispatch(self, request: Request, call_next):
        """Process response with data masking based on user role"""
        response = await call_next(request)
        
        # Get user role from request context
        user_role = getattr(request.state, 'user_role', 'user')
        
        # Apply masking if needed
        if user_role != 'admin':
            await self._mask_response_data(response, user_role)
        
        return response
    
    async def _mask_response_data(self, response: Response, user_role: str) -> None:
        """Mask sensitive data in response based on user role"""
        try:
            if response.headers.get('content-type', '').startswith('application/json'):
                body = b''
                async for chunk in response.body_iterator:
                    body += chunk
                
                if body:
                    try:
                        data = json.loads(body.decode('utf-8'))
                        masked_data = self._mask_data(data, user_role)
                        
                        new_body = json.dumps(masked_data).encode('utf-8')
                        response.body = new_body
                        response.headers['content-length'] = str(len(new_body))
                    
                    except json.JSONDecodeError:
                        pass  # Not JSON, skip masking
        
        except Exception as e:
            logger.error("Data masking failed", user_role=user_role, error=str(e))
    
    def _mask_data(self, data: Any, user_role: str) -> Any:
        """Recursively mask data based on user role"""
        masked_fields = self.role_permissions.get(user_role, set())
        
        if isinstance(data, dict):
            masked_data = {}
            for key, value in data.items():
                if key.lower() in masked_fields:
                    masked_data[key] = self._mask_value(value, key)
                elif isinstance(value, (dict, list)):
                    masked_data[key] = self._mask_data(value, user_role)
                else:
                    masked_data[key] = value
            return masked_data
        
        elif isinstance(data, list):
            return [self._mask_data(item, user_role) for item in data]
        
        return data
    
    def _mask_value(self, value: Any, field_name: str) -> str:
        """Mask individual values based on field type"""
        if not isinstance(value, str):
            return "***"
        
        if 'ssn' in field_name.lower():
            return '***-**-****'
        elif 'phone' in field_name.lower():
            return '***-***-****'
        elif 'email' in field_name.lower():
            return '***@***.***'
        elif 'dob' in field_name.lower():
            return '**/**/****'
        else:
            return '*' * min(len(value), 10)  # Generic masking