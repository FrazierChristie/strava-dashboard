import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

// Strava returns max 200 activities per page.
// We loop until we get an empty page, meaning we've fetched everything.
async function fetchAllActivities(accessToken: string) {
  const all = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const batch = await res.json();

    // Empty array means no more pages
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);
    page++;

    // Safety limit - 5 pages = 1000 activities max
    if (page > 5) break;
  }

  return all;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const activities = await fetchAllActivities(session.accessToken);

  // Group by sport type and compute totals per sport
  const bySport: Record<string, { count: number; distance: number; moving_time: number; elevation_gain: number }> = {};

  for (const act of activities) {
    const sport = act.sport_type || act.type || "Other";
    if (!bySport[sport]) {
      bySport[sport] = { count: 0, distance: 0, moving_time: 0, elevation_gain: 0 };
    }
    bySport[sport].count++;
    bySport[sport].distance += act.distance || 0;
    bySport[sport].moving_time += act.moving_time || 0;
    bySport[sport].elevation_gain += act.total_elevation_gain || 0;
  }

  // Sort sports by activity count, most frequent first
  const sports = Object.entries(bySport)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([sport, totals]) => ({ sport, ...totals }));

  return NextResponse.json({ total: activities.length, sports });
}
