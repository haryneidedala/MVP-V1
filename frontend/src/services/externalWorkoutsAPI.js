const API_BASE_URL = "http://localhost:5001";

/**
 * Holt Exercises von der externen API basierend auf Parametern
 * @param {Object} params - Suchparameter
 * @returns {Promise<Array>} Liste der Exercises
 */
export const fetchExercisesFromAPI = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.muscle) queryParams.append("muscle", params.muscle);
    if (params.type) queryParams.append("type", params.type);
    if (params.difficulty) queryParams.append("difficulty", params.difficulty);

    // TODO: GET /workouts muss auch queryParams unterstützden
    // const url = `${API_BASE_URL}/workouts?${queryParams.toString()}`;
    const url = `${API_BASE_URL}/workouts`;
    console.log("API Call:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API Response:", data);
    return data || [];
  } catch (error) {
    console.error("Error fetching external workouts:", error);
    throw error;
  }
};

/**
 * Holt alle abonnierten Workouts eines Users
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Liste der abonnierten Workouts
 */
export const fetchSubscribedWorkouts = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/workouts`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const workouts = await response.json();
    console.log("Abonnierte Workouts:", workouts);
    return workouts;
  } catch (error) {
    console.error("Error fetching subscribed workouts:", error);
    throw error;
  }
};

/**
 * Abonniert ein Workout für einen User
 * @param {number} userId - User ID
 * @param {number} workoutId - Workout ID
 * @returns {Promise<Object>} Ergebnis
 */
export const subscribeToWorkout = async (userId, workoutId) => {
  console.log("User", userId, "wants to subscribe to workout", workoutId);
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        workout_id: workoutId,
      }),
    });

    const result = await response.json();
    console.log("Subscribe result:", result);
    return result;
  } catch (error) {
    console.error("Error subscribing to workout:", error);
    throw error;
  }
};

/**
 * Entfernt ein Workout-Abonnement
 * @param {number} userId - User ID
 * @param {number} workoutId - Workout ID
 * @returns {Promise<Object>} Ergebnis
 */
export const unsubscribeFromWorkout = async (userId, workoutId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        workout_id: workoutId,
      }),
    });

    const result = await response.json();
    console.log("Unsubscribe result:", result);
    return result;
  } catch (error) {
    console.error("Error unsubscribing from workout:", error);
    throw error;
  }
};

/**
 * Erstellt ein neues Workout in der lokalen Datenbank
 * @param {Object} workoutData - Workout Daten
 * @returns {Promise<Object>} Erstelltes Workout
 */
export const createWorkout = async (workoutData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workoutData),
    });

    const result = await response.json();
    console.log("Create workout result:", result);
    return result;
  } catch (error) {
    console.error("Error creating workout:", error);
    throw error;
  }
};

/**
 * Holt alle verfügbaren Workouts aus der lokalen Datenbank
 * @returns {Promise<Array>} Liste aller Workouts
 */
export const fetchAllWorkouts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const workouts = await response.json();
    console.log("All workouts:", workouts);
    return workouts;
  } catch (error) {
    console.error("Error fetching all workouts:", error);
    throw error;
  }
};

// Mögliche Werte, die die API-Ninjas API unterstützt
export const SUPPORTED_VALUES = {
  muscles: [
    "abdominals",
    "abductors",
    "adductors",
    "biceps",
    "calves",
    "chest",
    "forearms",
    "glutes",
    "hamstrings",
    "lats",
    "lower_back",
    "middle_back",
    "neck",
    "quadriceps",
    "traps",
    "triceps",
  ],
  types: [
    "cardio",
    "olympic_weightlifting",
    "plyometrics",
    "powerlifting",
    "strength",
    "stretching",
    "strongman",
  ],
  difficulties: ["beginner", "intermediate", "expert"],
};

// Deutsche Übersetzungen für die Anzeige
export const GERMAN_TRANSLATIONS = {
  muscles: {
    abdominals: "Bauch",
    abductors: "Abduktoren",
    adductors: "Adduktoren",
    biceps: "Bizeps",
    calves: "Waden",
    chest: "Brust",
    forearms: "Unterarme",
    glutes: "Gesäß",
    hamstrings: "Hamstrings",
    lats: "Latissimus",
    lower_back: "Unterer Rücken",
    middle_back: "Mittlerer Rücken",
    neck: "Nacken",
    quadriceps: "Oberschenkel",
    traps: "Traps",
    triceps: "Trizeps",
  },
  types: {
    cardio: "Kardio",
    olympic_weightlifting: "Olympisches Gewichtheben",
    plyometrics: "Plyometrie",
    powerlifting: "Powerlifting",
    strength: "Krafttraining",
    stretching: "Stretching",
    strongman: "Strongman",
  },
  difficulties: {
    beginner: "Anfänger",
    intermediate: "Fortgeschritten",
    expert: "Profi",
  },
};

/**
 * Speichert eine Exercise von API-Ninjas als Workout in der lokalen DB und abonniert sie
 * @param {number} userId - User ID
 * @param {Object} exercise - Exercise von API-Ninjas
 * @returns {Promise<Object>} Ergebnis
 */
export const saveAndSubscribeExercise = async (userId, exercise) => {
  try {
    // Zuerst das Workout in der lokalen DB erstellen
    const workoutData = {
      name: exercise.name,
      description: exercise.instructions || "",
      difficulty: mapDifficulty(exercise.difficulty),
      category: exercise.type || "Allgemein",
      api_exercise_id: exercise.name,
      duration: 30, // Standardwert
    };

    console.log("Creating workout:", workoutData);

    // Workout erstellen
    const createResponse = await createWorkout(workoutData);

    if (createResponse.id) {
      // Workout erfolgreich erstellt, jetzt abonnieren
      const subscribeResult = await subscribeToWorkout(
        userId,
        createResponse.id
      );
      return subscribeResult;
    } else {
      // Workout könnte bereits existieren, versuche es zu finden und abonnieren
      const allWorkouts = await fetchAllWorkouts();
      const existingWorkout = allWorkouts.find((w) => w.name === exercise.name);

      if (existingWorkout) {
        const subscribeResult = await subscribeToWorkout(
          userId,
          existingWorkout.id
        );
        return subscribeResult;
      } else {
        throw new Error("Workout konnte nicht erstellt oder gefunden werden");
      }
    }
  } catch (error) {
    console.error("Error saving and subscribing exercise:", error);
    throw error;
  }
};

/**
 * Mappt die Schwierigkeit von API-Ninjas auf lokales Format
 * @param {string} difficulty - Schwierigkeit von API
 * @returns {string} Lokale Schwierigkeit
 */
const mapDifficulty = (difficulty) => {
  const difficultyMap = {
    beginner: "Anfänger",
    intermediate: "Fortgeschritten",
    expert: "Profi",
  };

  return difficultyMap[difficulty] || "Anfänger";
};
