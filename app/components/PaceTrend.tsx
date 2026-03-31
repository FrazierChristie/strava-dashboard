"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useState } from "react";

interface Activity {
  start_date: string;
  sport_type: string;
  name: string;
  distance: number;
  moving_time: number;
}

interface Props {
  activities: Activity[];
}

const TREADMILL_KEYWORDS = ["treadmill", "mill", "indoor run"];
const isTreadmill = (a: Activity) =>
  TREADMILL_KEYWORDS.some((kw) => a.name?.toLowerCase().includes(kw));

// Riegel: t2 = t1 × (d2/d1)^1.06
function riegelPredict(knownTime: number, knownDist: number, targetDist: number): number {
  return knownTime * Math.pow(targetDist / knownDist, 1.06);
}

function getBestPredictedPace(runs: Activity[], targetMetres: number): number | null {
  const eligible = runs.filter(
    (r) => r.distance >= 1000 && r.distance <= targetMetres * 2 && r.moving_time > 0
  );
  if (!eligible.length) return null;
  let best: number | null = null;
  for (const run of eligible) {
    const predictedSecs = riegelPredict(run.moving_time, run.distance, targetMetres);
    const paceSecPerKm = predictedSecs / (targetMetres / 1000);
    if (best === null || paceSecPerKm < best) best = paceSecPerKm;
  }
  return best;
}

const PREDICTORS = [
  { label: "5K target",  metres: 5000,  color: "#4ade80" },
  { label: "10K target", metres: 10000, color: "#38bdf8" },
  { label: "HM target",  metres: 21097, color: "#a78bfa" },
];

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

function fmtPace(secsPerKm: number): string {
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PaceTrend({ activities }: Props) {
  const [showPredictors, setShowPredictors] = useState(true);

  const runs = activities
    .filter((a) => (a.sport_type === "Run" || a.sport_type === "TrailRun") && a.distance > 2000 && a.moving_time > 0 && !isTreadmill(a))
    .map((a) => {
      const secsPerKm = a.moving_time / (a.distance / 1000);
      const date = new Date(a.start_date);
      const mins = Math.floor(secsPerKm / 60);
      const secs = Math.round(secsPerKm % 60);
      return {
        x: date.getTime(),
        y: secsPerKm,
        distance: a.distance,
        paceLabel: `${mins}:${secs.toString().padStart(2, "0")} /km`,
        dateLabel: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        r: Math.min(8, Math.max(3, a.distance / 5000)),
      };
    })
    .sort((a, b) => a.x - b.x);

  if (!runs.length) return <p className="text-white/20 text-sm">No outdoor run data available.</p>;

  // Linear regression trend line
  const n = runs.length;
  const sumX  = runs.reduce((s, r) => s + r.x, 0);
  const sumY  = runs.reduce((s, r) => s + r.y, 0);
  const sumXY = runs.reduce((s, r) => s + r.x * r.y, 0);
  const sumX2 = runs.reduce((s, r) => s + r.x * r.x, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const trendStart = runs[0].x;
  const trendEnd   = runs[runs.length - 1].x;
  const trendData  = [
    { x: trendStart, y: slope * trendStart + intercept },
    { x: trendEnd,   y: slope * trendEnd   + intercept },
  ];

  // Riegel predicted paces for reference lines
  const predictors = PREDICTORS.map((p) => ({
    ...p,
    pace: getBestPredictedPace(activities.filter((a) => !isTreadmill(a)), p.metres),
  })).filter((p) => p.pace !== null);

  // Y-axis: negate so faster = higher
  const paces = runs.map((r) => r.y);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const padding = (maxPace - minPace) * 0.12;
  const yMin = -(maxPace + padding);
  const yMax = -(minPace - padding);

  const yFormatter = (val: number) => fmtPace(Math.abs(val));
  const xFormatter = (ts: number) =>
    new Date(ts).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

  const negatedRuns  = runs.map((r) => ({ ...r, y: -r.y }));
  const negatedTrend = trendData.map((r) => ({ ...r, y: -r.y }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-white/20">
          Outdoor runs only · dot size = distance · faster is higher
        </p>
        <button
          onClick={() => setShowPredictors((v) => !v)}
          className={`text-[10px] px-2 py-1 rounded transition-colors ${
            showPredictors ? "text-white/50 bg-white/5" : "text-white/20"
          }`}
        >
          {showPredictors ? "Hide" : "Show"} predictors
        </button>
      </div>

      {/* Predictor legend */}
      {showPredictors && predictors.length > 0 && (
        <div className="flex gap-4 mb-3 flex-wrap">
          {predictors.map((p) => (
            <div key={p.label} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-4 border-t border-dashed" style={{ borderColor: p.color }} />
              <span style={{ color: p.color }}>{p.label}</span>
              <span className="text-white/30">{fmtPace(p.pace!)} /km</span>
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={260}>
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

          {/* Predictor reference lines */}
          {showPredictors && predictors.map((p) => (
            <ReferenceLine
              key={p.label}
              y={-p.pace!}
              stroke={p.color}
              strokeDasharray="4 3"
              strokeWidth={1}
              strokeOpacity={0.6}
            />
          ))}

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
