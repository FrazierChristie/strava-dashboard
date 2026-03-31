"use client";

// Weekly volume bar chart - distance per week for the last 52 weeks,
// stacked by sport type so you can see training mix at a glance.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Activity {
  start_date: string;
  distance: number;
  moving_time: number;
  sport_type: string;
}

interface Props {
  activities: Activity[];
  weeksToShow?: number;
  metric?: "distance" | "time"; // what to stack
}

// Sports to show as separate bars (the rest go into "Other")
const TRACKED_SPORTS = ["Run", "Ride", "Rowing", "TrailRun", "Swim"];
const SPORT_COLORS: Record<string, string> = {
  Run:      "#fc4c02",
  Ride:     "#38bdf8",
  Rowing:   "#a78bfa",
  TrailRun: "#fb923c",
  Swim:     "#34d399",
  Other:    "rgba(255,255,255,0.15)",
};

function getWeekKey(date: Date): string {
  // ISO week start = Monday
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export default function WeeklyVolumeChart({
  activities,
  weeksToShow = 52,
  metric = "distance",
}: Props) {
  // Build week buckets
  const weekMap: Record<string, Record<string, number>> = {};

  for (const act of activities) {
    const weekKey = getWeekKey(new Date(act.start_date));
    if (!weekMap[weekKey]) weekMap[weekKey] = {};

    const sport = TRACKED_SPORTS.includes(act.sport_type) ? act.sport_type : "Other";
    const value =
      metric === "distance"
        ? (act.distance ?? 0) / 1000   // metres → km
        : (act.moving_time ?? 0) / 3600; // seconds → hours

    weekMap[weekKey][sport] = (weekMap[weekKey][sport] ?? 0) + value;
  }

  // Generate last N weeks as sorted array
  const today = new Date();
  const weeks = [];
  for (let i = weeksToShow - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const key = getWeekKey(d);
    const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    weeks.push({ week: key, label, ...(weekMap[key] ?? {}) });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded p-3 text-xs font-mono">
        <p className="text-white/40 mb-2">{label}</p>
        {payload.filter((p: any) => p.value > 0).reverse().map((p: any) => (
          <p key={p.name} style={{ color: p.fill }}>
            {p.name}: {p.value.toFixed(1)}{metric === "distance" ? " km" : " hrs"}
          </p>
        ))}
        <p className="text-white/60 mt-1 border-t border-white/10 pt-1">
          Total: {total.toFixed(1)}{metric === "distance" ? " km" : " hrs"}
        </p>
      </div>
    );
  };

  const tickFormatter = (val: string, i: number) => {
    if (i % 4 !== 0) return "";
    const entry = weeks.find(w => w.week === val);
    return entry?.label ?? "";
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={weeks} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={6}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={tickFormatter}
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          unit={metric === "distance" ? "km" : "h"}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
        {[...TRACKED_SPORTS, "Other"].map((sport) => (
          <Bar
            key={sport}
            dataKey={sport}
            stackId="a"
            fill={SPORT_COLORS[sport]}
            radius={sport === "Other" ? [2, 2, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
