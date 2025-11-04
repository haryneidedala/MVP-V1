import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ExternalWorkoutsPopup from "./ExternalWorkoutsPopUp";
import "./Dashboard.css";

const Dashboard = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  useEffect(() => {
    console.log("=== POPUP DEBUG ===");
    console.log("Popup State:", isPopupOpen);
    console.log("==================");
  }, [isPopupOpen]);

  const handleOpenPopup = () => {
    console.log("🟢 ÖFFNE Popup");
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    console.log("🔴 SCHLIESSE Popup");
    setIsPopupOpen(false);
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
            Aktive Workouts: <strong>5</strong>
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
              🔍 Externe Workouts suchen
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

      {/* External Workouts Popup */}
      <ExternalWorkoutsPopup isOpen={isPopupOpen} onClose={handleClosePopup} />
    </div>
  );
};

export default Dashboard;
