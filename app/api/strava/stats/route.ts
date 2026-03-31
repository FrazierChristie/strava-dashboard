import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  // getServerSession runs on the server and reads the session cookie.
  // We pass authOptions so it knows how we configured NextAuth.
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch the authenticated athlete's profile + stats from Strava
  const [athleteRes, statsRes] = await Promise.all([
    fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }),
    fetch(`https://www.strava.com/api/v3/athletes/${session.athleteId}/stats`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }),
  ]);

  const athlete = await athleteRes.json();
  const stats = await statsRes.json();

  return NextResponse.json({ athlete, stats });
}
