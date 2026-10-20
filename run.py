import os
from backend.app import create_app
from backend.database import db

app = create_app()
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"SAKSHAM RPL Assessment Platform running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
