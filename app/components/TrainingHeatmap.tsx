"use client";

// When do you train? A grid of hour × day-of-week coloured by activity count.

interface Activity {
  start_date: string;
  moving_time: number;
}

interface Props {
  activities: Activity[];
}

const DAYS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS  = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number) {
  if (h === 0)  return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export default function TrainingHeatmap({ activities }: Props) {
  // Build count grid: day[0-6] × hour[0-23]
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const act of activities) {
    const d = new Date(act.start_date);
    const dow = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
    const hour = d.getHours();
    grid[dow][hour]++;
  }

  const maxVal = Math.max(...grid.flat(), 1);

  function cellColor(count: number): string {
    if (!count) return "rgba(255,255,255,0.04)";
    const intensity = count / maxVal;
    // Interpolate from dim orange to full Strava orange
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(252, 76, 2, ${alpha.toFixed(2)})`;
  }

  // Only show some hour labels to avoid crowding
  const showHour = (h: number) => h % 3 === 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Hour labels */}
        <div className="flex ml-10 mb-1">
          {HOURS.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-white/20">
              {showHour(h) ? hourLabel(h) : ""}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DAYS.map((day, di) => (
          <div key={day} className="flex items-center gap-0 mb-[3px]">
            <div className="w-10 text-[10px] text-white/30 shrink-0">{day}</div>
            {HOURS.map((h) => {
              const count = grid[di][h];
              return (
                <div
                  key={h}
                  title={count ? `${day} ${hourLabel(h)}: ${count} activities` : undefined}
                  className="flex-1 h-5 rounded-[2px] mx-[1px] transition-opacity hover:opacity-80 cursor-default"
                  style={{ backgroundColor: cellColor(count) }}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px] text-white/20">Less</span>
          {[0, 0.2, 0.4, 0.7, 1.0].map((i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-[2px]"
              style={{ backgroundColor: i === 0 ? "rgba(255,255,255,0.04)" : `rgba(252,76,2,${0.15 + i * 0.85})` }}
            />
          ))}
          <span className="text-[10px] text-white/20">More</span>
        </div>
      </div>
    </div>
  );
}
