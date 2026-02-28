import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  MessageSquare,
  Activity,
  Clock,
  Cpu,
  Zap,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import StatsCard from "./StatsCard";
import Timeline from "./Timeline";
import { StatsData, ActivityEvent } from "../../types";

interface DashboardProps {
  stats: StatsData;
  activities?: ActivityEvent[];
  labelCounts?: Record<string, number>;
  fpsHistory?: number[];
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const OBJECT_COLOURS = [
  "#6e56cf",
  "#32d9c8",
  "#30d158",
  "#ff9f0a",
  "#ff453a",
  "#bf5af2",
  "#0a84ff",
  "#ffd60a",
];

const Dashboard: React.FC<DashboardProps> = ({
  stats,
  activities = [],
  labelCounts = {},
  fpsHistory = [],
}) => {
  // ── Build detection timeline data ─────────────────────────────────────────
  // Use ALL activity events (not just object_appeared) so the chart fills up
  // even when the same objects persist across frames.
  // Bucket size: 5 seconds.
  const chartData = useMemo(() => {
    // Include appeared, disappeared, scene changes, narrations — anything meaningful
    const events = activities.filter(
      (a) =>
        a.type === "object_appeared" ||
        a.type === "object_disappeared" ||
        a.type === "scene_changed" ||
        a.type === "new_narration",
    );
    if (events.length === 0) return [];

    const earliest = Math.min(...events.map((a) => a.timestamp));
    const latest = Math.max(...events.map((a) => a.timestamp));
    const BUCKET_MS = 5_000;
    // Always generate at least 2 buckets so recharts draws a line
    const numBuckets = Math.max(
      2,
      Math.ceil((latest - earliest) / BUCKET_MS) + 1,
    );

    const buckets: number[] = Array(numBuckets).fill(0);
    events.forEach((a) => {
      const idx = Math.min(
        numBuckets - 1,
        Math.floor((a.timestamp - earliest) / BUCKET_MS),
      );
      buckets[idx] += 1;
    });

    return buckets.map((count, idx) => ({
      time: `+${idx * 5}s`,
      activity: count,
    }));
  }, [activities]);

  const hasChartData = chartData.length > 0;

  // ── Top-5 object classes ──────────────────────────────────────────────────
  const topObjects = useMemo(() => {
    return Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count], i) => ({
        label,
        count,
        fill: OBJECT_COLOURS[i % OBJECT_COLOURS.length],
      }));
  }, [labelCounts]);

  // ── FPS sparkline ─────────────────────────────────────────────────────────
  const fpsData = useMemo(
    () => fpsHistory.slice(-20).map((fps, i) => ({ i, fps })),
    [fpsHistory],
  );

  const cards = [
    {
      title: "Total Detections",
      value: stats.totalDetections,
      icon: <Eye size={15} />,
      color: "brand" as const,
      description: "Objects detected this session",
    },
    {
      title: "Unique Objects",
      value: stats.uniqueObjects,
      icon: <Cpu size={15} />,
      color: "cyan" as const,
      description: "Distinct object classes seen",
    },
    {
      title: "Narrations",
      value: stats.narrationCount,
      icon: <MessageSquare size={15} />,
      color: "green" as const,
      description: "Scene narrations generated",
    },
    {
      title: "Session Time",
      value: formatDuration(stats.sessionDuration),
      icon: <Clock size={15} />,
      color: "orange" as const,
      description: "Active monitoring duration",
    },
    {
      title: "Activity Events",
      value: stats.activityCount,
      icon: <Activity size={15} />,
      color: "red" as const,
      description: "Scene change events logged",
    },
    {
      title: "Analysis FPS",
      value: `${stats.fps}/s`,
      icon: <Zap size={15} />,
      color: "brand" as const,
      description: "Frames analyzed per second",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <StatsCard key={card.title} {...card} index={i} />
        ))}
      </div>

      {/* Detection activity chart */}
      <div className="rounded-xl border border-white/8 bg-dark-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-brand" />
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Detection Activity
          </span>
        </div>
        {hasChartData ? (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient id="detGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6e56cf" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6e56cf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="time"
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(18,18,28,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fff",
                }}
                itemStyle={{ color: "#6e56cf" }}
                cursor={{ stroke: "rgba(110,86,207,0.3)" }}
              />
              <Area
                type="monotone"
                dataKey="activity"
                stroke="#6e56cf"
                strokeWidth={2}
                fill="url(#detGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#6e56cf" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-white/25 text-xs font-mono">
            Start a session to see activity chart
          </div>
        )}
      </div>

      {/* FPS sparkline */}
      <div className="rounded-xl border border-white/8 bg-dark-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-neon-cyan" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              FPS Sparkline
            </span>
          </div>
          <span className="font-mono text-xs text-neon-cyan">
            {stats.fps}/s
          </span>
        </div>
        {fpsData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={72}>
            <AreaChart
              data={fpsData}
              margin={{ top: 4, right: 4, left: -36, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fpsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#32d9c8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#32d9c8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis
                allowDecimals={false}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(18,18,28,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#fff",
                }}
                itemStyle={{ color: "#32d9c8" }}
                formatter={(v: number) => [`${v} fps`, "FPS"]}
                labelFormatter={() => ""}
              />
              <Area
                type="monotone"
                dataKey="fps"
                stroke="#32d9c8"
                strokeWidth={1.5}
                fill="url(#fpsGrad)"
                dot={false}
                activeDot={{ r: 3, fill: "#32d9c8" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[72px] flex items-center justify-center text-white/25 text-xs font-mono">
            Waiting for frames…
          </div>
        )}
      </div>

      {/* Top object classes */}
      {topObjects.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-dark-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-neon-orange" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Top Detected Classes
            </span>
          </div>
          <ResponsiveContainer width="100%" height={topObjects.length * 28 + 8}>
            <BarChart
              layout="vertical"
              data={topObjects}
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={72}
                tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(18,18,28,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#fff",
                }}
                formatter={(v: number) => [`${v} detections`, ""]}
                labelFormatter={() => ""}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topObjects.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Timeline */}
      <Timeline activities={activities} />
    </motion.div>
  );
};

export default Dashboard;
