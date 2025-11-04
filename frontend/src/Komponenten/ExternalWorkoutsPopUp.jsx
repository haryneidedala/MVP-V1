import { useEffect, useRef } from "react";
import ExternalWorkoutList from "./ExternalWorkoutlist";
import "./ExternalWorkoutsPopup.css";

const ExternalWorkoutsPopup = ({ isOpen, onClose }) => {
  const popupRef = useRef(null);

  // Schließen mit ESC-Taste
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      // Verhindere Scrollen im Hintergrund
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCloseClick = (e) => {
    e.stopPropagation();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={handleOverlayClick} ref={popupRef}>
      <div className="popup-content">
        <div className="popup-header">
          <h2>Externe Workouts durchsuchen</h2>
          <button
            className="close-popup"
            onClick={handleCloseClick}
            aria-label="Popup schließen"
          >
            &times;
          </button>
        </div>

        <div className="popup-body">
          <ExternalWorkoutList />
        </div>
      </div>
    </div>
  );
};

export default ExternalWorkoutsPopup;
