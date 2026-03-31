import { neon } from "@neondatabase/serverless";

// Create a SQL query function connected to our Neon database.
// process.env.DATABASE_URL comes from Vercel - it's the connection string
// that tells Neon where our database is and how to authenticate.
const sql = neon(process.env.DATABASE_URL!);

export default sql;

// This function creates the activities table if it doesn't exist yet.
// "IF NOT EXISTS" makes it safe to run multiple times - it won't wipe existing data.
export async function setupDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id            BIGINT PRIMARY KEY,   -- Strava's activity ID (unique)
      athlete_id    BIGINT NOT NULL,      -- Strava athlete ID (for multi-user support later)
      sport_type    TEXT NOT NULL,
      name          TEXT,
      distance      FLOAT DEFAULT 0,     -- metres
      moving_time   INT DEFAULT 0,       -- seconds
      elapsed_time  INT DEFAULT 0,       -- seconds
      elevation_gain FLOAT DEFAULT 0,   -- metres
      start_date    TIMESTAMPTZ,
      average_speed FLOAT DEFAULT 0,    -- metres/second
      max_speed     FLOAT DEFAULT 0,
      average_hr    FLOAT,              -- nullable - not all activities have HR
      max_hr        FLOAT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Index on athlete_id so queries for a specific user are fast.
  // Without an index, Postgres scans every row to find matches.
  await sql`
    CREATE INDEX IF NOT EXISTS idx_activities_athlete
    ON activities(athlete_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_activities_date
    ON activities(start_date)
  `;
}
