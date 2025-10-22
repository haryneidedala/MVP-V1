from flask import request, jsonify, Flask, make_response
from datetime import datetime
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os, time, uuid
import requests

print(jwt.__file__)
print(jwt.__version__)

load_dotenv()


JWT_SECRET = os.environ.get("JWT_SECRET", "serious-app-serious-saturday")
JWT_ISSUER = "serious-saturday-api"
ACCESS_TTL = 15 * 60  # 15 minutes
REFRESH_TTL = 14 * 24 * 3600  # 14 days
API_NINJAS_KEY = os.environ.get("API_NINJAS_KEY", "kv3L6dkzhZMM/zVeKMVZuw==uh3doT2qzvcQXo8j")

app = Flask(__name__)
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
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token, payload


db = SQLAlchemy(app)

# Assoziationstabelle für M:N-Beziehung
user_workouts = db.Table('user_workouts',
                         db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
                         db.Column('workout_id', db.Integer, db.ForeignKey('workout.id'), primary_key=True),
                         db.Column('created_at', db.DateTime, default=datetime.now),
                         db.Column('is_favorite', db.Boolean, default=False),
                         db.Column('progress', db.Integer, default=0)  # 0-100%
                         )


class Workout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    duration = db.Column(db.Integer)
    difficulty = db.Column(db.Enum('Anfänger', 'Fortgeschritten', 'Profi'))
    category = db.Column(db.String(50))  # Neues Feld für Kategorie
    api_exercise_id = db.Column(db.String(100))  # ID von API Ninjas
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationship zu Usern
    subscribed_users = db.relationship(
        'User',
        secondary=user_workouts,
        back_populates='subscribed_workouts'
    )


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    hash_password = db.Column(db.String(255))  # Länger für pbkdf2
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationship zu Workouts
    subscribed_workouts = db.relationship(
        'Workout',
        secondary=user_workouts,
        back_populates='subscribed_users'
    )


with app.app_context():
    db.create_all()


# Service-Klasse für Workout-Logik
class WorkoutService:
    @staticmethod
    def fetch_exercises_from_api(muscle=None, difficulty=None, type=None):
        """Holt Exercises von API Ninjas mit erweiterter Fehlerbehandlung"""
        try:
            url = "https://api.api-ninjas.com/v1/exercises"
            params = {}
            if muscle:
                params['muscle'] = muscle
            if difficulty:
                params['difficulty'] = difficulty.lower()
            if type:
                params['type'] = type

            headers = {'X-Api-Key': API_NINJAS_KEY}

            # DEBUG: API-Key und Parameter prüfen
            print(f"=== API REQUEST DEBUG ===")
            print(f"API Key vorhanden: {bool(API_NINJAS_KEY)}")
            print(f"API Key (erste 5 Zeichen): {API_NINJAS_KEY[:5] if API_NINJAS_KEY else 'NONE'}")
            print(f"URL: {url}")
            print(f"Parameter: {params}")
            print(f"Headers: {headers}")

            response = requests.get(url, headers=headers, params=params, timeout=10)

            # DEBUG: Response Details
            print(f"=== API RESPONSE DEBUG ===")
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print(f"Response Text: {response.text[:500]}...")  # Nur erste 500 Zeichen
            print(f"=== END DEBUG ===")

            if response.status_code == 200:
                return response.json()
            else:
                print(f"API Error: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"Error fetching from API: {str(e)}")
            return []

    @staticmethod
    def save_exercises_to_db(exercises_data):
        """Speichert Exercises in der Datenbank"""
        saved_count = 0
        for exercise in exercises_data:
            # Prüfe ob Exercise bereits existiert
            existing = Workout.query.filter_by(
                name=exercise.get('name'),
                api_exercise_id=exercise.get('name')  # Verwende Name als ID da keine echte ID vorhanden
            ).first()

            if not existing:
                # Mappe Schwierigkeit
                difficulty_map = {
                    'beginner': 'Anfänger',
                    'intermediate': 'Fortgeschritten',
                    'expert': 'Profi'
                }

                new_workout = Workout(
                    name=exercise.get('name', 'Unbekannte Übung'),
                    description=exercise.get('instructions', ''),
                    difficulty=difficulty_map.get(exercise.get('difficulty', 'beginner'), 'Anfänger'),
                    category=exercise.get('type', 'Allgemein'),
                    api_exercise_id=exercise.get('name'),
                    duration=10  # Standardwert, kann angepasst werden
                )
                db.session.add(new_workout)
                saved_count += 1

        db.session.commit()
        return saved_count

    @staticmethod
    def subscribe_user_to_workout(user_id, workout_id):
        """Abonniert ein Workout für einen User"""
        user = User.query.get(user_id)
        workout = Workout.query.get(workout_id)

        if not user or not workout:
            return False, "User oder Workout nicht gefunden"

        if workout in user.subscribed_workouts:
            return False, "Workout bereits abonniert"

        user.subscribed_workouts.append(workout)
        db.session.commit()
        return True, "Erfolgreich abonniert"

    @staticmethod
    def unsubscribe_user_from_workout(user_id, workout_id):
        """Entfernt ein Workout-Abonnement"""
        user = User.query.get(user_id)
        workout = Workout.query.get(workout_id)

        if not user or not workout:
            return False, "User oder Workout nicht gefunden"

        if workout not in user.subscribed_workouts:
            return False, "Workout nicht abonniert"

        user.subscribed_workouts.remove(workout)
        db.session.commit()
        return True, "Erfolgreich deabonniert"

    @staticmethod
    def get_user_workouts(user_id):
        """Holt alle abonnierten Workouts eines Users"""
        user = User.query.get(user_id)
        if not user:
            return []
        return user.subscribed_workouts


@app.post("/register")
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email und Passwort werden benötigt"}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({"error": "Benutzer existiert bereits"}), 400

    pwd_hash = generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)
    new_user = User(email=email, hash_password=pwd_hash)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"ok": True, "message": "Benutzer erfolgreich erstellt"})


