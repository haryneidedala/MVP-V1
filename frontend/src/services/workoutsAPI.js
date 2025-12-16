// Erstelle services/workoutsAPI.js
const API_BASE_URL = "http://localhost:5001";

export const fetchSubscribedWorkouts = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}/workouts`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.workouts)) {
      return result.workouts;
    } else if (Array.isArray(result)) {
      return result;
    } else {
      console.error("Ungültiges Response-Format:", result);
      return [];
    }
  } catch (error) {
    console.error("Fehler beim Laden der abonnierten Workouts:", error);
    throw error;
  }
};

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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fehler beim Abbestellen:", error);
    throw error;
  }
};

export const fetchAllWorkouts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/workouts`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fehler beim Laden der Workouts:", error);
    throw error;
  }
};
