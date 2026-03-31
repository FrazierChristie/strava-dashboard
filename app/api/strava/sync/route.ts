import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import sql from "@/lib/db";

async function fetchAllActivities(accessToken: string, afterTimestamp?: number) {
  const all = [];
  let page = 1;

  while (true) {
    // "after" is a Unix timestamp - only fetch activities newer than this.
    // On first sync: undefined (fetch everything).
    // On subsequent syncs: timestamp of our newest stored activity.
    const afterParam = afterTimestamp ? `&after=${afterTimestamp}` : "";
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}${afterParam}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    page++;
    if (page > 10) break; // safety cap: 2000 activities max
  }

  return all;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const athleteId = parseInt(session.athleteId);

  // Find the most recent activity we already have stored.
  // If we have data, only fetch newer activities from Strava (incremental sync).
  // If we have nothing, fetch everything (full sync).
  const latest = await sql`
    SELECT EXTRACT(EPOCH FROM MAX(start_date))::bigint AS ts
    FROM activities
    WHERE athlete_id = ${athleteId}
  `;

  const afterTimestamp = latest[0]?.ts ?? undefined;
  const isFullSync = !afterTimestamp;

  const activities = await fetchAllActivities(session.accessToken, afterTimestamp);

  if (activities.length === 0) {
    return NextResponse.json({ synced: 0, message: "Already up to date" });
  }

  // Upsert each activity into the database.
  // "ON CONFLICT (id) DO UPDATE" means: if this activity already exists
  // (same Strava ID), update it rather than throwing an error.
  // This makes the sync idempotent - safe to run multiple times.
  let synced = 0;
  for (const act of activities) {
    await sql`
      INSERT INTO activities (
        id, athlete_id, sport_type, name,
        distance, moving_time, elapsed_time, elevation_gain,
        start_date, average_speed, max_speed, average_hr, max_hr
      ) VALUES (
        ${act.id},
        ${athleteId},
        ${act.sport_type ?? act.type ?? "Other"},
        ${act.name},
        ${act.distance ?? 0},
        ${act.moving_time ?? 0},
        ${act.elapsed_time ?? 0},
        ${act.total_elevation_gain ?? 0},
        ${act.start_date},
        ${act.average_speed ?? 0},
        ${act.max_speed ?? 0},
        ${act.average_heartrate ?? null},
        ${act.max_heartrate ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sport_type = EXCLUDED.sport_type
    `;
    synced++;
  }

  return NextResponse.json({
    synced,
    type: isFullSync ? "full" : "incremental",
    message: `Synced ${synced} activities`,
  });
}
