import { useState } from "react";
import ExternalWorkoutList from "./ExternalWorkoutlist";
import "./SimplePopup.css";

const SimplePopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
        Externe Workouts suchen
      </button>
    );
  }

  return (
    <div className="simple-overlay" onClick={() => setIsOpen(false)}>
      <div className="simple-popup" onClick={(e) => e.stopPropagation()}>
        <div className="simple-header">
          <h2>Externe Workouts</h2>
          <button onClick={() => setIsOpen(false)}>X</button>
        </div>
        <ExternalWorkoutList />
      </div>
    </div>
  );
};

export default SimplePopup;
