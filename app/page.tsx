"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

const HeatmapCalendar  = dynamic(() => import("./components/HeatmapCalendar"),  { ssr: false });
const PMCChart         = dynamic(() => import("./components/PMCChart"),          { ssr: false });
const WeeklyVolumeChart = dynamic(() => import("./components/WeeklyVolumeChart"), { ssr: false });
const YearOverYear     = dynamic(() => import("./components/YearOverYear"),      { ssr: false });
const PersonalBests    = dynamic(() => import("./components/PersonalBests"),     { ssr: false });
const PaceTrend        = dynamic(() => import("./components/PaceTrend"),         { ssr: false });
const TrainingHeatmap  = dynamic(() => import("./components/TrainingHeatmap"),   { ssr: false });
const SportDonut       = dynamic(() => import("./components/SportDonut"),        { ssr: false });

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
}

interface Activity {
  id: number;
  start_date: string;
  sport_type: string;
  name: string;
  distance: number;
  moving_time: number;
  elevation_gain: number;
  average_speed: number;
  average_hr: number | null;
}

interface ActivitiesData {
  total: number;
  sports: SportTotals[];
  activities: Activity[];
}

// --- Period config ---
const PERIODS = [
  { label: "1W",   days: 7 },
  { label: "1M",   days: 30 },
  { label: "3M",   days: 90 },
  { label: "6M",   days: 180 },
  { label: "1Y",   days: 365 },
  { label: "All",  days: Infinity },
] as const;
type PeriodLabel = typeof PERIODS[number]["label"];

// --- Sport config ---
const SPORT_CONFIG: Record<string, { icon: string; label: string; category: string }> = {
  Run:                            { icon: "🏃", label: "Running",      category: "Endurance" },
  TrailRun:                       { icon: "🌲", label: "Trail Run",    category: "Endurance" },
  Ride:                           { icon: "🚴", label: "Cycling",      category: "Endurance" },
  Swim:                           { icon: "🏊", label: "Swimming",     category: "Endurance" },
  Rowing:                         { icon: "🚣", label: "Rowing",       category: "Endurance" },
  Workout:                        { icon: "💪", label: "Workout",      category: "Strength" },
  WeightTraining:                 { icon: "🏋️", label: "Weights",      category: "Strength" },
  HighIntensityIntervalTraining:  { icon: "⚡", label: "HIIT",        category: "Strength" },
  Hike:                           { icon: "⛰️", label: "Hiking",       category: "Adventure" },
  Walk:                           { icon: "🚶", label: "Walking",      category: "Adventure" },
  AlpineSki:                      { icon: "⛷️", label: "Skiing",       category: "Adventure" },
  Snowboard:                      { icon: "🏂", label: "Snowboarding", category: "Adventure" },
  StandUpPaddling:                { icon: "🏄", label: "SUP",         category: "Adventure" },
};

// --- Helpers ---
const km  = (m: number) => (m / 1000).toFixed(1);
const hrs = (s: number) => (s / 3600).toFixed(1);
const pace = (m: number, s: number) => {
  if (!m) return null;
  const spk = s / (m / 1000);
  return `${Math.floor(spk / 60)}:${Math.round(spk % 60).toString().padStart(2, "0")} /km`;
};

function filterByDays(activities: Activity[], days: number): Activity[] {
  if (days === Infinity) return activities;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return activities.filter((a) => new Date(a.start_date) >= cutoff);
}

function computeSportTotals(activities: Activity[]): SportTotals[] {
  const map: Record<string, SportTotals> = {};
  for (const act of activities) {
    if (!map[act.sport_type]) {
      map[act.sport_type] = { sport: act.sport_type, count: 0, distance: 0, moving_time: 0, elevation_gain: 0 };
    }
    map[act.sport_type].count++;
    map[act.sport_type].distance     += act.distance      ?? 0;
    map[act.sport_type].moving_time  += act.moving_time   ?? 0;
    map[act.sport_type].elevation_gain += act.elevation_gain ?? 0;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

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
        {s.distance > 0 && <p>{km(s.distance)} km</p>}
        <p>{hrs(s.moving_time)} hrs</p>
        {s.distance > 0 && s.elevation_gain > 0 && (
          <p>{Math.round(s.elevation_gain).toLocaleString()} m elev</p>
        )}
        {avgPace && <p className="text-white/25">{avgPace}</p>}
      </div>
    </div>
  );
}

