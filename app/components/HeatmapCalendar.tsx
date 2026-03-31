"use client";

// GitHub-style activity heatmap - 52 weeks of daily activity volume.
// No charting library needed - just a CSS grid of coloured divs.

interface Activity {
  start_date: string;
  moving_time: number;
  sport_type: string;
}

interface Props {
  activities: Activity[];
}

function getIntensityClass(minutes: number): string {
  if (minutes === 0) return "bg-white/5";
  if (minutes < 30)  return "bg-[#fc4c02]/20";
  if (minutes < 60)  return "bg-[#fc4c02]/40";
  if (minutes < 120) return "bg-[#fc4c02]/65";
  return "bg-[#fc4c02]";
}

const DAYS = ["Mon", "Wed", "Fri"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HeatmapCalendar({ activities }: Props) {
  // Build a map of date string → total minutes
  const minutesByDay: Record<string, number> = {};
  for (const act of activities) {
    const date = act.start_date.slice(0, 10); // "2024-03-15"
    minutesByDay[date] = (minutesByDay[date] ?? 0) + Math.round(act.moving_time / 60);
  }

  // Build 53 weeks of days, ending today
  const today = new Date();
  const weeks: Date[][] = [];
  // Rewind to start of the week (Monday) 52 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // align to Monday

  let current = new Date(start);
  while (current <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels - find first week of each month
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, i) => {
    const firstDay = week[0];
    if (firstDay.getDate() <= 7) {
      monthLabels.push({ label: MONTHS[firstDay.getMonth()], col: i });
    }
  });

  return (
    <div>
      <div className="flex gap-1 items-start">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mt-5 mr-1">
          {["M","","W","","F","","S"].map((d, i) => (
            <div key={i} className="h-[11px] text-[9px] text-white/20 leading-none">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div>
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1">
            {weeks.map((_, i) => {
              const label = monthLabels.find((m) => m.col === i);
              return (
                <div key={i} className="w-[11px] text-[9px] text-white/30 leading-none">
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          {/* Cells */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => {
                  const dateStr = day.toISOString().slice(0, 10);
                  const mins = minutesByDay[dateStr] ?? 0;
                  const isFuture = day > today;
                  return (
                    <div
                      key={di}
                      title={mins > 0 ? `${dateStr}: ${mins} min` : dateStr}
                      className={`w-[11px] h-[11px] rounded-[2px] transition-opacity ${
                        isFuture ? "opacity-0" : getIntensityClass(mins)
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-white/20">Less</span>
        {[0, 15, 45, 90, 150].map((m) => (
          <div key={m} className={`w-[11px] h-[11px] rounded-[2px] ${getIntensityClass(m)}`} />
        ))}
        <span className="text-[10px] text-white/20">More</span>
      </div>
    </div>
  );
}
