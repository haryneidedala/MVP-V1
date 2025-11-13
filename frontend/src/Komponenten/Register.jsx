import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Auth.css";

// Fallback Hook für useAuth
const useAuthFallback = () => {
  const login = (userData, token) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    window.dispatchEvent(new Event("authChange"));
  };

  return { login };
};

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  let auth;
  try {
    const { useAuth } = require("../contexts/AuthContext");
    auth = useAuth();
  } catch (error) {
    auth = useAuthFallback();
  }

  const { login } = auth;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validierung
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwörter stimmen nicht überein");
    }

    if (formData.password.length < 6) {
      return setError("Passwort muss mindestens 6 Zeichen lang sein");
    }

    try {
      setLoading(true);

      // Echte Registrierung
      const response = await fetch("http://localhost:5001/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      // Prüfe den Content-Type der Antwort
      const contentType = response.headers.get("content-type");

      if (!contentType || !contentType.includes("application/json")) {
        // Wenn die Antwort kein JSON ist, handelt es sich wahrscheinlich um einen Fehler
        const text = await response.text();
        console.error("Server returned non-JSON response:", text);
        throw new Error("Serverfehler: Ungültige Antwort vom Server");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registrierung fehlgeschlagen");
      }

      // Automatisch einloggen nach erfolgreicher Registrierung
      if (data.token && data.user) {
        login(data.user, data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Registrierungsfehler:", err);

      // Spezifische Fehlermeldungen basierend auf Fehlertyp
      if (err.message.includes("Failed to fetch")) {
        setError(
          "Verbindungsfehler. Stelle sicher, dass das Backend auf localhost:5001 läuft."
        );
      } else if (err.message.includes("Ungültige Antwort")) {
        setError("Serverfehler. Das Backend antwortet nicht korrekt.");
      } else {
        setError(err.message || "Registrierung fehlgeschlagen");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Account erstellen</h2>
        <p className="auth-subtitle">Registriere dich für Serious Saturday</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Dein vollständiger Name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="deine.email@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Mindestens 6 Zeichen"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Passwort bestätigen</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Wiederhole dein Passwort"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? "Registriere..." : "Account erstellen"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Bereits ein Konto?{" "}
            <Link to="/login" className="auth-link">
              Hier anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