function PeriodTabs({ active, onChange }: { active: PeriodLabel; onChange: (p: PeriodLabel) => void }) {
  return (
    <div className="flex gap-1 mb-6">
      {PERIODS.map(({ label }) => (
        <button
          key={label}
          onClick={() => onChange(label)}
          className={`px-3 py-1.5 text-xs rounded font-bold uppercase tracking-wider transition-colors ${
            active === label
              ? "bg-[#fc4c02] text-white"
              : "text-white/30 hover:text-white/60 hover:bg-white/5"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// --- Main ---
export default function Home() {
  const { data: session } = useSession();
  const [statsData, setStatsData]   = useState<StatsData | null>(null);
  const [actData, setActData]       = useState<ActivitiesData | null>(null);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [period, setPeriod]         = useState<PeriodLabel>("1Y");

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/strava/stats").then((r) => r.json()),
      fetch("/api/strava/activities").then((r) => r.json()),
    ]).then(([stats, acts]) => {
      setStatsData(stats);
      setActData(acts);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  // All activities = source of truth (never filtered - needed for PMC computation)
  const allActivities = actData?.activities ?? [];

  // Filtered activities for everything except PMC
  const days = PERIODS.find((p) => p.label === period)!.days;
  const filtered = useMemo(() => filterByDays(allActivities, days), [allActivities, days]);

  // Recompute sport totals from filtered set
  const sports     = useMemo(() => computeSportTotals(filtered), [filtered]);
  const totalDist  = filtered.reduce((s, a) => s + a.distance,      0);
  const totalTime  = filtered.reduce((s, a) => s + a.moving_time,   0);
  const totalElev  = filtered.reduce((s, a) => s + a.elevation_gain, 0);

  const categories = ["Endurance", "Strength", "Adventure", "Other"];
  const byCat = categories
    .map((cat) => ({
      cat,
      sports: sports.filter((s) => (SPORT_CONFIG[s.sport]?.category ?? "Other") === cat),
    }))
    .filter((g) => g.sports.length > 0);

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
              {athlete?.firstname ? `${athlete.firstname} ${athlete.lastname}` : "Dashboard"}
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
              onClick={async () => {
                setSyncing(true);
                await fetch("/api/strava/sync", { method: "POST" });
                await loadData();
                setSyncing(false);
              }}
              disabled={syncing}
              className="border border-[#fc4c02]/40 hover:border-[#fc4c02] text-[#fc4c02]/60 hover:text-[#fc4c02] text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-40"
            >
              {syncing ? "Syncing..." : "Sync"}
            </button>
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
              <div className="absolute inset-0 rounded-full border-2 border-white/5" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#fc4c02] animate-spin" />
              <div className="absolute inset-[22px] rounded-full bg-[#fc4c02]/20 animate-pulse" />
            </div>
            <p className="text-white/20 text-xs tracking-widest uppercase">Loading</p>
          </div>
        )}

        {actData && (
          <>
            <PeriodTabs active={period} onChange={setPeriod} />

            {/* Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Activities"     value={filtered.length.toString()} sub={period === "All" ? "all time" : `last ${period}`} />
              <StatCard label="Distance"       value={`${km(totalDist)} km`} />
              <StatCard label="Moving Time"    value={`${hrs(totalTime)} hrs`} />
              <StatCard label="Elevation"      value={`${Math.round(totalElev).toLocaleString()} m`} sub="gained" />
            </div>

            {/* Heatmap - always shows rolling 52 weeks regardless of period */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-4 overflow-x-auto">
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Activity Heatmap · Last 52 Weeks</h2>
              <HeatmapCalendar activities={allActivities} />
            </div>

            {/* PMC + Weekly Volume */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-1">Performance Management</h2>
                <p className="text-[10px] text-white/20 mb-4">CTL = fitness (42d) · ATL = fatigue (7d) · TSB = form</p>
                {/* PMC always uses full history for correct EWMA, but displays selected window */}
                <PMCChart activities={allActivities} daysToShow={days === Infinity ? undefined : days} />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Weekly Volume</h2>
                <WeeklyVolumeChart
                  activities={allActivities}
                  weeksToShow={days === Infinity ? 156 : Math.ceil(days / 7)}
                />
              </div>
            </div>

            {/* Personal Bests + Year-over-Year */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Personal Bests</h2>
                <PersonalBests activities={filtered} />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Year over Year</h2>
                <YearOverYear activities={allActivities} />
              </div>
            </div>

            {/* Pace Trend + Sport Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-1">Pace Trend</h2>
                <PaceTrend activities={allActivities} />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">Sport Distribution</h2>
                <SportDonut activities={filtered} />
              </div>
            </div>

            {/* Training timing heatmap */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-4">When Do You Train?</h2>
              <TrainingHeatmap activities={filtered} />
            </div>

            {/* Sport breakdown */}
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
