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

  const result = await sql`
    SELECT
      COUNT(*)::int as total,
      MAX(start_date) as most_recent,
      MIN(start_date) as oldest,
      EXTRACT(EPOCH FROM MAX(start_date))::bigint as most_recent_ts
    FROM activities
    WHERE athlete_id = ${athleteId}
  `;

  return NextResponse.json(result[0]);
}
