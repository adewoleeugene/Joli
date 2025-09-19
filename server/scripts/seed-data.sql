-- Joli Event Gamification Platform - Sample Data
-- Run this after the main schema setup

-- Sample organizer users
INSERT INTO users (id, email, first_name, last_name, role, organization, bio, is_active, email_verified) VALUES
('11111111-1111-1111-1111-111111111111', 'organizer1@joli.com', 'Sarah', 'Johnson', 'organizer', 'Tech Conference Inc', 'Experienced event organizer specializing in tech conferences and workshops.', true, true),
('22222222-2222-2222-2222-222222222222', 'organizer2@joli.com', 'Michael', 'Chen', 'organizer', 'Corporate Events Ltd', 'Corporate event specialist with 10+ years of experience.', true, true),
('33333333-3333-3333-3333-333333333333', 'organizer3@joli.com', 'Emily', 'Rodriguez', 'organizer', 'University Events', 'Academic event coordinator focused on student engagement.', true, true)
ON CONFLICT (email) DO NOTHING;

-- Sample participant users
INSERT INTO users (id, email, first_name, last_name, role, organization, is_active, email_verified) VALUES
('44444444-4444-4444-4444-444444444444', 'participant1@example.com', 'Alex', 'Thompson', 'participant', 'TechCorp', true, true),
('55555555-5555-5555-5555-555555555555', 'participant2@example.com', 'Jessica', 'Williams', 'participant', 'StartupXYZ', true, true),
('66666666-6666-6666-6666-666666666666', 'participant3@example.com', 'David', 'Brown', 'participant', 'University', true, true),
('77777777-7777-7777-7777-777777777777', 'participant4@example.com', 'Lisa', 'Davis', 'participant', 'DesignStudio', true, true),
('88888888-8888-8888-8888-888888888888', 'participant5@example.com', 'Robert', 'Wilson', 'participant', 'ConsultingFirm', true, true)
ON CONFLICT (email) DO NOTHING;

-- Sample events
INSERT INTO events (id, title, description, organizer_id, start_date, end_date, registration_deadline, max_participants, location, status, is_public, registration_required, tags) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Tech Innovation Summit 2024',
  'Join us for the most exciting tech conference of the year! Featuring keynotes from industry leaders, interactive workshops, and networking opportunities.',
  '11111111-1111-1111-1111-111111111111',
  '2024-03-15 09:00:00+00',
  '2024-03-17 18:00:00+00',
  '2024-03-10 23:59:59+00',
  500,
  'San Francisco Convention Center',
  'published',
  true,
  true,
  ARRAY['technology', 'innovation', 'networking', 'conference']
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Corporate Team Building Challenge',
  'An engaging team building event designed to strengthen collaboration and communication within your organization.',
  '22222222-2222-2222-2222-222222222222',
  '2024-02-20 10:00:00+00',
  '2024-02-20 17:00:00+00',
  '2024-02-15 23:59:59+00',
  100,
  'Corporate Retreat Center',
  'active',
  false,
  true,
  ARRAY['team-building', 'corporate', 'collaboration']
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'University Innovation Week',
  'A week-long celebration of student innovation featuring competitions, workshops, and presentations.',
  '33333333-3333-3333-3333-333333333333',
  '2024-04-01 08:00:00+00',
  '2024-04-05 20:00:00+00',
  '2024-03-25 23:59:59+00',
  300,
  'University Campus',
  'published',
  true,
  true,
  ARRAY['university', 'innovation', 'students', 'competition']
)
ON CONFLICT (id) DO NOTHING;

-- Sample games for Tech Innovation Summit
INSERT INTO games (id, event_id, title, description, type, status, start_time, end_time, max_score, time_limit, instructions, questions, settings) VALUES
(
  'game1111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Tech Trivia Challenge',
  'Test your knowledge of the latest technology trends and innovations!',
  'trivia',
  'active',
  '2024-03-15 14:00:00+00',
  '2024-03-15 15:00:00+00',
  100,
  60,
  'Answer all questions to the best of your ability. Each correct answer is worth 10 points.',
  '[
    {
      "id": 1,
      "question": "What does AI stand for?",
      "options": ["Artificial Intelligence", "Automated Integration", "Advanced Interface", "Algorithmic Implementation"],
      "correct_answer": 0,
      "points": 10
    },
    {
      "id": 2,
      "question": "Which company developed the React JavaScript library?",
      "options": ["Google", "Microsoft", "Facebook", "Apple"],
      "correct_answer": 2,
      "points": 10
    },
    {
      "id": 3,
      "question": "What is the latest version of HTTP?",
      "options": ["HTTP/1.1", "HTTP/2", "HTTP/3", "HTTP/4"],
      "correct_answer": 2,
      "points": 10
    }
  ]',
  '{"shuffle_questions": true, "show_correct_answers": false}'
),
(
  'game2222-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Innovation Photo Contest',
  'Capture the spirit of innovation! Submit your best photo representing technological advancement.',
  'photo_contest',
  'active',
  '2024-03-15 09:00:00+00',
  '2024-03-17 18:00:00+00',
  100,
  null,
  'Submit a high-quality photo that represents innovation in technology. Photos will be judged on creativity, relevance, and technical quality.',
  '[]',
  '{"max_file_size": "10MB", "allowed_formats": ["jpg", "jpeg", "png"], "judging_criteria": ["creativity", "relevance", "technical_quality"]}'
);

