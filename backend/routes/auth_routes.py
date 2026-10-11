from flask import Blueprint, request, jsonify, g
from backend.database import db
from backend.models.user import User
from backend.models.assessment import AuditLog
from backend.auth_middleware import jwt_required

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "worker").strip().lower()
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    aadhaar_last_four = data.get("aadhaar_last_four", "").strip()
    state = data.get("state", "").strip()

    if not email or not password or not full_name:
        return jsonify({"error": "email, password, and full_name are required"}), 400

    if role not in ["worker", "assessor", "admin"]:
        return jsonify({"error": "role must be one of: worker, assessor, admin"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        email=email,
        role=role,
        full_name=full_name,
        phone=phone or None,
        aadhaar_last_four=aadhaar_last_four or None,
        state=state or None
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = user.generate_auth_token()
    return jsonify({
        "message": f"User successfully registered as {role}",
        "user": user.to_dict(),
        "token": token
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = user.generate_auth_token()
    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "token": token
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required
def get_current_user():
    return jsonify({
        "user": g.current_user.to_dict()
    }), 200
