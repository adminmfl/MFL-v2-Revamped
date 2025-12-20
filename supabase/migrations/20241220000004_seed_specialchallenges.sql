-- Seed sample preset challenges into specialchallenges table

INSERT INTO public.specialchallenges (challenge_id, name, challenge_type, start_date, end_date, created_date)
VALUES 
  (
    gen_random_uuid(),
    'Daily Steps Challenge',
    'individual',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'Team Fitness Bingo',
    'team',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'Unique Workout Day',
    'individual',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'Sub-Team Leaderboard',
    'sub_team',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_TIMESTAMP
  )
ON CONFLICT DO NOTHING;
