app.post('/api/workouts/subscribe', authenticateToken, async (req, res) => {
  try {
    console.log('Abonnement-Anfrage erhalten:', {
      body: req.body,
      user: req.user
    });

    const { workoutId } = req.body; // Dies ist die lokale workout.id aus deiner DB
    const userId = req.user.id;

    // Validierung
    if (!workoutId) {
      return res.status(400).json({ error: 'workoutId ist erforderlich' });
    }

    // Prüfe, ob Workout in lokaler DB existiert
    const workout = await db.get('SELECT * FROM workouts WHERE id = ?', [workoutId]);
    if (!workout) {
      return res.status(404).json({ error: 'Workout nicht gefunden' });
    }

    // Prüfe, ob bereits abonniert
    const existing = await db.get(
      'SELECT * FROM subscriptions WHERE user_id = ? AND workout_id = ?',
      [userId, workoutId]
    );

    if (existing) {
      return res.status(400).json({ error: 'Du hast dieses Workout bereits abonniert' });
    }

    // Abonnement speichern
    await db.run(
      'INSERT INTO subscriptions (user_id, workout_id) VALUES (?, ?)',
      [userId, workoutId]
    );

    console.log('Abonnement erfolgreich für User', userId, 'Workout', workoutId);

    res.json({
      success: true,
      message: 'Workout erfolgreich abonniert',
      workout: workout
    });

  } catch (error) {
    console.error('Abonnement-Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler: ' + error.message });
  }
});