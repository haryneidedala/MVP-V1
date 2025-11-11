import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ExternalWorkoutsPopup from "./ExternalWorkoutsPopUp";
import {
  fetchSubscribedWorkouts,
  unsubscribeFromWorkout,
} from "../services/externalWorkoutsAPI";
import "./Dashboard.css";

// Fallback Hook für useAuth
const useAuthFallback = () => {
  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
  };

  const user = JSON.parse(localStorage.getItem("user") || "null");

  return { user, logout };
};

const Dashboard = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [subscribedWorkouts, setSubscribedWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  let auth;
  try {
    const { useAuth } = require("../contexts/AuthContext");
    auth = useAuth();
    console.log(auth);
  } catch (error) {
    auth = useAuthFallback();
  }

  const { user, logout } = auth;

  // Lade abonnierte Workouts beim Start
  useEffect(() => {
    if (user && user.id) {
      loadSubscribedWorkouts();
    }
  }, [user]);

  const loadSubscribedWorkouts = async () => {
    try {
      setLoading(true);
      setError("");
      const workouts = await fetchSubscribedWorkouts(user.id);
      setSubscribedWorkouts(workouts);
    } catch (err) {
      console.error("Fehler beim Laden der abonnierten Workouts:", err);
      setError("Fehler beim Laden der Workouts");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (workoutId) => {
    try {
      const result = await unsubscribeFromWorkout(user.id, workoutId);
      if (result.success) {
        // Entferne das Workout aus der lokalen Liste
        setSubscribedWorkouts((prev) =>
          prev.filter((workout) => workout.id !== workoutId)
        );
      } else {
        setError(result.message || "Fehler beim Abbestellen");
      }
    } catch (err) {
      console.error("Fehler beim Abbestellen:", err);
      setError("Fehler beim Abbestellen des Workouts");
    }
  };

  const handleOpenPopup = () => {
    console.log("🟢 ÖFFNE Popup");
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    console.log("🔴 SCHLIESSE Popup");
    setIsPopupOpen(false);
    // Lade Workouts neu wenn Popup geschlossen wird (falls neue abonniert wurden)
    loadSubscribedWorkouts();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <h1>🏋️ Serious Saturday</h1>
        <p>Willkommen zurück, {user?.name || user?.email}!</p>
        <button onClick={handleLogout} className="logout-btn">
          Abmelden
        </button>
      </header>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Stats Card */}
        <div className="dashboard-card">
          <h3>📊 Deine Statistiken</h3>
          <p>
            Aktive Workouts: <strong>{subscribedWorkouts.length}</strong>
          </p>
          <p>
            Abgeschlossen: <strong>12</strong>
          </p>
          <p>
            Favoriten: <strong>8</strong>
          </p>
        </div>

        {/* Quick Actions Card */}
        <div className="dashboard-card">
          <h3>⚡ Schnellaktionen</h3>
          <div className="quick-actions">
            <button
              className="btn btn-primary"
              onClick={handleOpenPopup}
              type="button"
            >
              🔍 Neue Workouts suchen
            </button>
            <button className="btn btn-secondary" type="button">
              📝 Workout starten
            </button>
            <button className="btn btn-success" type="button">
              💪 Meine Fortschritte
            </button>
          </div>
        </div>

        {/* Recent Workouts Card */}
        <div className="dashboard-card">
          <h3>🕒 Letzte Workouts</h3>
          <ul className="workout-list">
            <li>Brust-Training (vor 2 Tagen)</li>
            <li>Bein-Training (vor 4 Tagen)</li>
            <li>Yoga Session (vor 1 Woche)</li>
          </ul>
        </div>
      </div>

      {/* Abonnierte Workouts Section */}
      <div className="subscribed-workouts-section">
        <h2>Deine abonnierten Workouts</h2>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Lade deine Workouts...</div>
        ) : subscribedWorkouts.length === 0 ? (
          <div className="no-workouts">
            <p>Du hast noch keine Workouts abonniert.</p>
            <p>
              Klicke auf <strong>"Neue Workouts suchen"</strong> um Workouts zu
              entdecken und zu abonnieren!
            </p>
          </div>
        ) : (
          <div className="workouts-grid">
            {subscribedWorkouts.map((workout) => (
              <div key={workout.id} className="workout-card">
                <div className="workout-header">
                  <h4>{workout.name}</h4>
                  <button
                    className="unsubscribe-btn"
                    onClick={() => handleUnsubscribe(workout.id)}
                    title="Workout abbestellen"
                  >
                    ❌
                  </button>
                </div>

                <div className="workout-info">
                  <span
                    className={`difficulty difficulty-${workout.difficulty?.toLowerCase()}`}
                  >
                    {workout.difficulty}
                  </span>
                  <span className="category">{workout.category}</span>
                  {workout.duration && (
                    <span className="duration">{workout.duration}min</span>
                  )}
                </div>

                {workout.description && (
                  <p className="workout-description">{workout.description}</p>
                )}

                <div className="workout-actions">
                  <button className="btn btn-primary btn-small">Starten</button>
                  <button className="btn btn-secondary btn-small">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* External Workouts Popup */}
      <ExternalWorkoutsPopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        userId={user?.id}
      />
    </div>
  );
};

export default Dashboard;
