import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock-Login für Testzwecke
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        // Simuliere eine API-Antwort
        setTimeout(() => {
          login(
            {
              id: 1,
              email: credentials.email,
              name: 'Testbenutzer'
            },
            'mock-token-123'
          );
          setLoading(false);
          navigate('/');
        }, 1000);
        return;
      }

      // Echter Login
      const response = await fetch('http://localhost:5001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.token);
        navigate('/');
      } else {
        setError(data.message || 'Login fehlgeschlagen');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Verbindungsfehler. Ist das Backend erreichbar?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1 className="srst-heading">Serious Saturday</h1>

        <h2>Anmelden</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">E-Mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              required
              placeholder="test@example.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              placeholder="password123"
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Lade...' : 'Anmelden'}
          </button>
        </form>

        <div className="test-credentials">
          <h4>Test-Zugangsdaten:</h4>
          <p>E-Mail: test@example.com</p>
          <p>Passwort: password123</p>
        </div>

        <h2 className="srst-heading">srst.</h2>
        <p className="register-link">
          Noch kein Konto? <span>Registrieren</span>
        </p>
      </div>
    </div>
  );
};

export default Login;