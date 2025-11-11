import { useEffect } from "react";
import ExternalWorkoutList from "./ExternalWorkoutlist";
import "./ExternalWorkoutsPopup.css";

const ExternalWorkoutsPopup = ({ isOpen, onClose, userId }) => {
  // Schließen mit ESC-Taste
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
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

  // WICHTIG: Wenn nicht geöffnet, return null
  if (!isOpen) {
    return null;
  }

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>Externe Workouts durchsuchen</h2>
          <button
            className="close-popup"
            onClick={onClose}
            type="button"
            aria-label="Popup schließen"
          >
            &times;
          </button>
        </div>

        <div className="popup-body">
          <ExternalWorkoutList userId={userId} onWorkoutSubscribed={onClose} />
        </div>
      </div>
    </div>
  );
};

export default ExternalWorkoutsPopup;
