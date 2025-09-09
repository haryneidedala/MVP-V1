from flask import request, jsonify
from models import db, Workout

@app.route('/workouts', methods=['GET'])
def get_workouts():
    workouts = Workout.query.all() # <- Holt alle Workouts aus der Tabelle
    return jsonify([{
        'id': w.id,
        'name': w.name,
        'description': w.description
    } for w in workouts])                   # <- Sendet sie als JSON zurück (wie ein Paket)

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