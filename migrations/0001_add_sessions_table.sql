
-- Drop existing conflicting objects if they exist
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;

-- Create sessions table for connect-pg-simple
CREATE TABLE "sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid");
CREATE INDEX "IDX_sessions_expire" ON "sessions" ("expire");
