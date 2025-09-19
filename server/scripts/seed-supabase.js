const { supabaseAdmin } = require('../config/supabase');

async function getOrganizerId() {
  // Find any existing organizer user
  const { data: organizers, error: organizerError } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('role', 'organizer')
    .limit(1);

  if (organizerError) {
    console.warn('⚠️  Error querying organizers:', organizerError.message);
  }

  if (organizers && organizers.length > 0) {
    return organizers[0].id;
  }

  // Seeding requires an existing organizer user; no fallback user is assumed
  return null;
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Resolve organizer ID; require an organizer to exist
    const organizerId = await getOrganizerId();
    if (!organizerId) {
      throw new Error(
        'No organizer user found. Please create an organizer account via Supabase Auth before seeding.'
      );
    }

    // Seed events (idempotent via upsert)
    const events = [
      {
        id: 'e1111111-1111-1111-1111-111111111111',
        title: 'Joli Platform Launch Event',
        description: 'Kickoff event to launch the Joli event gamification platform.',
        organizer_id: organizerId,
        start_date: new Date('2024-10-01T09:00:00Z').toISOString(),
        end_date: new Date('2024-10-01T17:00:00Z').toISOString(),
        location: 'Online',
        status: 'active',
        is_public: true,
        registration_required: true,
        tags: ['launch', 'joli', 'platform'],
        metadata: { theme: 'launch-day' }
      }
    ];

    console.log('🎉 Upserting events...');
    const { data: insertedEvents, error: eventsError } = await supabaseAdmin
      .from('events')
      .upsert(events, { onConflict: 'id' })
      .select('*');

    if (eventsError) {
      console.warn('⚠️  Events upsert warning:', eventsError.message);
    } else {
      console.log(`✅ Events upserted: ${insertedEvents?.length || 0}`);
    }

    const eventId = (insertedEvents && insertedEvents[0]?.id) || events[0].id;

    // Seed games for the event (idempotent via upsert)
    const games = [
      {
        id: 'g1111111-1111-1111-1111-111111111111',
        event_id: eventId,
        title: 'Launch Day Trivia',
        description: 'Quick trivia to get everyone warmed up.',
        type: 'trivia',
        status: 'active',
        start_time: new Date('2024-10-01T10:00:00Z').toISOString(),
        end_time: new Date('2024-10-01T10:30:00Z').toISOString(),
        max_score: 100,
        time_limit: 30,
        instructions: 'Answer all questions. Each correct answer is worth points.',
        questions: [
          {
            id: 1,
            question: 'What does Joli focus on?',
            options: [
              'Event gamification',
              'Database hosting',
              'Project management',
              'Cloud storage'
            ],
            correct_answer: 0,
            points: 10
          }
        ],
        settings: { shuffle_questions: true, show_correct_answers: false }
      }
    ];

    console.log('🎮 Upserting games...');
    const { data: insertedGames, error: gamesError } = await supabaseAdmin
      .from('games')
      .upsert(games, { onConflict: 'id' })
      .select('*');

    if (gamesError) {
      console.warn('⚠️  Games upsert warning:', gamesError.message);
    } else {
      console.log(`✅ Games upserted: ${insertedGames?.length || 0}`);
    }

    console.log('✅ Database seeding completed!');

    // Verify inserts
    const { data: eventData, error: eventVerifyError } = await supabaseAdmin
      .from('events')
      .select('id, title, status')
      .eq('id', events[0].id)
      .limit(1);

    if (eventVerifyError) {
      console.error('❌ Error verifying events:', eventVerifyError.message);
    } else {
      console.log('🎉 Seeded event:', eventData?.[0]);
    }

    const { data: gameData, error: gameVerifyError } = await supabaseAdmin
      .from('games')
      .select('id, title, type')
      .eq('id', games[0].id)
      .limit(1);

    if (gameVerifyError) {
      console.error('❌ Error verifying games:', gameVerifyError.message);
    } else {
      console.log('🎮 Seeded game:', gameData?.[0]);
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedDatabase();