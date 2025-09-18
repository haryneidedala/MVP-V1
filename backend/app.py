# from enum import unique

from flask import request, jsonify, Flask, make_response
from datetime import datetime
## from models import db, Workout
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os, time, uuid

print(jwt.__file__)
print(jwt.__version__)

load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET", "serious-app-serious-saturday")
JWT_ISSUER = "serious-saturday-api"
ACCESS_TTL = 15 * 60          # 15 minutes
REFRESH_TTL = 14 * 24 * 3600  # 14 days

app = Flask(__name__)
# CORS für Frontend auf Port 3001 erlauben
# CORS(app, resources={r"/*": {"origins": "http://localhost:3001"}})
CORS(
    app,
    resources={
        r"/*": {"origins": ["http://localhost:3001"]}
    },
    supports_credentials=True,
    allow_headers=["Authorization", "Content-Type"],
)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///profiles.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


def create_jwt(sub: str, kind: str, ttl: int):
    now = int(time.time())
    jti = str(uuid.uuid4())
    payload = {
        "iss": JWT_ISSUER,
        "sub": sub,
        "iat": now,
        "exp": now + ttl,
        "jti": jti,
        "typ": kind,
        **({})
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token, payload


def set_refresh_cookie(resp, token: str):
    # For cross-site calls from https://mydomain.com to https://api.mydomain.com
    # you likely need SameSite=None; Secure; HttpOnly
    resp.set_cookie(
        "refresh_token", token,
        max_age=REFRESH_TTL,
        httponly=True,
        secure=True,
        samesite="None"
    )

db = SQLAlchemy(app)

class Workout(db.Model): # <- Sagt: "Erstelle eine Workout-Tabelle"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) ## <- Wie eine Excel-Spalte für Text
    description = db.Column(db.Text) # <- eine Spalte für Beschreibung
    duration = db.Column(db.Integer) ## <- Eine Spalte für Zahlen
    difficulty = db.Column(db.Enum('Anfänger', 'Fortgeschritten', 'Profi'))
    # created_by = db.Column(db.Integer, db.ForeignKey('user.id'))  # Falls User-Tabelle existiert
    created_at = db.Column(db.DateTime, default=datetime.now)

class User(db.Model): # <- Sagt: "Erstelle eine Workout-Tabelle"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False, unique=True,) ## <- Wie eine Excel-Spalte für Text
    hash_password = db.Column(db.String(16)) # <- eine Spalte für Beschreibung
    created_at = db.Column(db.DateTime, default=datetime.now)

with app.app_context():
    db.create_all()

@app.post("/register")
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    user = User.query.filter_by(email = email).first()
    if user:
        return jsonify({"error": "user already exist"}), 400



    pwd_hash = generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)
    new_user = User (email = email, hash_password = pwd_hash)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"ok": True})

@app.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email = email).first()
    if not user or not check_password_hash(user.hash_password, password):
        return jsonify({"error": "invalid credentials"}), 401

    access, access_payload = create_jwt(user.id, "access", ACCESS_TTL)
    refresh, refresh_payload = create_jwt(user.id, "refresh", REFRESH_TTL)

    # store refresh jti so we can rotate/revoke later
    # REFRESH_STORE[refresh_payload["jti"]] = {"user_id": user["id"], "exp": refresh_payload["exp"]}

    resp = make_response({"access_token": access, "user_id": user.id})
    # set_refresh_cookie(resp, refresh)
    return resp


@app.route('/workouts', methods=['GET'])

def get_workouts():
    try:
        workouts = Workout.query.all()
        return jsonify([{
            'id': w.id,
            'name': w.name,
            'description': w.description,
            'duration': w.duration,
            'difficulty': w.difficulty
        } for w in workouts])
    except Exception as e:
        print(f"Workouts error: {str(e)}")
        return jsonify({'message': 'Fehler beim Abrufen der Workouts'}), 500
    
@app.route('/workouts', methods=['POST'])
def create_workout():
    data = request.get_json()       # <- Empfängt Daten von React (wie ein Formular)
    workout = Workout(              # <- Packt die Daten in die Datenbank-Vorlage
        name=data['name'],
        description=data['description'],
        duration=data['duration'],
        difficulty=data['difficulty']
    )
    db.session.add(workout)     # <- Fügt sie zur Datenbank hinzu
    db.session.commit()
    return jsonify({'message': 'Workout created!'}), 201

# Testbenutzer erstellen (nur für Entwicklung)
@app.before_request
def create_tables():
    db.create_all()
    # Testbenutzer erstellen, falls nicht vorhanden
 #   if not User.query.filter_by(email='test@example.com').first():
  #      test_user = User(email='test@example.com', name='Testbenutzer')
   #     test_user.set_password('password123')
    #    db.session.add(test_user)
     #   db.session.commit()
      #  print("Testbenutzer erstellt: test@example.com / password123")

if __name__ == "__main__":
    app.run(port=os.getenv("PORT"), debug=True, host="0.0.0.0")
