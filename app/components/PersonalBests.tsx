"use client";

// Personal Bests extracted from run history.
// Uses the Riegel formula to predict race times from training data:
// predicted_time = known_time × (target_distance / known_distance) ^ 1.06
//
// We find the best predicted performance at each target distance
// by running the formula against all recorded runs.

interface Activity {
  start_date: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  name: string;
  elevation_gain: number;
}

interface Props {
  activities: Activity[];
}

const TARGET_DISTANCES = [
  { label: "5K",    metres: 5000 },
  { label: "10K",   metres: 10000 },
  { label: "HM",    metres: 21097 },
  { label: "Marathon", metres: 42195 },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(seconds: number, metres: number): string {
  const secsPerKm = seconds / (metres / 1000);
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

// Riegel prediction: t2 = t1 × (d2/d1)^1.06
function riegelPredict(knownTime: number, knownDist: number, targetDist: number): number {
  return knownTime * Math.pow(targetDist / knownDist, 1.06);
}

function getBestPredicted(runs: Activity[], targetMetres: number): { time: number; date: string; pace: string } | null {
  // Only use runs between 1km and 2× the target distance for Riegel accuracy
  const eligible = runs.filter(
    (r) => r.distance >= 1000 && r.distance <= targetMetres * 2 && r.moving_time > 0
  );
  if (!eligible.length) return null;

  let best: { time: number; date: string } | null = null;

  for (const run of eligible) {
    const predicted = riegelPredict(run.moving_time, run.distance, targetMetres);
    if (!best || predicted < best.time) {
      best = { time: predicted, date: run.start_date.slice(0, 10) };
    }
  }

  if (!best) return null;
  return { ...best, pace: formatPace(best.time, targetMetres) };
}

function getOtherBests(activities: Activity[]) {
  const runs   = activities.filter((a) => a.sport_type === "Run" || a.sport_type === "TrailRun");
  const rides  = activities.filter((a) => a.sport_type === "Ride");
  const allActs = activities;

  const longestRun  = runs.sort((a, b) => b.distance - a.distance)[0];
  const longestRide = rides.sort((a, b) => b.distance - a.distance)[0];
  const mostElev    = allActs.sort((a, b) => b.elevation_gain - a.elevation_gain)[0];

  // Most active week
  const weekMap: Record<string, number> = {};
  for (const act of allActs) {
    const d = new Date(act.start_date);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    weekMap[key] = (weekMap[key] ?? 0) + 1;
  }
  const bestWeekKey = Object.entries(weekMap).sort((a, b) => b[1] - a[1])[0];

  return { longestRun, longestRide, mostElev, bestWeekKey };
}

export default function PersonalBests({ activities }: Props) {
  const runs = activities.filter((a) => a.sport_type === "Run" || a.sport_type === "TrailRun");
  const { longestRun, longestRide, mostElev, bestWeekKey } = getOtherBests(activities);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* Race predictions */}
      <div>
        <p className="text-[10px] text-white/20 uppercase tracking-widest mb-3">
          Estimated race times · Riegel formula
        </p>
        <div className="space-y-2">
          {TARGET_DISTANCES.map(({ label, metres }) => {
            const pb = getBestPredicted(runs, metres);
            return (
              <div key={label} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-white/50 text-sm w-20">{label}</span>
                {pb ? (
                  <div className="text-right">
                    <span className="text-[#fc4c02] font-bold text-lg tabular-nums">
                      {formatTime(pb.time)}
                    </span>
                    <span className="text-white/25 text-xs ml-3">{pb.pace}</span>
                  </div>
                ) : (
                  <span className="text-white/20 text-sm">Not enough data</span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-white/15 mt-2">
          Predicted from best effort across all {runs.length} runs
        </p>
      </div>

      {/* Other bests */}
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
              <span className="text-white/50 text-sm">📅 Most Active Week</span>
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
