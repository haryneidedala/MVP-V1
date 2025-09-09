from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Workout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    duration = db.Column(db.Integer)
    difficulty = db.Column(db.Enum('Beginner', 'Intermediate', 'Advanced'))
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))  # Falls User-Tabelle existiert
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Workout {self.name}>'