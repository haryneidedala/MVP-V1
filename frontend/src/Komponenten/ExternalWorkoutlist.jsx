import { useState } from "react";
import {
  fetchExercisesFromAPI,
  SUPPORTED_VALUES,
  GERMAN_TRANSLATIONS,
} from "../services/externalWorkoutsAPI";
import "./ExternalWorkoutlist.css";

const ExternalWorkoutList = () => {
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleShowWorkouts = async () => {
    if (!selectedMuscle && !selectedType && !selectedDifficulty) {
      setError("Bitte wähle mindestens einen Parameter aus");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = {
        muscle: selectedMuscle,
        type: selectedType,
        difficulty: selectedDifficulty,
      };

      console.log("Sende Parameter:", params);

      const exercises = await fetchExercisesFromAPI(params);
      setWorkouts(exercises);

      console.log("Erhaltene Workouts:", exercises);
    } catch (err) {
      console.error("Fehler beim Laden der Workouts:", err);
      setError("Fehler beim Laden der Workouts: " + err.message);
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedMuscle("");
    setSelectedType("");
    setSelectedDifficulty("");
    setWorkouts([]);
    setError("");
  };

  return (
    <div className="external-workout-list">
      <h2>Externe Workouts suchen</h2>

      <div className="parameter-selectors">
        <div className="selector-group">
          <label htmlFor="muscle-select">Muskelgruppe:</label>
          <select
            id="muscle-select"
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
          >
            <option value="">Alle Muskelgruppen</option>
            {SUPPORTED_VALUES.muscles.map((muscle) => (
              <option key={muscle} value={muscle}>
                {GERMAN_TRANSLATIONS.muscles[muscle] || muscle}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <label htmlFor="type-select">Übungstyp:</label>
          <select
            id="type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Alle Typen</option>
            {SUPPORTED_VALUES.types.map((type) => (
              <option key={type} value={type}>
                {GERMAN_TRANSLATIONS.types[type] || type}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <label htmlFor="difficulty-select">Schwierigkeit:</label>
          <select
            id="difficulty-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            <option value="">Alle Schwierigkeiten</option>
            {SUPPORTED_VALUES.difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {GERMAN_TRANSLATIONS.difficulties[difficulty] || difficulty}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="action-buttons">
        <button
          className="btn btn-primary"
          onClick={handleShowWorkouts}
          disabled={loading}
        >
          {loading ? "Lädt..." : "Zeige Workouts"}
        </button>

        <button className="btn btn-secondary" onClick={handleReset}>
          Zurücksetzen
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="workouts-results">
        {loading ? (
          <div className="loading">Lade Workouts...</div>
        ) : workouts.length > 0 ? (
          <div className="workouts-list">
            <h3>Gefundene Workouts ({workouts.length})</h3>
            {workouts.map((workout, index) => (
              <div key={index} className="workout-item">
                <h4>{workout.name}</h4>
                <div className="workout-meta">
                  <span>Muskel: {workout.muscle}</span>
                  <span>Typ: {workout.type}</span>
                  <span>Schwierigkeit: {workout.difficulty}</span>
                </div>
                {workout.instructions && (
                  <p className="instructions">{workout.instructions}</p>
                )}
                {workout.equipment && (
                  <p className="equipment">
                    Benötigtes Equipment: {workout.equipment}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="no-workouts">
              {selectedMuscle || selectedType || selectedDifficulty
                ? "Keine Workouts gefunden. Bitte andere Parameter auswählen."
                : 'Wähle Parameter aus und klicke auf "Zeige Workouts"'}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ExternalWorkoutList;
