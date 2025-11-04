const API_BASE_URL = 'http://localhost:5001';

export const fetchExercisesFromAPI = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.muscle) queryParams.append('muscle', params.muscle);
    if (params.type) queryParams.append('type', params.type);
    if (params.difficulty) queryParams.append('difficulty', params.difficulty);
    
    const url = `${API_BASE_URL}/external-workouts?${queryParams.toString()}`;
    console.log('API Call:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    return data.exercises || [];
    
  } catch (error) {
    console.error('Error fetching external workouts:', error);
    throw error;
  }
};

export const SUPPORTED_VALUES = {
  muscles: [
    'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 
    'chest', 'forearms', 'glutes', 'hamstrings', 'lats', 
    'lower_back', 'middle_back', 'neck', 'quadriceps', 'traps', 'triceps'
  ],
  types: [
    'cardio', 'olympic_weightlifting', 'plyometrics', 'powerlifting',
    'strength', 'stretching', 'strongman'
  ],
  difficulties: ['beginner', 'intermediate', 'expert']
};

export const GERMAN_TRANSLATIONS = {
  muscles: {
    'abdominals': 'Bauch',
    'abductors': 'Abduktoren', 
    'adductors': 'Adduktoren',
    'biceps': 'Bizeps',
    'calves': 'Waden',
    'chest': 'Brust',
    'forearms': 'Unterarme',
    'glutes': 'Gesäß',
    'hamstrings': 'Hamstrings',
    'lats': 'Latissimus',
    'lower_back': 'Unterer Rücken',
    'middle_back': 'Mittlerer Rücken',
    'neck': 'Nacken',
    'quadriceps': 'Oberschenkel',
    'traps': 'Traps',
    'triceps': 'Trizeps'
  },
  types: {
    'cardio': 'Kardio',
    'olympic_weightlifting': 'Olympisches Gewichtheben',
    'plyometrics': 'Plyometrie',
    'powerlifting': 'Powerlifting',
    'strength': 'Krafttraining',
    'stretching': 'Stretching',
    'strongman': 'Strongman'
  },
  difficulties: {
    'beginner': 'Anfänger',
    'intermediate': 'Fortgeschritten',
    'expert': 'Profi'
  }
};