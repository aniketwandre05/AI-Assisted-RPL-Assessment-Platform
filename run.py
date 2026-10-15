from backend.app import create_app
from backend.database import db

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    print("SAKSHAM RPL Assessment Platform running on http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
