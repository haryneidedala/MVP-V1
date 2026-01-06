import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Timer from "./Timer";
import ExternalWorkoutsPopup from "./ExternalWorkoutsPopUp";
import {
  fetchSubscribedWorkouts,
  unsubscribeFromWorkout,
} from "../services/workoutsAPI";
import { useAuth } from "../contexts/AuthContext";
import "./Dashboard.css";

// Chart.js Komponenten
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

// Chart.js registrieren
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [subscribedWorkouts, setSubscribedWorkouts] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [workoutsLoading, setWorkoutsLoading] = useState(true);
  const [error, setError] = useState("");
  const [streakStats, setStreakStats] = useState(null);
  const [streaksLoading, setStreaksLoading] = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);
  const [streakHistoryData, setStreakHistoryData] = useState([]);
  const navigate = useNavigate();

  const { user, logout, loading } = useAuth();

  // Chart.js Optionen
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#000000",
          font: {
            size: 14,
          },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Wöchentliche Aktivität",
        color: "#000000",
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#000000",
          font: {
            size: 12,
          },
        },
        grid: {
          color: "rgba(0,0,0,0.1)",
        },
      },
      x: {
        ticks: {
          color: "#000000",
          font: {
            size: 12,
          },
        },
        grid: {
          color: "rgba(0,0,0,0.1)",
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#000000",
          font: {
            size: 14,
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#000000",
        },
        grid: {
          color: "rgba(0,0,0,0.1)",
        },
      },
      x: {
        ticks: {
          color: "#000000",
        },
        grid: {
          color: "rgba(0,0,0,0.1)",
        },
      },
    },
  };

  // Lade abonnierte Workouts und Streak-Statistiken
  useEffect(() => {
    if (user && user.id) {
      console.log("User verfügbar, lade Workouts und Streaks...");
      loadSubscribedWorkouts();
      loadStreakStats();
      loadWeeklyData();
      loadStreakHistoryData();
    } else {
      console.log("User nicht verfügbar:", user);
      setWorkoutsLoading(false);
    }
  }, [user]);

  // Utility-Funktionen für Token-Handling
  const getToken = () => {
    return localStorage.getItem("authToken") || localStorage.getItem("token");
  };

  const setToken = (token) => {
    localStorage.setItem("authToken", token);
  };

  const refreshAccessToken = async () => {
    try {
      console.log("🔄 Versuche Token zu refreshen...");
      const response = await fetch("http://localhost:5002/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Token erfolgreich refreshed");
        if (data.access_token) {
          setToken(data.access_token);
        }
        return data;
      } else {
        console.error("❌ Token Refresh fehlgeschlagen");
        return null;
      }
    } catch (error) {
      console.error("❌ Fehler beim Token Refresh:", error);
      return null;
    }
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    let token = getToken();
    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
      credentials: "include",
    });

    if (response.status === 401) {
      console.log("⚠️ 401 Fehler, versuche Token Refresh...");
      const refreshData = await refreshAccessToken();

      if (refreshData && refreshData.access_token) {
        defaultHeaders["Authorization"] = `Bearer ${refreshData.access_token}`;
        response = await fetch(url, {
          ...options,
          headers: defaultHeaders,
          credentials: "include",
        });
      }
    }

    return response;
  };

  const loadSubscribedWorkouts = async () => {
    try {
      setWorkoutsLoading(true);
      setError("");
      console.log("Lade Workouts für User ID:", user.id);
      const workouts = await fetchSubscribedWorkouts(user.id);
      setSubscribedWorkouts(workouts);
    } catch (err) {
      console.error("Fehler beim Laden der abonnierten Workouts:", err);
      setError("Fehler beim Laden der Workouts");
    } finally {
      setWorkoutsLoading(false);
    }
  };

  const loadStreakStats = async () => {
    try {
      setStreaksLoading(true);
      const response = await makeAuthenticatedRequest(
        "http://localhost:5002/streaks/stats"
      );

      if (response.ok) {
        const data = await response.json();
        setStreakStats(data.stats);
        console.log("Streak-Statistiken geladen:", data.stats);
      } else {
        console.error("Fehler beim Laden der Streak-Statistiken");
      }
    } catch (err) {
      console.error("Fehler beim Laden der Streak-Statistiken:", err);
    } finally {
      setStreaksLoading(false);
    }
  };

  const loadWeeklyData = async () => {
    try {
      // Simuliere wöchentliche Daten für das Diagramm
      const mockWeeklyData = [
        { day: "Mo", count: 3 },
        { day: "Di", count: 5 },
        { day: "Mi", count: 2 },
        { day: "Do", count: 4 },
        { day: "Fr", count: 6 },
        { day: "Sa", count: 1 },
        { day: "So", count: 3 },
      ];

      setWeeklyData(mockWeeklyData);
    } catch (err) {
      console.error("Fehler beim Laden der Wochen-Daten:", err);
      // Fallback Mock-Daten
      const mockWeeklyData = [
        { day: "Mo", count: 2 },
        { day: "Di", count: 4 },
        { day: "Mi", count: 1 },
        { day: "Do", count: 3 },
        { day: "Fr", count: 5 },
        { day: "Sa", count: 0 },
        { day: "So", count: 2 },
      ];
      setWeeklyData(mockWeeklyData);
    }
  };

  const loadStreakHistoryData = async () => {
    try {
      // Erstelle Mock-Daten für die letzten 30 Tage
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split("T")[0],
          day: date.getDate(),
          count: Math.floor(Math.random() * 3), // 0-2 Workouts pro Tag
        };
      });

      setStreakHistoryData(last30Days);
    } catch (err) {
      console.error("Fehler beim Laden der Streak-Historie:", err);
    }
  };

  const startTimerForWorkout = (workout) => {
    console.log("Timer gestartet für:", workout.name);
    setActiveTimer({
      workout: workout,
      duration: (workout.duration || 30) * 60, // Minuten zu Sekunden
      startTime: new Date(),
    });
  };

  const handleTimerComplete = async () => {
    if (!activeTimer) return;

    try {
      // Erfolgsmeldung anzeigen
      alert(
        `🎉 Super! Du hast "${activeTimer.workout.name}" erfolgreich abgeschlossen!`
      );

      // Automatisch Streak eintragen
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch("http://localhost:5002/streaks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_id: activeTimer.workout.id,
          user_id: user?.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Streak automatisch eingetragen:", data);
        // Optional: Erfolgs-Overlay anzeigen
        showSuccessOverlay();
      } else {
        console.error("❌ Fehler beim automatischen Streak-Eintrag:", data);
      }

      // Statistiken neu laden
      loadStreakStats();
    } catch (error) {
      console.error("Fehler nach Timer-Ablauf:", error);
    } finally {
      // Timer zurücksetzen
      setActiveTimer(null);
    }
  };

  const handleTimerCancel = () => {
    console.log("Timer abgebrochen");
    setActiveTimer(null);
  };

  const showSuccessOverlay = () => {
    // Erstelle ein temporäres Erfolgs-Overlay
    const successDiv = document.createElement("div");
    successDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10001;
    animation: fadeIn 0.3s;
  `;

    successDiv.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      color: white;
      max-width: 400px;
      animation: popIn 0.5s;
    ">
      <h2 style="margin-top: 0; font-size: 2rem;">🎉 Erfolg!</h2>
      <p style="font-size: 1.2rem;">Du hast "${activeTimer?.workout?.name}" abgeschlossen!</p>
      <p>Dein Streak wurde aktualisiert.</p>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: white;
        color: #4CAF50;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: bold;
        cursor: pointer;
        margin-top: 20px;
      ">
        Weiter
      </button>
    </div>
  `;

    document.body.appendChild(successDiv);

    // Nach 3 Sekunden automatisch entfernen
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        successDiv.remove();
      }
    }, 3000);

    // Füge CSS für Animationen hinzu
    const style = document.createElement("style");
    style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes popIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;
    document.head.appendChild(style);
  };

  const handleUnsubscribe = async (workoutId) => {
    try {
      const result = await unsubscribeFromWorkout(user.id, workoutId);
      if (result.success) {
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

  const handleOpenPopup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    if (user && user.id) {
      loadSubscribedWorkouts();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    logout();
    navigate("/login");
  };

  const handleLogWorkout = async (workoutId, workoutName) => {
    try {
      const response = await makeAuthenticatedRequest(
        "http://localhost:5002/streaks",
        {
          method: "POST",
          body: JSON.stringify({
            workout_id: workoutId,
            user_id: user?.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(
          `✅ "${workoutName}" als erledigt geloggt!\nAktueller Streak: ${data.current_streak} Tage`
        );
        loadStreakStats();
      } else {
        alert(`❌ Fehler: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error("Fehler beim Loggen:", error);
      alert(`❌ Fehler: ${error.message}`);
    }
  };

  // Daten für Diagramme vorbereiten
  const getCategoryDistributionData = () => {
    const categories = subscribedWorkouts.reduce((acc, workout) => {
      const category = workout.category || "Unbekannt";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#8AC926",
      "#1982C4",
    ];

    return {
      labels: Object.keys(categories),
      datasets: [
        {
          data: Object.values(categories),
          backgroundColor: colors.slice(0, Object.keys(categories).length),
          borderColor: colors
            .slice(0, Object.keys(categories).length)
            .map((color) => color + "80"),
          borderWidth: 2,
        },
      ],
    };
  };

  const getWeeklyActivityData = () => {
    return {
      labels: weeklyData.map((item) => item.day),
      datasets: [
        {
          label: "Workouts",
          data: weeklyData.map((item) => item.count),
          backgroundColor: "rgba(129, 71, 236, 0.7)",
          borderColor: "rgba(129, 71, 236, 1)",
          borderWidth: 2,
          borderRadius: 5,
        },
      ],
    };
  };

  // FEHLENDE FUNKTION: getStreakProgressData
  const getStreakProgressData = () => {
    // Erstelle Daten für die letzten 30 Tage
    const labels = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.getDate().toString(); // Nur der Tag (1-31)
    });

    // Verwende die Mock-Daten oder erstelle basierend auf StreakStats
    const data = streakHistoryData.map((item) => item.count);

    return {
      labels: labels,
      datasets: [
        {
          label: "Workouts pro Tag",
          data: data,
          borderColor: "rgba(129, 71, 236, 1)",
          backgroundColor: "rgba(129, 71, 236, 0.1)",
          tension: 0.3,
          fill: true,
        },
      ],
    };
  };

  // Loading-State für Auth
  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Lade...</div>
      </div>
    );
  }

  // Falls kein User eingeloggt ist
  if (!user) {
    return (
      <div className="dashboard">
        <div className="not-logged-in">
          <h1>🏋️ Serious Saturday</h1>
          <p>Du bist nicht angemeldet.</p>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-primary"
          >
            Zum Login
          </button>
        </div>
      </div>
    );
  }

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
        {/* Stats Card mit Streaks */}
        <div className="dashboard-card">
          <h3>👑 Deine Streak-Statistiken</h3>

          {streaksLoading ? (
            <div className="loading-stats">Lade Streaks...</div>
          ) : streakStats ? (
            <div className="streak-stats-dashboard">
              <div className="stat-row">
                <span className="stat-label">👑 Aktueller Streak</span>
                <span className="stat-value highlight">
                  {streakStats.current_streak} Tage
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-label">🏆 Längster Streak</span>
                <span className="stat-value">
                  {streakStats.longest_streak} Tage
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-label">📊 Workouts insgesamt</span>
                <span className="stat-value">
                  {streakStats.total_workouts_logged}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-label">📅 Heute eingeloggt</span>
                <span className="stat-value">
                  {streakStats.today_logged ? "✅ Ja" : "❌ Noch nicht"}
                </span>
              </div>

              <div className="streak-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(
                        (streakStats.current_streak / 30) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className="progress-label">
                  {streakStats.current_streak} von 30 Tagen für die Challenge
                </div>
              </div>
            </div>
          ) : (
            <div className="no-streaks">
              <p>Noch keine Streaks erstellt.</p>
              <p>Starte deinen ersten Workout, um einen Streak zu beginnen!</p>
            </div>
          )}
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
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => navigate("/workouts")}
            >
              🏋️‍♂️ Workout starten
            </button>
            <button
              className="btn btn-success"
              type="button"
              onClick={loadStreakStats}
            >
              🔄 Streaks aktualisieren
            </button>
          </div>
        </div>

        {/* Workout Stats Card */}
        <div className="dashboard-card">
          <h3>📈 Workout-Übersicht</h3>
          <div className="workout-overview">
            <div className="stat-row">
              <span className="stat-label">Aktive Workouts</span>
              <span className="stat-value workout-count">
                {subscribedWorkouts.length}
              </span>
            </div>

            <div className="stat-row">
              <span className="stat-label">Kategorien</span>
              <span className="stat-value">
                {[...new Set(subscribedWorkouts.map((w) => w.category))].length}
              </span>
            </div>

            <div className="stat-row">
              <span className="stat-label">Durchschn. Dauer</span>
              <span className="stat-value">
                {subscribedWorkouts.length > 0
                  ? Math.round(
                      subscribedWorkouts.reduce(
                        (sum, w) => sum + (w.duration || 0),
                        0
                      ) / subscribedWorkouts.length
                    )
                  : 0}{" "}
                min
              </span>
            </div>

            {subscribedWorkouts.length > 0 && (
              <div className="workout-distribution">
                <h4>Verteilung nach Schwierigkeit:</h4>
                <div className="distribution-bar">
                  {["Anfänger", "Fortgeschritten", "Profi"].map((level) => {
                    const count = subscribedWorkouts.filter(
                      (w) => w.difficulty === level
                    ).length;
                    const percentage =
                      subscribedWorkouts.length > 0
                        ? (count / subscribedWorkouts.length) * 100
                        : 0;

                    return (
                      <div key={level} className="distribution-item">
                        <div className="dist-label">{level}</div>
                        <div className="dist-bar">
                          <div
                            className={`dist-fill difficulty-${level.toLowerCase()}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="dist-count">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grafische Statistiken Section */}
      <div className="charts-section">
        <h2>📊 Grafische Statistiken</h2>

        <div className="charts-grid">
          {/* Donut Chart für Kategorieverteilung */}
          <div className="chart-card">
            <h3>Kategorieverteilung</h3>
            <div className="chart-container">
              {subscribedWorkouts.length > 0 ? (
                <Doughnut
                  data={getCategoryDistributionData()}
                  options={doughnutOptions}
                />
              ) : (
                <div className="no-data-chart">
                  <p>Keine Workouts zum Anzeigen</p>
                </div>
              )}
            </div>
          </div>

          {/* Bar Chart für wöchentliche Aktivität */}
          <div className="chart-card">
            <h3>Wöchentliche Aktivität</h3>
            <div className="chart-container">
              {weeklyData.length > 0 ? (
                <Bar data={getWeeklyActivityData()} options={barOptions} />
              ) : (
                <div className="no-data-chart">
                  <p>Keine Aktivitätsdaten</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Chart für 30-Tage Übersicht */}
          <div className="chart-card full-width">
            <h3>30-Tage Übersicht</h3>
            <div className="chart-container">
              {streakHistoryData.length > 0 ? (
                <Line data={getStreakProgressData()} options={lineOptions} />
              ) : (
                <div className="no-data-chart">
                  <p>Keine Streak-Daten verfügbar</p>
                </div>
              )}
            </div>
          </div>

          {/* Kalender-Übersicht */}
          <div className="calendar-card">
            <h3>📅 Trainingskalender</h3>
            <div className="calendar-grid">
              {Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (29 - i));
                const dateStr = date.toISOString().split("T")[0];
                const isWorkoutDay =
                  streakStats &&
                  streakStats.streak_dates &&
                  streakStats.streak_dates.includes(dateStr);
                const isToday = i === 29;

                return (
                  <div
                    key={i}
                    className={`calendar-day ${
                      isWorkoutDay ? "workout-day" : ""
                    } ${isToday ? "today" : ""}`}
                    title={`${date.toLocaleDateString("de-DE")}${
                      isWorkoutDay ? " - Workout gemacht" : ""
                    }`}
                  >
                    <div className="day-number">{date.getDate()}</div>
                    {isWorkoutDay && <div className="workout-dot">●</div>}
                  </div>
                );
              })}
            </div>
            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-color workout-day"></div>
                <span>Workout Tag</span>
              </div>
              <div className="legend-item">
                <div className="legend-color today"></div>
                <span>Heute</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Abonnierte Workouts Section */}
      <div className="subscribed-workouts-section">
        <h2>📋 Deine abonnierten Workouts</h2>

        {error && <div className="error-message">{error}</div>}

        {workoutsLoading ? (
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
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => startTimerForWorkout(workout)}
                  >
                    ⏱️ Timer starten
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => {
                      alert(`Details für "${workout.name}"`);
                    }}
                  >
                    📖 Details
                  </button>
                  <button
                    className="btn btn-success btn-small"
                    onClick={() => handleLogWorkout(workout.id, workout.name)}
                  >
                    🔥 Als erledigt loggen
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

      {/* Timer Overlay */}
      {activeTimer && (
        <Timer
          workout={activeTimer.workout}
          initialDuration={activeTimer.duration}
          onComplete={handleTimerComplete}
          onCancel={handleTimerCancel}
        />
      )}
    </div>
  );
};

export default Dashboard;
