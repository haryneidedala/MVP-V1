import { useEffect } from "react";
import LocalWorkoutList from "./LocalWorkoutList";
import "./ExternalWorkoutsPopup.css";

const ExternalWorkoutsPopup = ({ isOpen, onClose, userId }) => {
  console.log(" Popup-Komponente rendert - isOpen:", isOpen, "userId:", userId); // Debug hinzufügen

  // Schließen mit ESC-Taste
  useEffect(() => {
    console.log(" Popup useEffect - isOpen:", isOpen);

    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      console.log(" Popup ist geöffnet - ESC-Listener hinzufügen");
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      console.log(" Popup cleanup");
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e) => {
    console.log(" Overlay geklickt");
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // WICHTIG: Wenn nicht geöffnet, return null
  if (!isOpen) {
    console.log(" Popup nicht geöffnet - return null");
    return null;
  }

  console.log(" Popup wird gerendert!");
  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>Workouts durchsuchen</h2>
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
          <LocalWorkoutList userId={userId} onWorkoutSubscribed={onClose} />
        </div>
      </div>
    </div>
  );
};

export default ExternalWorkoutsPopup;
