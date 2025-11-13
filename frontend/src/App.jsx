import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./Komponenten/Dashboard";
import Login from "./Komponenten/Login";
import Register from "./Komponenten/Register";
import "./App.css";

function App() {
  const { user, isLoading } = useAuth();

  // Zeige Ladeanzeige während Auth-Status geprüft wird
  if (isLoading) {
    return (
      <div className="loading-app">
        <div className="loading-spinner">🏋️</div>
        <p>Lade Fitness App...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" replace />}
          />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={user ? <Dashboard /> : <Navigate to="/login" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
