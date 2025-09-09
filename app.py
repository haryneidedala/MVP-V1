from flask import request, jsonify
from models import db, Workout

@app.route('/workouts', methods=['GET'])
def get_workouts():
    workouts = Workout.query.all()
    return jsonify([{
        'id': w.id,
        'name': w.name,
        'description': w.description
    } for w in workouts])

@app.route('/workouts', methods=['POST'])
def create_workout():
    data = request.get_json()
    workout = Workout(
        name=data['name'],
        description=data['description'],
        duration=data['duration'],
        difficulty=data['difficulty']
    )
    db.session.add(workout)
    db.session.commit()
    return jsonify({'message': 'Workout created!'}), 201