@app.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.hash_password, password):
        return jsonify({"error": "Ungültige Anmeldedaten"}), 401

    access, access_payload = create_jwt(user.id, "access", ACCESS_TTL)
    refresh, refresh_payload = create_jwt(user.id, "refresh", REFRESH_TTL)

    resp = make_response({
        "access_token": access,
        "user_id": user.id,
        "email": user.email
    })
    return resp


@app.route('/workouts', methods=['GET'])
def get_workouts():
    """Holt alle Workouts aus der Datenbank"""
    try:
        workouts = Workout.query.all()
        return jsonify([{
            'id': w.id,
            'name': w.name,
            'description': w.description,
            'duration': w.duration,
            'difficulty': w.difficulty,
            'category': w.category
        } for w in workouts])
    except Exception as e:
        print(f"Workouts error: {str(e)}")
        return jsonify({'message': 'Fehler beim Abrufen der Workouts'}), 500



@app.route('/workouts/api', methods=['GET'])
def get_exercises_from_api():
    """Holt Exercises von API Ninjas und speichert sie"""
    try:
        muscle = request.args.get('muscle')
        difficulty = request.args.get('difficulty')
        type = request.args.get('type')

        exercises = WorkoutService.fetch_exercises_from_api(muscle, difficulty, type)
        saved_count = WorkoutService.save_exercises_to_db(exercises)

        return jsonify({
            'message': f'{saved_count} neue Exercises gespeichert',
            'total_from_api': len(exercises),
            'exercises': exercises[:10]  # Nur erste 10 anzeigen
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# NEUE ROUTE HIER EINFÜGEN
@app.route('/external-workouts', methods=['GET'])
def get_external_workouts():
    """Holt Exercises direkt von API Ninjas ohne sie in der DB zu speichern"""
    try:
        muscle = request.args.get('muscle')
        difficulty = request.args.get('difficulty')
        type = request.args.get('type')

        exercises = WorkoutService.fetch_exercises_from_api(muscle, difficulty, type)

        return jsonify({
            'total_exercises': len(exercises),
            'exercises': exercises
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/workouts/subscribe', methods=['POST'])
def subscribe_workout():
    """Abonniert ein Workout für den eingeloggten User"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        workout_id = data.get('workout_id')

        if not user_id or not workout_id:
            return jsonify({'error': 'User ID und Workout ID benötigt'}), 400

        success, message = WorkoutService.subscribe_user_to_workout(user_id, workout_id)

        return jsonify({'success': success, 'message': message})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/workouts/unsubscribe', methods=['POST'])
def unsubscribe_workout():
    """Entfernt Workout-Abonnement"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        workout_id = data.get('workout_id')

        if not user_id or not workout_id:
            return jsonify({'error': 'User ID und Workout ID benötigt'}), 400

        success, message = WorkoutService.unsubscribe_user_from_workout(user_id, workout_id)

        return jsonify({'success': success, 'message': message})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/user/<int:user_id>/workouts', methods=['GET'])
def get_user_workouts(user_id):
    """Holt alle abonnierten Workouts eines Users"""
    try:
        workouts = WorkoutService.get_user_workouts(user_id)
        return jsonify([{
            'id': w.id,
            'name': w.name,
            'description': w.description,
            'duration': w.duration,
            'difficulty': w.difficulty,
            'category': w.category
        } for w in workouts])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/workouts', methods=['POST'])
def create_workout():
    """Erstellt ein neues Workout (manuell)"""
    try:
        data = request.get_json()
        workout = Workout(
            name=data['name'],
            description=data.get('description', ''),
            duration=data.get('duration', 30),
            difficulty=data.get('difficulty', 'Anfänger'),
            category=data.get('category', 'Allgemein')
        )
        db.session.add(workout)
        db.session.commit()
        return jsonify({'message': 'Workout created!', 'id': workout.id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Initialisiere einige Beispiel-Workouts
@app.before_request
def create_tables():
    db.create_all()

    # Füge einige Beispiel-Workouts hinzu falls keine vorhanden
    if Workout.query.count() == 0:
        sample_workouts = [
            Workout(name="Basic Training", description="Einfaches Ganzkörpertraining",
                    duration=30, difficulty="Anfänger", category="Strength"),
            Workout(name="Yoga Flow", description="Entspannendes Yoga Programm",
                    duration=45, difficulty="Anfänger", category="Yoga"),
        ]
        db.session.add_all(sample_workouts)
        db.session.commit()

print(f"API_NINJAS_KEY: {API_NINJAS_KEY}")


if __name__ == "__main__":
    app.run(port=os.getenv("PORT", 5001), debug=True, host="0.0.0.0")