-- Sample games for Corporate Team Building
INSERT INTO games (id, event_id, title, description, type, status, start_time, end_time, max_score, time_limit, instructions, questions, settings) VALUES
(
  'game3333-3333-3333-3333-333333333333',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Team Knowledge Quiz',
  'How well do you know your colleagues and company?',
  'quiz',
  'active',
  '2024-02-20 11:00:00+00',
  '2024-02-20 12:00:00+00',
  100,
  45,
  'Work together with your team to answer questions about your company and colleagues.',
  '[
    {
      "id": 1,
      "question": "In what year was our company founded?",
      "options": ["2010", "2012", "2015", "2018"],
      "correct_answer": 1,
      "points": 20
    },
    {
      "id": 2,
      "question": "What is our company\'s core value?",
      "options": ["Innovation", "Collaboration", "Excellence", "All of the above"],
      "correct_answer": 3,
      "points": 20
    }
  ]',
  '{"team_based": true, "allow_discussion": true}'
),
(
  'game4444-4444-4444-4444-444444444444',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Office Scavenger Hunt',
  'Find items and complete challenges around the office!',
  'scavenger_hunt',
  'active',
  '2024-02-20 14:00:00+00',
  '2024-02-20 16:00:00+00',
  100,
  120,
  'Complete all challenges and find all items on the list. Take photos as proof of completion.',
  '[]',
  '{"items": ["Red stapler", "Company handbook", "Coffee mug with logo"], "challenges": ["Take a team selfie", "Find the oldest employee", "Locate the emergency exit"]}'
);

-- Sample games for University Innovation Week
INSERT INTO games (id, event_id, title, description, type, status, start_time, end_time, max_score, time_limit, instructions, questions, settings) VALUES
(
  'game5555-5555-5555-5555-555555555555',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Innovation Pitch Video',
  'Create a 2-minute video pitching your innovative idea!',
  'video_contest',
  'active',
  '2024-04-01 08:00:00+00',
  '2024-04-05 20:00:00+00',
  100,
  null,
  'Create a compelling 2-minute video pitch for your innovative idea. Videos will be judged on creativity, feasibility, and presentation quality.',
  '[]',
  '{"max_duration": 120, "max_file_size": "100MB", "judging_criteria": ["creativity", "feasibility", "presentation"]}'
),
(
  'game6666-6666-6666-6666-666666666666',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Future Tech Poll',
  'Vote on which technology will have the biggest impact in the next decade!',
  'poll',
  'active',
  '2024-04-02 10:00:00+00',
  '2024-04-04 18:00:00+00',
  50,
  null,
  'Vote for the technology you believe will have the most significant impact in the next 10 years.',
  '[
    {
      "id": 1,
      "question": "Which technology will have the biggest impact in the next decade?",
      "options": ["Artificial Intelligence", "Quantum Computing", "Biotechnology", "Renewable Energy"],
      "type": "single_choice",
      "points": 50
    }
  ]',
  '{"allow_multiple_votes": false, "show_results": true}'
);

-- Sample event participants
INSERT INTO event_participants (event_id, user_id, status) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'registered'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'registered'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'registered'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'registered'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'registered'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'registered'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 'registered'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', 'registered'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888888', 'registered')
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Sample submissions
INSERT INTO submissions (id, game_id, user_id, event_id, content, score, status, submitted_at) VALUES
(
  'sub11111-1111-1111-1111-111111111111',
  'game1111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '{"answers": [0, 2, 2], "time_taken": 45}',
  30,
  'approved',
  '2024-03-15 14:30:00+00'
),
(
  'sub22222-2222-2222-2222-222222222222',
  'game1111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555555',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '{"answers": [0, 2, 1], "time_taken": 38}',
  20,
  'approved',
  '2024-03-15 14:25:00+00'
),
(
  'sub33333-3333-3333-3333-333333333333',
  'game2222-2222-2222-2222-222222222222',
  '77777777-7777-7777-7777-777777777777',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '{"description": "A stunning photo of our new AI-powered robot assistant"}',
  85,
  'approved',
  '2024-03-16 10:15:00+00'
),
(
  'sub44444-4444-4444-4444-444444444444',
  'game3333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '{"answers": [1, 3], "team_members": ["Alex Thompson", "Jessica Williams"]}',
  40,
  'approved',
  '2024-02-20 11:45:00+00'
),
(
  'sub55555-5555-5555-5555-555555555555',
  'game6666-6666-6666-6666-666666666666',
  '66666666-6666-6666-6666-666666666666',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '{"vote": 0, "comment": "AI will revolutionize every industry"}',
  50,
  'approved',
  '2024-04-02 14:20:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- Update leaderboards for all events
SELECT update_leaderboard_for_event('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
SELECT update_leaderboard_for_event('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT update_leaderboard_for_event('cccccccc-cccc-cccc-cccc-cccccccccccc');

-- Sample notifications
INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id) VALUES
('44444444-4444-4444-4444-444444444444', 'Welcome to Tech Innovation Summit!', 'Thank you for registering. The event starts on March 15th.', 'info', 'event', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('55555555-5555-5555-5555-555555555555', 'New Game Available', 'Tech Trivia Challenge is now live! Test your knowledge.', 'info', 'game', 'game1111-1111-1111-1111-111111111111'),
('77777777-7777-7777-7777-777777777777', 'Submission Approved', 'Your photo contest submission has been approved and scored!', 'success', 'submission', 'sub33333-3333-3333-3333-333333333333'),
('66666666-6666-6666-6666-666666666666', 'Event Reminder', 'University Innovation Week starts tomorrow. Don\'t forget to participate!', 'info', 'event', 'cccccccc-cccc-cccc-cccc-cccccccccccc')
ON CONFLICT DO NOTHING;

COMMIT;