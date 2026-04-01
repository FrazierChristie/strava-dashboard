"use client";

interface Activity {
  start_date: string;
  sport_type: string;
  name: string;
  distance: number;
  moving_time: number;
  elevation_gain: number;
}

interface Props {
  activities: Activity[];
}

const TREADMILL_KEYWORDS = ["treadmill", "mill", "indoor run"];
const isTreadmill = (a: Activity) =>
  TREADMILL_KEYWORDS.some((kw) => a.name?.toLowerCase().includes(kw));

// Distance bands for each race distance - runs must fall within this range to count
const TARGET_DISTANCES = [
  { label: "5K",       metres: 5000,  minKm: 4.8,  maxKm: 5.3  },
  { label: "10K",      metres: 10000, minKm: 9.5,  maxKm: 10.6 },
  { label: "HM",       metres: 21097, minKm: 20.5, maxKm: 22.0 },
  { label: "Marathon", metres: 42195, minKm: 41.5, maxKm: 43.5 },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(movingTime: number, distanceMetres: number): string {
  const secsPerKm = movingTime / (distanceMetres / 1000);
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function getBestActual(runs: Activity[], minKm: number, maxKm: number) {
  const eligible = runs.filter((r) => {
    const km = r.distance / 1000;
    if (km < minKm || km > maxKm) return false;
    if (r.moving_time <= 0) return false;
    // Ignore anything faster than 3:30/km - GPS glitch or non-race segment
    const paceSecPerKm = r.moving_time / (r.distance / 1000);
    if (paceSecPerKm < 210) return false;
    return true;
  });

  if (!eligible.length) return null;

  // Best = fastest pace (lowest secs/km)
  return eligible.reduce((best, r) => {
    const pace = r.moving_time / (r.distance / 1000);
    const bestPace = best.moving_time / (best.distance / 1000);
    return pace < bestPace ? r : best;
  });
}

function getOtherBests(activities: Activity[]) {
  const runs  = activities.filter((a) => (a.sport_type === "Run" || a.sport_type === "TrailRun") && !isTreadmill(a));
  const rides = activities.filter((a) => a.sport_type === "Ride");

  const longestRun  = [...runs].sort((a, b) => b.distance - a.distance)[0];
  const longestRide = [...rides].sort((a, b) => b.distance - a.distance)[0];
  const mostElev    = [...activities].sort((a, b) => b.elevation_gain - a.elevation_gain)[0];

  const weekMap: Record<string, number> = {};
  for (const act of activities) {
    const d = new Date(act.start_date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    weekMap[key] = (weekMap[key] ?? 0) + 1;
  }
  const bestWeekKey = Object.entries(weekMap).sort((a, b) => b[1] - a[1])[0];

  return { longestRun, longestRide, mostElev, bestWeekKey };
}

export default function PersonalBests({ activities }: Props) {
  const runs = activities.filter(
    (a) => (a.sport_type === "Run" || a.sport_type === "TrailRun") && !isTreadmill(a)
  );
  const { longestRun, longestRide, mostElev, bestWeekKey } = getOtherBests(activities);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Race PBs */}
      <div>
        <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
          Race PBs · actual times within distance band
        </p>
        <div className="space-y-2">
          {TARGET_DISTANCES.map(({ label, minKm, maxKm }) => {
            const pb = getBestActual(runs, minKm, maxKm);
            return (
              <div key={label} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-white/50 text-sm w-20">{label}</span>
                {pb ? (
                  <div className="text-right">
                    <div>
                      <span className="text-[#fc4c02] font-bold text-lg tabular-nums">
                        {formatTime(pb.moving_time)}
                      </span>
                      <span className="text-white/25 text-xs ml-3">
                        {formatPace(pb.moving_time, pb.distance)}
                      </span>
                    </div>
                    <div className="text-white/20 text-[10px] mt-0.5">
                      {(pb.distance / 1000).toFixed(2)}km · {pb.start_date.slice(0, 10)}
                    </div>
                  </div>
                ) : (
                  <span className="text-white/20 text-sm">—</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-white/15 mt-2">
          From {runs.length} outdoor runs in selected period
        </p>
      </div>

      {/* Records */}
      <div>
        <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3">Records</p>
        <div className="space-y-2">
          {longestRun && (
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-white/50 text-sm">🏃 Longest Run</span>
              <div className="text-right">
                <span className="text-[#fc4c02] font-bold">{(longestRun.distance / 1000).toFixed(1)} km</span>
                <span className="text-white/25 text-xs ml-2">{longestRun.start_date.slice(0, 10)}</span>
              </div>
            </div>
          )}
          {longestRide && (
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-white/50 text-sm">🚴 Longest Ride</span>
              <div className="text-right">
                <span className="text-[#fc4c02] font-bold">{(longestRide.distance / 1000).toFixed(1)} km</span>
                <span className="text-white/25 text-xs ml-2">{longestRide.start_date.slice(0, 10)}</span>
              </div>
            </div>
          )}
          {mostElev && (
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-white/50 text-sm">⛰️ Most Elevation</span>
              <div className="text-right">
                <span className="text-[#fc4c02] font-bold">{Math.round(mostElev.elevation_gain).toLocaleString()} m</span>
                <span className="text-white/25 text-xs ml-2">{mostElev.start_date.slice(0, 10)}</span>
              </div>
            </div>
          )}
          {bestWeekKey && (
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-white/50 text-sm">📅 Busiest Week</span>
              <div className="text-right">
                <span className="text-[#fc4c02] font-bold">{bestWeekKey[1]} activities</span>
                <span className="text-white/25 text-xs ml-2">w/c {bestWeekKey[0]}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
