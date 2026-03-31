"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

interface Activity {
  sport_type: string;
  moving_time: number;
  distance: number;
}

interface Props {
  activities: Activity[];
}

const SPORT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  Run:            { icon: "🏃", label: "Running",      color: "#fc4c02" },
  TrailRun:       { icon: "🌲", label: "Trail Run",    color: "#fb923c" },
  Ride:           { icon: "🚴", label: "Cycling",      color: "#38bdf8" },
  Rowing:         { icon: "🚣", label: "Rowing",       color: "#a78bfa" },
  Swim:           { icon: "🏊", label: "Swimming",     color: "#34d399" },
  Workout:        { icon: "💪", label: "Workout",      color: "#f472b6" },
  WeightTraining: { icon: "🏋️", label: "Weights",      color: "#e879f9" },
  Hike:           { icon: "⛰️", label: "Hiking",       color: "#4ade80" },
  Walk:           { icon: "🚶", label: "Walking",      color: "#86efac" },
  AlpineSki:      { icon: "⛷️", label: "Skiing",       color: "#93c5fd" },
  Snowboard:      { icon: "🏂", label: "Snowboarding", color: "#6ee7f7" },
  HighIntensityIntervalTraining: { icon: "⚡", label: "HIIT", color: "#fbbf24" },
  StandUpPaddling: { icon: "🏄", label: "SUP",         color: "#2dd4bf" },
};

const FALLBACK_COLORS = ["#94a3b8", "#64748b", "#475569"];

type Metric = "time" | "distance" | "count";

export default function SportDonut({ activities }: Props) {
  const [metric, setMetric] = useState<Metric>("time");

  // Aggregate by sport
  const map: Record<string, { time: number; distance: number; count: number }> = {};
  for (const act of activities) {
    if (!map[act.sport_type]) map[act.sport_type] = { time: 0, distance: 0, count: 0 };
    map[act.sport_type].time     += act.moving_time;
    map[act.sport_type].distance += act.distance;
    map[act.sport_type].count++;
  }

  const data = Object.entries(map)
    .map(([sport, vals], i) => {
      const cfg = SPORT_CONFIG[sport];
      return {
        sport,
        label: cfg?.label ?? sport,
        icon:  cfg?.icon  ?? "🏅",
        color: cfg?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        value: vals[metric],
        time: vals.time,
        distance: vals.distance,
        count: vals.count,
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  const formatValue = (val: number, m: Metric) => {
    if (m === "time")     return `${(val / 3600).toFixed(0)}h`;
    if (m === "distance") return `${(val / 1000).toFixed(0)}km`;
    return `${val}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const pct = ((d.value / total) * 100).toFixed(1);
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded p-3 text-xs font-mono">
        <p style={{ color: d.color }} className="font-bold mb-1">{d.icon} {d.label}</p>
        <p className="text-white/60">{formatValue(d.value, metric)} · {pct}%</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-center">
      {/* Donut */}
      <div className="shrink-0">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              strokeWidth={0}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.sport} fill={entry.color} opacity={0.85} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + metric toggle */}
      <div className="flex-1 min-w-0">
        {/* Toggle */}
        <div className="flex gap-1 mb-4">
          {(["time", "distance", "count"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2 py-1 text-[10px] rounded uppercase tracking-wider font-bold transition-colors ${
                metric === m ? "bg-[#fc4c02] text-white" : "text-white/30 hover:text-white/60"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Sport list */}
        <div className="space-y-2">
          {data.slice(0, 8).map((d) => {
            const pct = (d.value / total) * 100;
            return (
              <div key={d.sport} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-white/50 text-xs w-24 truncate">{d.icon} {d.label}</span>
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: d.color, opacity: 0.7 }}
                  />
                </div>
                <span className="text-white/40 text-xs w-12 text-right tabular-nums">
                  {pct.toFixed(0)}%
                </span>
                <span className="text-white/25 text-xs w-12 text-right tabular-nums">
                  {formatValue(d.value, metric)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
