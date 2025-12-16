import { useState, useEffect } from "react";
import "./LocalWorkoutList.css";

const LocalWorkoutList = ({ userId, onWorkoutSubscribed }) => {
  const [workouts, setWorkouts] = useState([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [userStreaks, setUserStreaks] = useState([]); // Initialisiere als Array
  const [streakStats, setStreakStats] = useState(null);

  // Lade Workouts aus lokaler DB
  useEffect(() => {
    loadWorkouts();
    if (userId) {
      loadUserStreaks();
      loadStreakStats();
    }
  }, [userId]); // userId als Dependency hinzugefügt

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:5001/workouts");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Geladene Workouts:", data);

      setWorkouts(data);
      setFilteredWorkouts(data);
    } catch (err) {
      console.error("Fehler beim Laden der Workouts:", err);
      setError("Fehler beim Laden der Workouts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStreaks = async () => {
    try {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch("http://localhost:5001/streaks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserStreaks(data.workouts || []);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Streaks:", error);
    }
  };

  const loadStreakStats = async () => {
    try {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch("http://localhost:5001/streaks/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStreakStats(data.stats);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Streak-Statistiken:", error);
    }
  };

  // Diese Funktion muss AUßERHALB von loadStreakStats definiert werden
  const getWorkoutStreak = (workoutId) => {
    // Da userStreaks ein Array von Objekten ist (kein Object)
    const workoutStreak = userStreaks.find((w) => w.workout_id === workoutId);
    return workoutStreak ? workoutStreak.current_streak : 0;
  };

  const handleLogWorkout = async (workoutId, workoutName) => {
    try {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");

      const response = await fetch("http://localhost:5001/streaks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: workoutId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `✅ "${workoutName}" als erledigt geloggt!\nAktueller Streak: ${data.current_streak} Tage`
        );
        loadUserStreaks();
        loadStreakStats();
      } else {
        alert(`❌ Fehler: ${data.error}`);
      }
    } catch (error) {
      console.error("Fehler beim Loggen des Workouts:", error);
      alert(`❌ Fehler: ${error.message}`);
    }
  };

  const handleSubscribe = async (workoutId, workoutName) => {
    try {
      console.log("Abonniere Workout:", workoutId, workoutName);

      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");

      if (!token) {
        alert("🔒 Bitte erneut einloggen.");
        window.location.href = "/login";
        return;
      }

      const response = await fetch("http://localhost:5001/workouts/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          workout_id: workoutId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✓ "${workoutName}" erfolgreich abonniert!`);
        if (onWorkoutSubscribed) {
          onWorkoutSubscribed();
        }
      } else {
        alert(`❌ Fehler: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error("Abonnement fehlgeschlagen:", error);
      alert(`❌ Fehler: ${error.message}`);
    }
  };

  // Filter-Funktion
  const applyFilters = () => {
    let filtered = workouts;

    if (searchTerm) {
      filtered = filtered.filter(
        (workout) =>
          workout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (workout.description &&
            workout.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (workout) => workout.category === selectedCategory
      );
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(
        (workout) => workout.difficulty === selectedDifficulty
      );
    }

    setFilteredWorkouts(filtered);
  };

  // Filter anwenden bei Änderungen
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, selectedDifficulty, workouts]);

  const categories = [
    ...new Set(workouts.map((w) => w.category).filter(Boolean)),
  ];
  const difficulties = [
    ...new Set(workouts.map((w) => w.difficulty).filter(Boolean)),
  ];

  return (
    <div className="local-workout-list">
      <h2>Workouts aus lokaler Datenbank</h2>

      {/* Filter-Bereich */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Workouts suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-selectors">
          <div className="filter-group">
            <label>Kategorie:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Schwierigkeit:</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">Alle Schwierigkeiten</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("");
              setSelectedDifficulty("");
            }}
          >
            Filter zurücksetzen
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="workouts-container">
        {loading ? (
          <div className="loading">Lade Workouts aus der Datenbank...</div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="no-workouts">
            {searchTerm || selectedCategory || selectedDifficulty
              ? "Keine Workouts mit den aktuellen Filtern gefunden"
              : "Keine Workouts in der Datenbank"}
          </div>
        ) : (
          <>
            <div className="workouts-header">
              <h3>Verfügbare Workouts ({filteredWorkouts.length})</h3>
              <button className="btn btn-small" onClick={loadWorkouts}>
                🔄 Aktualisieren
              </button>
            </div>

            {streakStats && (
              <div className="streak-stats">
                <h3>🔥 Deine Streak-Statistik</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Aktueller Streak</span>
                    <span className="stat-value">
                      {streakStats.current_streak} Tage
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Längster Streak</span>
                    <span className="stat-value">
                      {streakStats.longest_streak} Tage
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Workouts insgesamt</span>
                    <span className="stat-value">
                      {streakStats.total_workouts_logged}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="workouts-grid">
              {filteredWorkouts.map((workout) => (
                <div key={workout.id} className="workout-card">
                  <div className="workout-header">
                    <h4>{workout.name}</h4>
                    <div className="workout-meta">
                      <span
                        className={`difficulty difficulty-${workout.difficulty?.toLowerCase()}`}
                      >
                        {workout.difficulty}
                      </span>
                      <span className="category">{workout.category}</span>
                      {workout.duration && (
                        <span className="duration">
                          ⏱ {workout.duration}min
                        </span>
                      )}
                    </div>
                  </div>

                  {workout.description && (
                    <p className="workout-description">{workout.description}</p>
                  )}

                  <button
                    className="subscribe-btn"
                    onClick={() => handleSubscribe(workout.id, workout.name)}
                  >
                    📌 Workout abonnieren
                  </button>

                  {/* Streak-Button innerhalb der Workout-Card */}
                  <button
                    className="streak-btn"
                    onClick={() => handleLogWorkout(workout.id, workout.name)}
                    title="Workout als heute erledigt markieren"
                  >
                    🔥 Streak: {getWorkoutStreak(workout.id)} Tage
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LocalWorkoutList;
