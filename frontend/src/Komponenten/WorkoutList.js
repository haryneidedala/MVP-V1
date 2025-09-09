import React, { useState, useEffect } from 'react';
import './WorkoutList.css';

const WorkoutList = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Workouts von der API abrufen
  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/workouts');

        if (!response.ok) {
          throw new Error('Workouts konnten nicht geladen werden');
        }

        const data = await response.json();
        setWorkouts(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkouts();
  }, []);

  if (loading) {
    return (
      <div className="workout-container">
        <div className="loading">Lade Workouts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workout-container">
        <div className="error">Fehler: {error}</div>
      </div>
    );
  }

  return (
    <div className="workout-container">
      <h2>Meine Workouts</h2>

      {workouts.length === 0 ? (
        <div className="no-workouts">
          <p>Noch keine Workouts vorhanden.</p>
          <button className="primary-button">Erstes Workout erstellen</button>
        </div>
      ) : (
        <div className="workout-grid">
          {workouts.map(workout => (
            <div key={workout.id} className="workout-card">
              <div className="workout-header">
                <h3>{workout.name}</h3>
                <span className={`difficulty-badge ${workout.difficulty?.toLowerCase()}`}>
                  {workout.difficulty || 'Unbekannt'}
                </span>
              </div>

              <div className="workout-details">
                <p className="workout-description">
                  {workout.description || 'Keine Beschreibung verfügbar'}
                </p>

                <div className="workout-meta">
                  <span className="duration">
                    ⏱️ {workout.duration} Minuten
                  </span>
                </div>
              </div>

              <div className="workout-actions">
                <button className="secondary-button">Starten</button>
                <button className="text-button">Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutList;