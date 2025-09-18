from flask import request, jsonify, Flask
from datetime import datetime
## from models import db, Workout
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

load_dotenv()

app = Flask(__name__)
# CORS für Frontend auf Port 3001 erlauben
CORS(app, resources={r"/*": {"origins": "http://localhost:3001"}})


app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///profiles.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

class Workout(db.Model): # <- Sagt: "Erstelle eine Workout-Tabelle"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) ## <- Wie eine Excel-Spalte für Text
    description = db.Column(db.Text) # <- eine Spalte für Beschreibung
    duration = db.Column(db.Integer) ## <- Eine Spalte für Zahlen
    difficulty = db.Column(db.Enum('Anfänger', 'Fortgeschritten', 'Profi'))
    # created_by = db.Column(db.Integer, db.ForeignKey('user.id'))  # Falls User-Tabelle existiert
    created_at = db.Column(db.DateTime, default=datetime.now)

with app.app_context():
    db.create_all()

@app.route('/workouts', methods=['GET'])
@jwt_required()
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
    if not User.query.filter_by(email='test@example.com').first():
        test_user = User(email='test@example.com', name='Testbenutzer')
        test_user.set_password('password123')
        db.session.add(test_user)
        db.session.commit()
        print("Testbenutzer erstellt: test@example.com / password123")

if __name__ == "__main__":
    app.run(port=os.getenv("PORT"), debug=True, host="0.0.0.0")
