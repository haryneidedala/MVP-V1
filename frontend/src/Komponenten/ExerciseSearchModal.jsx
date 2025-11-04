import { useState, useEffect } from 'react';
import './ExerciseSearchModal.css';

const ExerciseSearchModal = ({ isOpen, onClose, onSaveExercise }) => {
  const [muscle, setMuscle] = useState('');
  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setMuscle('');
    setType('');
    setDifficulty('');
    setExercises([]);
    setError('');
  };

  const fetchExercisesFromAPI = async (searchParams = {}) => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      if (searchParams.muscle) queryParams.append('muscle', searchParams.muscle);
      if (searchParams.type) queryParams.append('type', searchParams.type);
      if (searchParams.difficulty) queryParams.append('difficulty', searchParams.difficulty);
      
      const url = `http://localhost:5001/external-workouts?${queryParams.toString()}`;
      console.log('Fetching exercises from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setExercises(data.exercises || []);
      
    } catch (err) {
      console.error('Error fetching exercises:', err);
      setError('Fehler beim Laden der Übungen: ' + err.message);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await fetchExercisesFromAPI({ muscle, type, difficulty });
  };

  const quickSearch = (searchType) => {
    const params = {};
    
    switch(searchType) {
      case 'chest':
        params.muscle = 'brust';
        params.type = 'kraft';
        break;
      case 'legs':
        params.muscle = 'beine';
        params.type = 'kraft';
        break;
      case 'back':
        params.muscle = 'rücken';
        params.type = 'kraft';
        break;
      case 'cardio':
        params.type = 'kardio';
        params.difficulty = 'anfänger';
        break;
      case 'stretching':
        params.type = 'stretching';
        params.difficulty = 'anfänger';
        break;
      default:
        break;
    }
    
    setMuscle(params.muscle || '');
    setType(params.type || '');
    setDifficulty(params.difficulty || '');
    
    // Automatically search with quick search parameters
    fetchExercisesFromAPI(params);
  };

  const handleSaveExercise = (exercise) => {
    if (onSaveExercise) {
      onSaveExercise(exercise);
    }
    alert(`Übung "${exercise.name}" wurde gespeichert!`);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>🔍 Exercise Finder</h2>
          <button className="close-modal" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          {/* Quick Search Buttons */}
          <div className="quick-search">
            <h4>Schnellsuche:</h4>
            <div className="quick-search-buttons">
              <button 
                type="button" 
                className="quick-search-btn"
                onClick={() => quickSearch('chest')}
              >
                💪 Brust
              </button>
              <button 
                type="button" 
                className="quick-search-btn"
                onClick={() => quickSearch('legs')}
              >
                🦵 Beine
              </button>
              <button 
                type="button" 
                className="quick-search-btn"
                onClick={() => quickSearch('back')}
              >
                🧘 Rücken
              </button>
              <button 
                type="button" 
                className="quick-search-btn"
                onClick={() => quickSearch('cardio')}
              >
                🏃 Kardio
              </button>
              <button 
                type="button" 
                className="quick-search-btn"
                onClick={() => quickSearch('stretching')}
              >
                🤸 Stretching
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <label htmlFor="muscle">Muskelgruppe:</label>
              <select 
                id="muscle"
                value={muscle} 
                onChange={(e) => setMuscle(e.target.value)}
              >
                <option value="">Alle Muskelgruppen</option>
                <option value="bizeps">Bizeps</option>
                <option value="brust">Brust</option>
                <option value="rücken">Rücken</option>
                <option value="beine">Beine</option>
                <option value="bauch">Bauch</option>
                <option value="schultern">Schultern</option>
                <option value="trizeps">Trizeps</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="type">Übungstyp:</label>
              <select 
                id="type"
                value={type} 
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Alle Typen</option>
                <option value="kraft">Kraft</option>
                <option value="stretching">Stretching</option>
                <option value="kardio">Kardio</option>
                <option value="powerlifting">Powerlifting</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="difficulty">Schwierigkeit:</label>
              <select 
                id="difficulty"
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="">Alle Level</option>
                <option value="anfänger">Anfänger</option>
                <option value="fortgeschritten">Fortgeschritten</option>
                <option value="profi">Profi</option>
              </select>
            </div>
            
            <div className="search-buttons">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Lädt...' : 'Übungen suchen'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Schließen
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Results Container */}
          <div className="exercises-container">
            {loading ? (
              <div className="loading">🔍 Lade Übungen...</div>
            ) : exercises.length === 0 ? (
              <div className="no-exercises">
                {error ? 'Fehler beim Laden' : 'Wähle Parameter und klicke auf "Übungen suchen"'}
              </div>
            ) : (
              exercises.map((exercise, index) => (
                <div key={index} className="exercise-card">
                  <h3>{exercise.name}</h3>
                  <div className="exercise-meta">
                    <span className="muscle">{exercise.muscle}</span>
                    <span className="type">{exercise.type}</span>
                    <span className="difficulty">{exercise.difficulty}</span>
                  </div>
                  <p className="instructions">{exercise.instructions}</p>
                  {exercise.equipment && (
                    <p className="equipment">Gerät: {exercise.equipment}</p>
                  )}
                  <button 
                    className="save-btn"
                    onClick={() => handleSaveExercise(exercise)}
                  >
                    💾 Übung speichern
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseSearchModal;