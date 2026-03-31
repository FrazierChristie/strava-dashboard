import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import sql from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const athleteId = parseInt(session.athleteId);

  // Read from our database - instant, no Strava API call needed
  const activities = await sql`
    SELECT
      id,
      sport_type,
      name,
      distance,
      moving_time,
      elevation_gain,
      average_speed,
      average_hr,
      start_date
    FROM activities
    WHERE athlete_id = ${athleteId}
    ORDER BY start_date DESC
  `;

  // Group by sport type and compute totals
  const bySport: Record<string, { count: number; distance: number; moving_time: number; elevation_gain: number }> = {};

  for (const act of activities) {
    const sport = act.sport_type;
    if (!bySport[sport]) {
      bySport[sport] = { count: 0, distance: 0, moving_time: 0, elevation_gain: 0 };
    }
    bySport[sport].count++;
    bySport[sport].distance += act.distance || 0;
    bySport[sport].moving_time += act.moving_time || 0;
    bySport[sport].elevation_gain += act.elevation_gain || 0;
  }

  const sports = Object.entries(bySport)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([sport, totals]) => ({ sport, ...totals }));

  // Also return the raw activity list - needed for charts (heatmap, PMC etc.)
  return NextResponse.json({
    total: activities.length,
    sports,
    activities: activities,
  });
}
