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
ACCESS_TTL = 15 * 60 * 60  # 15 minutes
REFRESH_TTL = 14 * 24 * 3600  # 14 days
API_NINJAS_KEY = os.environ.get("API_NINJAS_KEY", "KFh/eSdyskwnqd89xJJxsw==Jx3kGhfznAFGLGgm")
print(JWT_SECRET)
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
    print(payload)
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token, payload


from functools import wraps


def token_required(f):
    """Decorator für Token-geschützte Endpoints"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')

        # Prüfe Authorization Header
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            print(f"🔐 Token aus Header: {token[:30]}...")

        # Prüfe Cookies
        if not token:
            token = request.cookies.get('access_token')
            print(f"🍪 Token aus Cookie: {'Ja' if token else 'Nein'}")

        if not token:
            print("❌ Kein Token gefunden")
            return jsonify({'error': 'Token fehlt'}), 401

        try:
            # Token dekodieren
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id_str = payload.get('sub')

            if not user_id_str:
                return jsonify({'error': 'Ungültiger Token'}), 401

            # Konvertiere zu Integer und setze in request
            request.user_id = int(user_id_str)
            print(f"✅ Token validiert für User ID: {request.user_id}")

        except jwt.ExpiredSignatureError:
            print("❌ Token abgelaufen")
            return jsonify({'error': 'Token abgelaufen'}), 401
        except jwt.InvalidTokenError as e:
            print(f"❌ Ungültiges Token: {e}")
            return jsonify({'error': 'Ungültiges Token'}), 401
        except Exception as e:
            print(f"❌ Token Fehler: {e}")
            return jsonify({'error': 'Token Fehler'}), 401

        return f(*args, **kwargs)

    return decorated_function

db = SQLAlchemy(app)

# Assoziationstabelle für M:N-Beziehung
user_workouts = db.Table('user_workouts',
                         db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
                         db.Column('workout_id', db.Integer, db.ForeignKey('workouts.id'), primary_key=True),
                         db.Column('created_at', db.DateTime, default=datetime.now),
                         db.Column('is_favorite', db.Boolean, default=False),
                         db.Column('progress', db.Integer, default=0)  # 0-100%
                         )


class Workout(db.Model):
    __tablename__ = 'workouts'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    duration = db.Column(db.Integer)
    difficulty = db.Column(db.Enum('Anfänger', 'Fortgeschritten', 'Profi', 'beginner', 'intermediate', 'expert'))
    category = db.Column(db.String(50))
    api_exercise_id = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.now)

    subscribed_users = db.relationship(
        'User',
        secondary=user_workouts,
        back_populates='subscribed_workouts'
    )


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    name = db.Column(db.String(100))  # Name-Feld hinzugefügt
    hash_password = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.now)

    subscribed_workouts = db.relationship(
        'Workout',
        secondary=user_workouts,
        back_populates='subscribed_users'
    )


# Datenbank initialisieren und Name-Spalte hinzufügen falls nötig
with app.app_context():
    try:
        # Versuche die name-Spalte hinzuzufügen
        db.session.execute('ALTER TABLE user ADD COLUMN name VARCHAR(100)')
        db.session.commit()
        print("Name-Spalte zur User-Tabelle hinzugefügt")
    except Exception as e:
        print(f"Spalte existiert bereits oder Fehler: {e}")
        db.session.rollback()

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

            response = requests.get(url, headers=headers, params=params, timeout=10)

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
            existing = Workout.query.filter_by(
                name=exercise.get('name'),
                api_exercise_id=exercise.get('name')
            ).first()

            if not existing:
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
                    duration=10
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
        try:
            from sqlalchemy.orm import joinedload
            
            user = User.query.options(joinedload(User.subscribed_workouts)).get(user_id)
            if not user:
                print(f" User {user_id} nicht in Datenbank gefunden")
                return []
            
            workouts = user.subscribed_workouts
            print(f" User {user_id} hat {len(workouts)} abonnierte Workouts")
            
            for workout in workouts:
                print(f"   - {workout.name} (ID: {workout.id})")
                
            return workouts
            
        except Exception as e:
            print(f" Fehler in get_user_workouts Service: {str(e)}")
            return []


# Streak-Tabelle
class StreakExercise(db.Model):
    __tablename__ = 'streak_exercises'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationships
    user = db.relationship('User', backref=db.backref('streak_activities', lazy=True))
    workout = db.relationship('Workout', backref=db.backref('streak_activities', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'workout_id': self.workout_id,
            'timestamp': self.timestamp.isoformat(),
            'workout_name': self.workout.name if self.workout else None
        }


def check_and_refresh_token():
    """Prüft Token und refreshed wenn nötig - für längere Sessions"""
    token = None
    auth_header = request.headers.get('Authorization')

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]

    if not token:
        token = request.cookies.get('access_token')

    if not token:
        return None

    try:
        # Versuche Token zu dekodieren
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return int(payload.get('sub'))
    except jwt.ExpiredSignatureError:
        print("⚠️ Access Token abgelaufen, versuche Refresh...")
        # Token ist abgelaufen, aber das ist okay für manche Endpoints
        # Wir geben None zurück, der Endpoint kann entscheiden ob er Refresh versucht
        return None
    except Exception as e:
        print(f"❌ Token Fehler: {e}")
        return None



# Streaks mit cookies
def get_current_user_id():
    """Extrahiert user_id aus JWT Token, versucht Refresh wenn abgelaufen"""
    token = None
    auth_header = request.headers.get('Authorization')

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        print(f"✅ Token aus Header: {token[:30]}...")

    if not token:
        token = request.cookies.get('access_token')
        print(f"🔄 Token aus Cookie: {'Ja' if token else 'Nein'}")

    if not token:
        print("❌ Kein Token gefunden")
        return None

    try:
        # Token dekodieren
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = int(payload.get('sub'))
        print(f"✅ Token gültig, User ID: {user_id}")
        return user_id

    except jwt.ExpiredSignatureError:
        print("⚠️ Access Token abgelaufen")
        # Hier könnten wir einen automatischen Refresh versuchen
        # Aber für einfache Logik geben wir None zurück
        return None
    except Exception as e:
        print(f"❌ Token Fehler: {e}")
        return None

def calculate_streak_for_workout(user_id, workout_id):
    """Berechnet aktuelle Streak-Länge für ein Workout"""
    from datetime import date, timedelta

    # Hole alle Streak-Einträge für dieses Workout und User
    streaks = StreakExercise.query.filter_by(
        user_id=user_id,
        workout_id=workout_id
    ).order_by(StreakExercise.timestamp.desc()).all()

    if not streaks:
        return 0

    # Konvertiere zu Datums-Objekten (ohne Uhrzeit)
    streak_dates = set()
    for streak in streaks:
        streak_date = streak.timestamp.date()
        streak_dates.add(streak_date)

    # Sortiere Datumsliste absteigend
    sorted_dates = sorted(streak_dates, reverse=True)

    # Berechne aktuelle Streak-Länge
    current_streak = 0
    current_date = date.today()

    # Prüfe ob heute schon ein Eintrag existiert
    if sorted_dates[0] == current_date:
        current_streak = 1
        # Gehe zurück und prüfe aufeinanderfolgende Tage
        for i in range(1, len(sorted_dates)):
            expected_date = current_date - timedelta(days=i)
            if sorted_dates[i] == expected_date:
                current_streak += 1
            else:
                break
    # Prüfe ob gestern ein Eintrag existiert (Streak läuft noch)
    elif sorted_dates[0] == current_date - timedelta(days=1):
        current_streak = 1
        # Gehe weiter zurück
        for i in range(1, len(sorted_dates)):
            expected_date = (current_date - timedelta(days=1)) - timedelta(days=i - 1)
            if sorted_dates[i] == expected_date:
                current_streak += 1
            else:
                break

    return current_streak


def get_streak_stats(user_id):
    """Gibt allgemeine Streak-Statistiken zurück"""
    from datetime import date, timedelta

    # Alle Streaks des Users
    all_streaks = StreakExercise.query.filter_by(user_id=user_id).all()

    if not all_streaks:
        return {
            'total_workouts_logged': 0,
            'current_streak': 0,
            'longest_streak': 0,
            'today_logged': False
        }

    # Konvertiere zu Datums-Set
    streak_dates = set()
    for streak in all_streaks:
        streak_dates.add(streak.timestamp.date())

    sorted_dates = sorted(streak_dates)

    # Berechne längsten Streak
    longest_streak = 1
    current_run = 1

    for i in range(1, len(sorted_dates)):
        if sorted_dates[i] == sorted_dates[i - 1] + timedelta(days=1):
            current_run += 1
            longest_streak = max(longest_streak, current_run)
        else:
            current_run = 1

    # Berechne aktuellen Streak
    current_streak = calculate_current_streak(sorted_dates)

    return {
        'total_workouts_logged': len(all_streaks),
        'current_streak': current_streak,
        'longest_streak': longest_streak,
        'today_logged': date.today() in streak_dates,
        'streak_dates': [d.isoformat() for d in sorted_dates[-10:]]  # Letzte 10 Tage
    }


def calculate_current_streak(sorted_dates):
    """Berechnet aktuelle aufeinanderfolgende Tage"""
    from datetime import date, timedelta

    if not sorted_dates:
        return 0

    current_streak = 0
    current_date = date.today()

    # Wenn der letzte Eintrag heute ist
    if sorted_dates[-1] == current_date:
        current_streak = 1
        # Zähle zurück
        check_date = current_date - timedelta(days=1)
        for d in reversed(sorted_dates[:-1]):
            if d == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
    # Wenn der letzte Eintrag gestern war
    elif sorted_dates[-1] == current_date - timedelta(days=1):
        current_streak = 1
        check_date = current_date - timedelta(days=2)
        for d in reversed(sorted_dates[:-1]):
            if d == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            else:
                break

    return current_streak

@app.post("/register")
def register():
    data = request.get_json() or {}
    print(f"Registrierungsdaten erhalten: {data}")

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = data.get("name") or ""

    if not email or not password:
        print("Fehler: Email und Passwort werden benötigt")
        return jsonify({"error": "Email und Passwort werden benötigt"}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        print(f"Benutzer {email} existiert bereits")
        return jsonify({"error": "Benutzer existiert bereits"}), 400

    pwd_hash = generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)
    new_user = User(email=email, name=name, hash_password=pwd_hash)  # Name wird gespeichert
    db.session.add(new_user)
    db.session.commit()

    print(f"Benutzer erfolgreich erstellt: {email}")
    return jsonify({
        "ok": True,
        "message": "Benutzer erfolgreich erstellt",
        "user_id": new_user.id
    })

@app.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.hash_password, password):
        return jsonify({"error": "Ungültige Anmeldedaten"}), 401

    access, access_payload = create_jwt(str(user.id), "access", ACCESS_TTL)
    refresh, refresh_payload = create_jwt(str(user.id), "refresh", REFRESH_TTL)

    resp = make_response({
        "access_token": access,
        "user_id": user.id,
        "email": user.email,
        "name": user.name
    })

    # Set cookies for tokens
    resp.set_cookie(
        'access_token',
        access,
        httponly=True,
        secure=False,
        samesite='Lax',
        max_age=ACCESS_TTL
    )
    resp.set_cookie(
        'refresh_token',
        refresh,
        httponly=True,
        secure=False,
        samesite='Lax',
        max_age=REFRESH_TTL
    )

    print(f"Login erfolgreich für {email}")
    return resp


@app.route('/workouts', methods=['GET'])
def get_workouts():
    try:
        print("🔍 /workouts Route aufgerufen")


        workouts = Workout.query.all()

        print(f"📊 Anzahl Workouts in DB: {len(workouts)}")

        # Erstelle JSON-Antwort
        workout_list = []
        for w in workouts:
            workout_data = {
                'id': w.id,
                'name': w.name,
                'description': w.description or '',
                'duration': w.duration,
                'difficulty': w.difficulty,
                'category': w.category
            }
            workout_list.append(workout_data)

        print(f"✅ Sende {len(workout_list)} Workouts als JSON")
        return jsonify(workout_list)

    except Exception as e:
        print(f" Fehler: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/workouts/api', methods=['GET'])
def get_exercises_from_api():
    try:
        muscle = request.args.get('muscle')
        difficulty = request.args.get('difficulty')
        type = request.args.get('type')

        exercises = WorkoutService.fetch_exercises_from_api(muscle, difficulty, type)
        saved_count = WorkoutService.save_exercises_to_db(exercises)

        return jsonify({
            'message': f'{saved_count} neue Exercises gespeichert',
            'total_from_api': len(exercises),
            'exercises': exercises[:10]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/external-workouts', methods=['GET'])
def get_external_workouts():
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
    try:
        data = request.get_json()
        print(f"📥 Subscribe Request erhalten: {data}")

        user_id = data.get('user_id')
        workout_id = data.get('workout_id')

        if not user_id or not workout_id:
            return jsonify({'error': 'User ID und Workout ID benötigt'}), 400

        try:
            user_id = int(user_id)
            workout_id = int(workout_id)
        except ValueError:
            return jsonify({'error': 'IDs müssen Zahlen sein'}), 400

        user = User.query.get(user_id)
        workout = Workout.query.get(workout_id)

        if not user:
            return jsonify({'error': f'User mit ID {user_id} nicht gefunden'}), 404

        if not workout:
            return jsonify({'error': f'Workout mit ID {workout_id} nicht gefunden'}), 404

        if workout in user.subscribed_workouts:
            return jsonify({'success': False, 'message': 'Workout bereits abonniert'}), 400

        user.subscribed_workouts.append(workout)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Erfolgreich abonniert',
            'workout': {
                'id': workout.id,
                'name': workout.name
            }
        })

    except Exception as e:
        print(f"🔥 FEHLER in subscribe_workout: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/workouts/unsubscribe', methods=['POST'])
def unsubscribe_workout():
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
    try:
        print(f"Lade Workout für User {user_id}")

        user = User.query.get(user_id)
        if not user:
            print(f"User {user_id} nicht gefunden")
            return jsonify({'error': 'User nicht gefunden'}), 404
        else:
            print(f"User {user_id} gefunden")

        workouts = WorkoutService.get_user_workouts(user_id)
        print(f"Gefundene Workouts: {len(workouts)}")

        workout_list = [{
            'id': w.id,
            'name': w.name,
            'description': w.description,
            'duration': w.duration,
            'difficulty': w.difficulty,
            'category': w.category
        } for w in workouts]

        return jsonify({
            'success': True,
            'workouts': workout_list,
            'count': len(workouts)

        })

    except Exception as e:
        print(f"Fehler in get_user_workouts: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)

        }), 500

@app.route('/workouts', methods=['POST'])
def create_workout():
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


def initialize_database():
    """Manuelle Datenbankinitialisierung"""
    with app.app_context():
        db.create_all()  # Erstellt alle Tabellen inklusive streak_exercises

        if Workout.query.count() == 0:
            sample_workouts = [
                Workout(name="Basic Training", description="Einfaches Ganzkörpertraining",
                        duration=30, difficulty="Anfänger", category="Strength"),
                Workout(name="Yoga Flow", description="Entspannendes Yoga Programm",
                        duration=45, difficulty="Anfänger", category="Yoga"),
            ]
            db.session.add_all(sample_workouts)
            db.session.commit()
            print(f" {len(sample_workouts)} Beispiel-Workouts hinzugefügt")
        else:
            print(f" Datenbank hat bereits {Workout.query.count()} Workouts")

        # Optional: Zeige auch Streak-Tabelle an
        streak_count = StreakExercise.query.count()
        print(f" Streak-Tabelle hat {streak_count} Einträge")


@app.route('/streaks', methods=['POST'])
def add_streak():
    """Fügt einen Streak-Eintrag hinzu - mit Cookie-Fallback"""
    try:
        # 1. Versuche aus Token
        user_id = get_current_user_id()

        # 2. Fallback: User ID aus Request Body (für einfache Entwicklung)
        if not user_id:
            data = request.get_json()
            user_id = data.get('user_id')

            if user_id:
                try:
                    user_id = int(user_id)
                    print(f"⚠️ User ID aus Body (Fallback): {user_id}")
                except:
                    return jsonify({'error': 'Ungültige User ID'}), 400
            else:
                return jsonify({'error': 'Nicht authentifiziert'}), 401

        data = request.get_json()
        workout_id = data.get('workout_id')

        if not workout_id:
            return jsonify({'error': 'workout_id wird benötigt'}), 400

        # Prüfe ob Workout existiert
        workout = Workout.query.get(workout_id)
        if not workout:
            return jsonify({'error': 'Workout nicht gefunden'}), 404

        # Prüfe ob User existiert
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User nicht gefunden'}), 404

        # Optional: Prüfe ob abonniert
        if workout not in user.subscribed_workouts:
            return jsonify({
                'warning': 'Workout nicht abonniert, aber trotzdem geloggt',
                'subscribe_recommended': True
            })

        # Prüfe ob heute schon ein Eintrag existiert
        from datetime import date
        today = date.today()

        existing_today = StreakExercise.query.filter(
            StreakExercise.user_id == user_id,
            StreakExercise.workout_id == workout_id,
            db.func.date(StreakExercise.timestamp) == today
        ).first()

        if existing_today:
            return jsonify({
                'message': 'Workout heute bereits geloggt',
                'streak': existing_today.to_dict()
            }), 200

        # Neuen Streak-Eintrag
        new_streak = StreakExercise(
            user_id=user_id,
            workout_id=workout_id,
            timestamp=datetime.now()
        )

        db.session.add(new_streak)
        db.session.commit()

        current_streak = calculate_streak_for_workout(user_id, workout_id)

        return jsonify({
            'success': True,
            'message': 'Streak erfolgreich hinzugefügt',
            'streak': new_streak.to_dict(),
            'current_streak': current_streak
        }), 201

    except Exception as e:
        print(f"Fehler in add_streak: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/streaks', methods=['GET'])
def get_streaks():
    """Holt alle Streaks des aktuellen Users"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Nicht authentifiziert'}), 401

        # Optionale Filter
        workout_id = request.args.get('workout_id')
        limit = request.args.get('limit', 50, type=int)

        query = StreakExercise.query.filter_by(user_id=user_id)

        if workout_id:
            query = query.filter_by(workout_id=workout_id)

        # Sortiere nach neuesten zuerst
        streaks = query.order_by(StreakExercise.timestamp.desc()).limit(limit).all()

        # Gruppiere nach Workout für bessere Übersicht
        streaks_by_workout = {}
        for streak in streaks:
            if streak.workout_id not in streaks_by_workout:
                streaks_by_workout[streak.workout_id] = {
                    'workout_id': streak.workout_id,
                    'workout_name': streak.workout.name if streak.workout else 'Unbekannt',
                    'current_streak': calculate_streak_for_workout(user_id, streak.workout_id),
                    'total_entries': 0,
                    'entries': []
                }

            streaks_by_workout[streak.workout_id]['entries'].append(streak.to_dict())
            streaks_by_workout[streak.workout_id]['total_entries'] += 1

        # Konvertiere zu Liste
        workout_list = list(streaks_by_workout.values())

        # Füge Statistik hinzu
        stats = get_streak_stats(user_id)

        return jsonify({
            'success': True,
            'stats': stats,
            'workouts': workout_list,
            'total_streaks': len(streaks)
        })

    except Exception as e:
        print(f"Fehler in get_streaks: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/streaks/stats', methods=['GET'])
def get_streak_stats_route():
    """Holt Streak-Statistiken"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Nicht authentifiziert'}), 401

        stats = get_streak_stats(user_id)

        return jsonify({
            'success': True,
            'stats': stats
        })

    except Exception as e:
        print(f"Fehler in get_streak_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/streaks/<int:streak_id>', methods=['DELETE'])
def delete_streak(streak_id):
    """Löscht einen Streak-Eintrag"""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Nicht authentifiziert'}), 401

        streak = StreakExercise.query.get(streak_id)

        if not streak:
            return jsonify({'error': 'Streak nicht gefunden'}), 404

        if streak.user_id != user_id:
            return jsonify({'error': 'Keine Berechtigung'}), 403

        db.session.delete(streak)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Streak gelöscht'
        })

    except Exception as e:
        print(f"Fehler in delete_streak: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.post('/refresh')
def refresh():
    """Erneuert einen abgelaufenen Access Token mit dem Refresh Token"""
    try:
        # Refresh Token aus Cookies holen
        refresh_token = request.cookies.get('refresh_token')

        if not refresh_token:
            return jsonify({'error': 'Refresh token fehlt'}), 401

        print(f"🔄 Refresh Token erhalten: {refresh_token[:30]}...")

        try:
            # Refresh Token validieren
            payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=["HS256"])

            # Prüfe ob es ein Refresh Token ist
            if payload.get('typ') != 'refresh':
                return jsonify({'error': 'Ungültiger Token-Typ'}), 401

            user_id_str = payload.get('sub')
            if not user_id_str:
                return jsonify({'error': 'Ungültiger Token'}), 401

            user_id = int(user_id_str)

            # Prüfe ob User existiert
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User nicht gefunden'}), 404

            # Neuen Access Token erstellen
            new_access, _ = create_jwt(str(user_id), "access", ACCESS_TTL)

            # Optional: Neuen Refresh Token erstellen (Rotation)
            new_refresh, new_refresh_payload = create_jwt(str(user_id), "refresh", REFRESH_TTL)

            resp = jsonify({
                'access_token': new_access,
                'user_id': user_id,
                'email': user.email,
                'name': user.name
            })

            # Neue Cookies setzen
            resp.set_cookie(
                'access_token',
                new_access,
                httponly=True,
                secure=False,
                samesite='Lax',
                max_age=ACCESS_TTL
            )

            # Optional: Refresh Token erneuern (Rotation)
            resp.set_cookie(
                'refresh_token',
                new_refresh,
                httponly=True,
                secure=False,
                samesite='Lax',
                max_age=REFRESH_TTL
            )

            print(f"✅ Token erneuert für User {user_id}")
            return resp

        except jwt.ExpiredSignatureError:
            print("❌ Refresh Token abgelaufen")
            return jsonify({'error': 'Refresh token abgelaufen, bitte neu anmelden'}), 401
        except jwt.InvalidTokenError as e:
            print(f"❌ Ungültiger Refresh Token: {e}")
            return jsonify({'error': 'Ungültiger refresh token'}), 401

    except Exception as e:
        print(f"❌ Fehler in refresh: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/streaks/weekly', methods=['GET'])
@token_required
def get_weekly_stats():
    """Gibt wöchentliche Aktivitätsdaten zurück"""
    try:
        user_id = request.user_id  # Vom Decorator gesetzt
        from datetime import datetime, timedelta

        print(f"📊 Lade wöchentliche Daten für User {user_id}")

        # Letzte 7 Tage berechnen
        weekly_data = []
        for i in range(6, -1, -1):  # Von vor 6 Tagen bis heute
            date = datetime.now() - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')

            # Zähle Streaks an diesem Tag
            count = StreakExercise.query.filter(
                StreakExercise.user_id == user_id,
                db.func.date(StreakExercise.timestamp) == date_str
            ).count()

            # Deutsche Wochentage
            german_days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
            day_name = german_days[date.weekday()]

            weekly_data.append({
                'day': day_name,
                'full_day': date.strftime('%A'),
                'date': date_str,
                'count': count,
                'is_today': i == 0
            })

        # Zusätzliche Statistiken
        total_this_week = sum(item['count'] for item in weekly_data)
        active_days = sum(1 for item in weekly_data if item['count'] > 0)

        # Besten Tag finden
        best_day = max(weekly_data, key=lambda x: x['count']) if weekly_data else None

        return jsonify({
            'success': True,
            'weekly_data': weekly_data,
            'stats': {
                'total_this_week': total_this_week,
                'active_days': active_days,
                'best_day': best_day['day'] if best_day and best_day['count'] > 0 else None,
                'best_day_count': best_day['count'] if best_day else 0,
                'average_per_day': round(total_this_week / 7, 1) if total_this_week > 0 else 0
            }
        })

    except Exception as e:
        print(f"❌ Fehler in get_weekly_stats: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

    
print(f"API_NINJAS_KEY: {API_NINJAS_KEY}")

# Manuell aufrufen oder beim Start
if __name__ == "__main__":
    initialize_database()  # HINZUFÜGEN
    app.run(port=os.getenv("PORT", 5002), debug=True, host="0.0.0.0")


