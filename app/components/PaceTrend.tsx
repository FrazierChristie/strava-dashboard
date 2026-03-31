"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface Activity {
  start_date: string;
  sport_type: string;
  distance: number;
  moving_time: number;
}

interface Props {
  activities: Activity[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded p-3 text-xs font-mono">
      <p className="text-white/40 mb-1">{d.dateLabel}</p>
      <p className="text-[#fc4c02] font-bold">{d.paceLabel}</p>
      <p className="text-white/40">{(d.distance / 1000).toFixed(1)} km</p>
    </div>
  );
};

export default function PaceTrend({ activities }: Props) {
  const runs = activities
    .filter((a) => (a.sport_type === "Run" || a.sport_type === "TrailRun") && a.distance > 2000 && a.moving_time > 0)
    .map((a) => {
      const secsPerKm = a.moving_time / (a.distance / 1000);
      const date = new Date(a.start_date);
      const mins = Math.floor(secsPerKm / 60);
      const secs = Math.round(secsPerKm % 60);
      return {
        x: date.getTime(),                    // timestamp for x-axis
        y: secsPerKm,                         // pace in secs/km for y-axis
        distance: a.distance,
        paceLabel: `${mins}:${secs.toString().padStart(2, "0")} /km`,
        dateLabel: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        r: Math.min(8, Math.max(3, a.distance / 5000)), // dot size = distance
      };
    })
    .sort((a, b) => a.x - b.x);

  if (!runs.length) return <p className="text-white/20 text-sm">No run data available.</p>;

  // Simple linear regression to draw trend line
  const n = runs.length;
  const sumX = runs.reduce((s, r) => s + r.x, 0);
  const sumY = runs.reduce((s, r) => s + r.y, 0);
  const sumXY = runs.reduce((s, r) => s + r.x * r.y, 0);
  const sumX2 = runs.reduce((s, r) => s + r.x * r.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const trendStart = runs[0].x;
  const trendEnd = runs[runs.length - 1].x;
  const trendData = [
    { x: trendStart, y: slope * trendStart + intercept },
    { x: trendEnd,   y: slope * trendEnd   + intercept },
  ];

  // Y-axis: pace in min:sec — invert so faster (lower secs) is higher on chart
  const paces = runs.map((r) => r.y);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const padding = (maxPace - minPace) * 0.1;
  // Recharts doesn't invert naturally, so we negate and format the tick
  const yMin = -(maxPace + padding);
  const yMax = -(minPace - padding);

  const yFormatter = (val: number) => {
    const secs = Math.abs(val);
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const xFormatter = (ts: number) =>
    new Date(ts).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

  // Negate Y so faster = visually higher
  const negatedRuns = runs.map((r) => ({ ...r, y: -r.y }));
  const negatedTrend = trendData.map((r) => ({ ...r, y: -r.y }));

  return (
    <div>
      <p className="text-[10px] text-white/20 mb-4">
        Each dot = one run · size = distance · line = trend · faster is higher
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="x"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={xFormatter}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            scale="time"
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={[yMin, yMax]}
            tickFormatter={yFormatter}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Trend line */}
          <Scatter
            data={negatedTrend}
            line={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1.5, strokeDasharray: "4 3" }}
            shape={() => null as any}
            legendType="none"
          />
          {/* Run dots */}
          <Scatter
            data={negatedRuns}
            fill="#fc4c02"
            fillOpacity={0.6}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              return <circle cx={cx} cy={cy} r={payload.r} fill="#fc4c02" fillOpacity={0.5} />;
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
