CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('Essential', 'Pro', 'Elite')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, day)
);

CREATE INDEX members_created_idx ON members(created_at DESC);
CREATE INDEX check_ins_day_idx ON check_ins(day);
