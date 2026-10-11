import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from backend.config import Config
from backend.database import db

def create_app(config_class=Config):
    frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
    
    app = Flask(
        __name__,
        static_folder=str(frontend_dist) if frontend_dist.exists() else None,
        static_url_path="/"
    )
    app.config.from_object(config_class)

    # Enable CORS for frontend during development
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Ensure directories exist
    db_path = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if db_path.startswith("sqlite:///"):
        file_path = Path(db_path.replace("sqlite:///", ""))
        file_path.parent.mkdir(parents=True, exist_ok=True)
    
    Config.UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    Config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    db.init_app(app)

    # Register Blueprints
    from backend.routes.auth_routes import auth_bp
    from backend.routes.worker_routes import worker_bp
    from backend.routes.qualification_routes import qualification_bp
    from backend.routes.assessment_routes import assessment_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(worker_bp, url_prefix="/api/v1/worker")
    app.register_blueprint(qualification_bp, url_prefix="/api/v1/qualifications")
    app.register_blueprint(assessment_bp, url_prefix="/api/v1/assessments")

    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "AI-Assisted RPL Assessment Platform API",
            "version": "1.0.0"
        }), 200

    # Serve React SPA single-page app
    if frontend_dist.exists():
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_spa(path):
            if path and (frontend_dist / path).exists():
                return send_from_directory(str(frontend_dist), path)
            return send_from_directory(str(frontend_dist), "index.html")

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Resource not found"}), 404
        if frontend_dist.exists():
            return send_from_directory(str(frontend_dist), "index.html")
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(host="127.0.0.1", port=5000, debug=True)
