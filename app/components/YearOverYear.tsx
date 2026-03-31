"use client";

interface Activity {
  start_date: string;
  sport_type: string;
  distance: number;
  moving_time: number;
}

interface Props {
  activities: Activity[];
}

const SPORT_CONFIG: Record<string, { icon: string; label: string }> = {
  Run:          { icon: "🏃", label: "Running" },
  TrailRun:     { icon: "🌲", label: "Trail Run" },
  Ride:         { icon: "🚴", label: "Cycling" },
  Rowing:       { icon: "🚣", label: "Rowing" },
  Swim:         { icon: "🏊", label: "Swimming" },
  Workout:      { icon: "💪", label: "Workout" },
  WeightTraining: { icon: "🏋️", label: "Weights" },
  Hike:         { icon: "⛰️", label: "Hiking" },
  Walk:         { icon: "🚶", label: "Walking" },
  AlpineSki:    { icon: "⛷️", label: "Skiing" },
  Snowboard:    { icon: "🏂", label: "Snowboarding" },
};

const km  = (m: number) => (m / 1000).toFixed(0);
const hrs = (s: number) => (s / 3600).toFixed(0);

function delta(curr: number, prev: number) {
  if (!prev) return null;
  const pct = ((curr - prev) / prev) * 100;
  return pct;
}

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  const pct = delta(curr, prev);
  if (pct === null || prev === 0) return <span className="text-white/20">—</span>;
  const up = pct >= 0;
  return (
    <span className={`text-[10px] font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function YearOverYear({ activities }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  // YTD cutoff: same month+day in any year (e.g. today is Mar 31, so only count up to Mar 31 in past years)
  const ytdMonth = now.getMonth();
  const ytdDay   = now.getDate();

  function isWithinYTD(dateStr: string, year: number): boolean {
    const d = new Date(dateStr);
    if (d.getFullYear() !== year) return false;
    if (d.getMonth() < ytdMonth) return true;
    if (d.getMonth() === ytdMonth && d.getDate() <= ytdDay) return true;
    return false;
  }

  const years = [...new Set(activities.map((a) => new Date(a.start_date).getFullYear()))]
    .sort((a, b) => b - a)
    .slice(0, 5);

  const sportSet = new Set(activities.map((a) => a.sport_type));
  const sports = [...sportSet].filter((s) => {
    const total = activities.filter((a) => a.sport_type === s).length;
    return total >= 3;
  });

  type YearStats = { count: number; distance: number; moving_time: number };
  const data: Record<string, Record<number, YearStats>> = {};

  for (const sport of sports) {
    data[sport] = {};
    for (const year of years) {
      const acts = activities.filter(
        (a) => a.sport_type === sport && isWithinYTD(a.start_date, year)
      );
      data[sport][year] = {
        count: acts.length,
        distance: acts.reduce((s, a) => s + a.distance, 0),
        moving_time: acts.reduce((s, a) => s + a.moving_time, 0),
      };
    }
  }

  const mostRecentYear = years[0];

  // Sort sports by most activities in the current year
  const sortedSports = [...sports].sort(
    (a, b) => (data[b][mostRecentYear]?.count ?? 0) - (data[a][mostRecentYear]?.count ?? 0)
  );

  return (
    <div className="overflow-x-auto">
      <p className="text-[10px] text-white/20 mb-3">
        YTD comparison · up to {now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} each year
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-white/30 uppercase tracking-widest pb-3 pr-4 font-normal">Sport</th>
            {years.map((y) => (
              <th key={y} colSpan={2} className="text-center text-white/30 uppercase tracking-widest pb-3 px-2 font-normal">
                {y}
              </th>
            ))}
          </tr>
          <tr className="border-b border-white/5">
            <th className="pb-2 pr-4" />
            {years.map((y) => (
              <>
                <th key={`${y}-acts`} className="text-white/20 font-normal pb-2 px-1 text-center">acts</th>
                <th key={`${y}-km`} className="text-white/20 font-normal pb-2 px-1 text-center">km / hrs</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedSports.map((sport) => {
            const cfg = SPORT_CONFIG[sport] ?? { icon: "🏅", label: sport };
            const hasDistance = (data[sport][mostRecentYear]?.distance ?? 0) > 0;
            return (
              <tr key={sport} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="py-3 pr-4 text-white/60 whitespace-nowrap">
                  {cfg.icon} {cfg.label}
                </td>
                {years.map((y, yi) => {
                  const s = data[sport][y] ?? { count: 0, distance: 0, moving_time: 0 };
                  const prev = data[sport][years[yi + 1]];
                  return (
                    <>
                      <td key={`${y}-count`} className="py-3 px-1 text-center">
                        <span className="text-white font-bold">{s.count || "—"}</span>
                        {yi === 0 && prev && (
                          <span className="ml-1">
                            <DeltaBadge curr={s.count} prev={prev.count} />
                          </span>
                        )}
                      </td>
                      <td key={`${y}-dist`} className="py-3 px-1 text-center text-white/50">
                        {s.count > 0
                          ? hasDistance
                            ? `${km(s.distance)}`
                            : `${hrs(s.moving_time)}h`
                          : "—"}
                      </td>
                    </>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
