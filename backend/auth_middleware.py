from functools import wraps
from flask import request, jsonify, g
from backend.models.user import User

def jwt_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Authorization header missing"}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid Authorization header format. Expected 'Bearer <token>'"}), 401
        
        token = parts[1]
        user = User.verify_auth_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, "current_user") or not g.current_user:
                return jsonify({"error": "Authentication required"}), 401
            
            if g.current_user.role not in allowed_roles:
                return jsonify({
                    "error": f"Access denied. Requires one of roles: {list(allowed_roles)}. Current role: '{g.current_user.role}'"
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
