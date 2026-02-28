import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ActivityEvent } from "../../types";
import { formatEventTime } from "../../services/sceneService";

interface TimelineProps {
  activities?: ActivityEvent[];
  objectCountHistory?: { time: string; count: number }[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-600 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-glass">
      <p className="text-white/50 font-mono mb-0.5">{label}</p>
      <p className="text-brand font-bold">{payload[0].value} objects</p>
    </div>
  );
};

const Timeline: React.FC<TimelineProps> = ({
  activities = [],
  objectCountHistory = [],
}) => {
  // Build chart data from activities if no objectCountHistory provided
  const chartData =
    objectCountHistory.length > 0
      ? objectCountHistory
      : activities
          .filter(
            (a) =>
              a.type === "object_appeared" || a.type === "object_disappeared",
          )
          .slice(0, 20)
          .reverse()
          .map((a, i) => ({
            time: formatEventTime(a.timestamp),
            count: i + 1,
          }));

  return (
    <div className="flex flex-col gap-4">
      {/* Chart */}
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-white/8 bg-dark-700/80 p-4">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
            Object Count Over Time
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="time"
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6C63FF"
                strokeWidth={2}
                fill="url(#areaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent activity timeline */}
      <div className="rounded-2xl border border-white/8 bg-dark-700/80 p-4">
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">
          Recent Events
        </p>
        {activities.length === 0 ? (
          <p className="text-white/20 text-xs text-center py-4">
            No events recorded yet
          </p>
        ) : (
          <div className="flex flex-col gap-0">
            {activities.slice(0, 8).map((event, i) => (
              <div key={event.id} className="flex items-start gap-3 relative">
                {/* Line */}
                {i < Math.min(activities.length, 8) - 1 && (
                  <div className="absolute left-[7px] top-5 bottom-0 w-px bg-white/8" />
                )}
                {/* Dot */}
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand bg-dark-800 flex-shrink-0 mt-1 z-10" />
                <div className="pb-4 min-w-0">
                  <p className="text-xs text-white/65 leading-snug">
                    {event.description}
                  </p>
                  <p className="text-xs text-white/25 font-mono mt-0.5">
                    {formatEventTime(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
