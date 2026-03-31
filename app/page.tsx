"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

// --- Types ---
interface SportTotals {
  sport: string;
  count: number;
  distance: number;
  moving_time: number;
  elevation_gain: number;
}

interface StatsData {
  athlete: {
    firstname: string;
    lastname: string;
    city: string;
    country: string;
    profile_medium: string;
  };
  stats: {
    all_run_totals: { distance: number; moving_time: number };
  };
}

interface ActivitiesData {
  total: number;
  sports: SportTotals[];
}

// --- Sport config: icons + display names + category ---
const SPORT_CONFIG: Record<string, { icon: string; label: string; category: string }> = {
  Run:                            { icon: "🏃", label: "Running",       category: "Endurance" },
  TrailRun:                       { icon: "🌲", label: "Trail Run",     category: "Endurance" },
  Ride:                           { icon: "🚴", label: "Cycling",       category: "Endurance" },
  Swim:                           { icon: "🏊", label: "Swimming",      category: "Endurance" },
  Rowing:                         { icon: "🚣", label: "Rowing",        category: "Endurance" },
  Workout:                        { icon: "💪", label: "Workout",       category: "Strength" },
  WeightTraining:                 { icon: "🏋️", label: "Weights",       category: "Strength" },
  HighIntensityIntervalTraining:  { icon: "⚡", label: "HIIT",         category: "Strength" },
  Hike:                           { icon: "⛰️", label: "Hiking",        category: "Adventure" },
  Walk:                           { icon: "🚶", label: "Walking",       category: "Adventure" },
  AlpineSki:                      { icon: "⛷️", label: "Skiing",        category: "Adventure" },
  Snowboard:                      { icon: "🏂", label: "Snowboarding",  category: "Adventure" },
  StandUpPaddling:                { icon: "🏄", label: "SUP",          category: "Adventure" },
};

// --- Formatting helpers ---
const km = (m: number) => (m / 1000).toFixed(1);
const hrs = (s: number) => (s / 3600).toFixed(1);
const pace = (m: number, s: number) => {
  if (!m) return null;
  const spk = s / (m / 1000);
  return `${Math.floor(spk / 60)}:${Math.round(spk % 60).toString().padStart(2, "0")} /km`;
};

// --- Components ---
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#fc4c02]">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

function SportCard({ s }: { s: SportTotals }) {
  const cfg = SPORT_CONFIG[s.sport] ?? { icon: "🏅", label: s.sport, category: "Other" };
  const showDistance = s.distance > 0;
  const avgPace = pace(s.distance, s.moving_time);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">{cfg.label}</span>
        </div>
        <span className="text-[#fc4c02] font-bold text-sm">{s.count}</span>
      </div>
      <div className="space-y-1 text-xs text-white/40">
        {showDistance && <p>{km(s.distance)} km</p>}
        <p>{hrs(s.moving_time)} hrs</p>
        {showDistance && s.elevation_gain > 0 && (
          <p>{Math.round(s.elevation_gain).toLocaleString()} m elev</p>
        )}
        {avgPace && <p className="text-white/25">{avgPace}</p>}
      </div>
    </div>
  );
}

// --- Main page ---
export default function Home() {
  const { data: session } = useSession();
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [actData, setActData] = useState<ActivitiesData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    // Fetch both endpoints in parallel
    Promise.all([
      fetch("/api/strava/stats").then((r) => r.json()),
      fetch("/api/strava/activities").then((r) => r.json()),
    ]).then(([stats, acts]) => {
      setStatsData(stats);
      setActData(acts);
    }).finally(() => setLoading(false));
  }, [session]);

  // Aggregate totals across all sports
  const totalDist = actData?.sports.reduce((sum, s) => sum + s.distance, 0) ?? 0;
  const totalTime = actData?.sports.reduce((sum, s) => sum + s.moving_time, 0) ?? 0;
  const totalElev = actData?.sports.reduce((sum, s) => sum + s.elevation_gain, 0) ?? 0;

  // Group sports by category for display
  const categories = ["Endurance", "Strength", "Adventure", "Other"];
  const byCat = categories.map((cat) => ({
    cat,
    sports: actData?.sports.filter(
      (s) => (SPORT_CONFIG[s.sport]?.category ?? "Other") === cat
    ) ?? [],
  })).filter((g) => g.sports.length > 0);

  const athlete = statsData?.athlete;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e8e8e8] font-mono">

      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {athlete?.profile_medium && (
            <img src={athlete.profile_medium} alt="" className="w-8 h-8 rounded-full opacity-80" />
          )}
          <div>
            <span className="text-[#fc4c02] font-bold tracking-widest text-xs uppercase">Strava</span>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              {athlete ? `${athlete.firstname} ${athlete.lastname}` : "Dashboard"}
            </h1>
          </div>
        </div>
        {session ? (
          <div className="flex items-center gap-4">
            {athlete && (
              <span className="text-white/30 text-xs hidden md:block">
                {athlete.city}, {athlete.country}
              </span>
            )}
            <button
              onClick={() => signOut()}
              className="border border-white/20 hover:border-white/40 text-white/40 text-xs px-3 py-1.5 rounded transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("strava")}
            className="bg-[#fc4c02] hover:bg-[#e04402] text-white text-sm font-bold px-4 py-2 rounded transition-colors"
          >
            Connect Strava
          </button>
        )}
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto">
        {!session && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-white/30 text-sm">Connect your Strava account to see your stats.</p>
            <button
              onClick={() => signIn("strava")}
              className="bg-[#fc4c02] hover:bg-[#e04402] text-white text-sm font-bold px-6 py-3 rounded transition-colors"
            >
              Connect Strava
            </button>
          </div>
        )}

        {session && loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative w-16 h-16">
              {/* Outer spinning ring */}
              <div className="absolute inset-0 rounded-full border-2 border-white/5" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#fc4c02] animate-spin" />
              {/* Inner pulsing dot */}
              <div className="absolute inset-[22px] rounded-full bg-[#fc4c02]/20 animate-pulse" />
            </div>
            <p className="text-white/20 text-xs tracking-widest uppercase">Fetching activities</p>
          </div>
        )}

        {actData && (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Total Activities" value={actData.total.toString()} sub="all sports" />
              <StatCard label="Total Distance" value={`${km(totalDist)} km`} />
              <StatCard label="Moving Time" value={`${hrs(totalTime)} hrs`} />
              <StatCard label="Total Elevation" value={`${Math.round(totalElev / 1000).toFixed(1)} km`} sub="gained" />
            </div>

            {/* Sport categories */}
            {byCat.map(({ cat, sports }) => (
              <div key={cat} className="mb-8">
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3 border-b border-white/5 pb-2">
                  {cat}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sports.map((s) => <SportCard key={s.sport} s={s} />)}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
