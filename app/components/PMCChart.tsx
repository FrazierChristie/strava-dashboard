"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useState } from "react";

interface Activity {
  start_date: string;
  moving_time: number;
}

interface Props {
  activities: Activity[];
  daysToShow?: number;
}

const METRICS = [
  {
    key: "CTL",
    name: "CTL",
    label: "Fitness",
    color: "#38bdf8",
    dash: undefined,
    description: "Chronic Training Load",
    formula: "42-day exponential moving average of daily training hours.",
    interpretation: "Your long-term fitness base. Rises slowly with consistent training, falls slowly during rest.",
  },
  {
    key: "ATL",
    name: "ATL",
    label: "Fatigue",
    color: "#fc4c02",
    dash: undefined,
    description: "Acute Training Load",
    formula: "7-day exponential moving average of daily training hours.",
    interpretation: "Your short-term fatigue. Rises quickly after hard days, drops fast when you rest.",
  },
  {
    key: "TSB",
    name: "TSB",
    label: "Form",
    color: "#4ade80",
    dash: "4 2",
    description: "Training Stress Balance",
    formula: "TSB = CTL − ATL",
    interpretation: "Positive = fresh & ready to race. Slightly negative = in training. Very negative = risk of overtraining.",
  },
] as const;

function computePMC(activities: Activity[]) {
  if (!activities.length) return [];

  const effortByDay: Record<string, number> = {};
  for (const act of activities) {
    const date = act.start_date.slice(0, 10);
    effortByDay[date] = (effortByDay[date] ?? 0) + act.moving_time / 3600;
  }

  const dates = Object.keys(effortByDay).sort();
  const start = new Date(dates[0]);
  const end = new Date();

  const alphaCtl = 2 / (42 + 1);
  const alphaAtl = 2 / (7 + 1);

  let ctl = 0, atl = 0;
  const result = [];
  const current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const effort = effortByDay[dateStr] ?? 0;
    ctl = ctl + alphaCtl * (effort - ctl);
    atl = atl + alphaAtl * (effort - atl);
    result.push({
      date: dateStr,
      CTL: parseFloat(ctl.toFixed(2)),
      ATL: parseFloat(atl.toFixed(2)),
      TSB: parseFloat((ctl - atl).toFixed(2)),
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded p-3 text-xs font-mono">
      <p className="text-white/40 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.stroke }}>
          {p.name}: {p.value > 0 ? "+" : ""}{p.value}
        </p>
      ))}
    </div>
  );
};

// Info tooltip shown on hover over legend items
function MetricInfo({ metric }: { metric: typeof METRICS[number] }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        className="ml-1 text-white/20 hover:text-white/60 cursor-help transition-colors"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        ⓘ
      </span>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#1a1a1a] border border-white/10 rounded p-3 text-xs z-50 pointer-events-none">
          <p className="font-bold mb-1" style={{ color: metric.color }}>{metric.description}</p>
          <p className="text-white/50 mb-1"><span className="text-white/30">Formula: </span>{metric.formula}</p>
          <p className="text-white/50">{metric.interpretation}</p>
        </div>
      )}
    </span>
  );
}

export default function PMCChart({ activities, daysToShow }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const allData = computePMC(activities);
  const data = daysToShow ? allData.slice(-daysToShow) : allData;

  const visibleKeys = METRICS.filter((m) => !hidden.has(m.key)).map((m) => m.key);
  const allValues = data.flatMap((d) =>
    visibleKeys.map((k) => d[k as keyof typeof d] as number)
  ).filter((v) => v !== undefined);

  const minVal = allValues.length ? parseFloat((Math.min(...allValues) * 1.05).toFixed(2)) : 0;
  const maxVal = allValues.length ? parseFloat((Math.max(...allValues) * 1.05).toFixed(2)) : 1;

  const tickInterval = Math.max(1, Math.ceil(data.length / 8));
  const tickFormatter = (_: string, index: number) => {
    if (index % tickInterval !== 0) return "";
    const d = data[index];
    if (!d) return "";
    return new Date(d.date).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  };

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div>
      {/* Custom legend with tooltips and click-to-toggle */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {METRICS.map((m) => {
          const isHidden = hidden.has(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggle(m.key)}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${isHidden ? "opacity-25" : "opacity-100"}`}
            >
              <span
                className="inline-block w-6 h-0.5 rounded"
                style={{ backgroundColor: m.color, opacity: isHidden ? 0.3 : 1 }}
              />
              <span style={{ color: m.color }}>{m.key}</span>
              <span className="text-white/30">{m.label}</span>
              <MetricInfo metric={m} />
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          {METRICS.map((m) => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stroke={hidden.has(m.key) ? "transparent" : m.color}
              dot={false}
              strokeWidth={m.key === "TSB" ? 1.5 : 2}
              strokeDasharray={m.dash}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
