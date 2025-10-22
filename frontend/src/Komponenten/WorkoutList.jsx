import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./WorkoutList.css";

const WorkoutList = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();

  console.log(user);

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        setLoading(true);

        // Mock-Daten für Testzwecke
        // if (import.meta.env.VITE_USE_MOCK === 'true') {
        if (false) {
          setTimeout(() => {
            const mockWorkouts = [
              {
                id: 1,
                name: "Krafttraining Mock",
                description: "Intensives Training für alle Muskelgruppen",
                duration: 60,
                difficulty: "Intermediate",
              },
              {
                id: 2,
                name: "Yoga Flow Mock",
                description: "Entspannende Yoga-Übungen für Flexibilität",
                duration: 45,
                difficulty: "Beginner",
              },
              {
                id: 3,
                name: "HIIT Workout Mock",
                description: "Hochintensives Intervalltraining für Ausdauer",
                duration: 30,
                difficulty: "Advanced",
              },
            ];
            setWorkouts(mockWorkouts);
            setLoading(false);
          }, 1000);
          return;
        }

        // Echter API-Aufruf
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5001/user/${user}/workouts`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            logout();
            throw new Error(
              "Nicht autorisiert. Bitte melden Sie sich erneut an."
            );
          }
          throw new Error("Workouts konnten nicht geladen werden");
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
  }, [logout]);

  const handleLogout = () => {
    logout();
  };

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
      <header className="workout-header">
        <h1>SERIOUS SATURDAY</h1>
        <div className="user-info">
          <span>Hallo, {user?.name}</span>
          <button onClick={handleLogout} className="logout-btn">
            Abmelden
          </button>
        </div>
      </header>

      <div className="workouts-content">
        <h2>Meine Workouts</h2>

        {workouts.length === 0 ? (
          <div className="no-workouts">
            <p>Noch keine Workouts vorhanden.</p>
            <button className="primary-button">Erstes Workout erstellen</button>
          </div>
        ) : (
          <div className="workout-grid">
            {workouts.map((workout) => (
              <div key={workout.id} className="workout-card">
                <div className="workout-header">
                  <h3>{workout.name}</h3>
                  <span
                    className={`difficulty-badge ${workout.difficulty?.toLowerCase()}`}
                  >
                    {workout.difficulty || "Unbekannt"}
                  </span>
                </div>

                <div className="workout-details">
                  <p className="workout-description">
                    {workout.description || "Keine Beschreibung verfügbar"}
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
    </div>
  );
};

export default WorkoutList;
