import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  ScanLine,
  ArrowRight,
  Eye,
  Bell,
  Target,
  TrendingUp,
  Database,
  Cpu,
  Zap,
  Shield,
  Monitor,
  Activity,
  Camera,
  GitBranch,
  Server,
  Package,
  Layers,
} from "lucide-react";
import Button from "../components/common/Button";

// ── Typing effect hook ────────────────────────────────────────────────────────
function useTypingEffect(lines: string[], speed = 38, pause = 1800) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const target = lines[lineIdx];
    if (!deleting && charIdx < target.length) {
      const t = setTimeout(() => {
        setDisplayed(target.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === target.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => {
        setDisplayed(target.slice(0, charIdx - 1));
        setCharIdx((c) => c - 1);
      }, speed / 2);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setLineIdx((i) => (i + 1) % lines.length);
    }
  }, [charIdx, deleting, lineIdx, lines, speed, pause]);

  return displayed;
}

// ── Tech stack badges ─────────────────────────────────────────────────────────
const TECH_STACK = [
  {
    label: "YOLOv8s",
    color: "text-brand        bg-brand/10       border-brand/25",
  },
  {
    label: "Gemini 2.0 Flash",
    color: "text-neon-cyan  bg-neon-cyan/10   border-neon-cyan/25",
  },
  {
    label: "FastAPI",
    color: "text-neon-green   bg-neon-green/10  border-neon-green/25",
  },
  {
    label: "React 18",
    color: "text-neon-orange  bg-neon-orange/10 border-neon-orange/25",
  },
  {
    label: "WebSocket",
    color: "text-neon-purple  bg-neon-purple/10 border-neon-purple/25",
  },
  {
    label: "framer-motion",
    color: "text-neon-red     bg-neon-red/10    border-neon-red/25",
  },
];

// ── Demo presets showcase ─────────────────────────────────────────────────────
const DEMO_MODES = [
  {
    icon: Shield,
    label: "Security Mode",
    desc: "Detect intruders & items",
    color: "text-neon-red",
  },
  {
    icon: Monitor,
    label: "Workspace Mode",
    desc: "Track desk & equipment",
    color: "text-neon-cyan",
  },
  {
    icon: Activity,
    label: "Activity Mode",
    desc: "Monitor movement & actions",
    color: "text-neon-green",
  },
];

const features = [
  {
    icon: Eye,
    color: "text-brand bg-brand/10 border-brand/20",
    title: "Real-Time Detection",
    description:
      "YOLOv8s detects 80 object classes at 500ms intervals — persons, vehicles, animals, everyday objects, and more.",
  },
  {
    icon: Brain,
    color: "text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20",
    title: "Gemini Scene Narration",
    description:
      "Gemini 2.0 Flash interprets what it sees every few frames, generating contextual scene descriptions in real time.",
  },
  {
    icon: Target,
    color: "text-neon-green bg-neon-green/10 border-neon-green/20",
    title: "Agent Goals",
    description:
      "Set natural-language goals like \u201Calert me if a person and laptop are present.\u201D The AI monitors them continuously.",
  },
  {
    icon: Bell,
    color: "text-neon-orange bg-neon-orange/10 border-neon-orange/20",
    title: "Smart Alerts",
    description:
      "Get instant audio + visual alerts when a goal triggers, with a 5-second cooldown to prevent spam.",
  },
  {
    icon: Database,
    color: "text-neon-purple bg-neon-purple/10 border-neon-purple/20",
    title: "Session Persistence",
    description:
      "Every monitoring session is saved to local history — narrations, activity events, and detected objects.",
  },
  {
    icon: TrendingUp,
    color: "text-neon-red bg-neon-red/10 border-neon-red/20",
    title: "Analytics Timeline",
    description:
      "Live area chart tracking detection activity over time. Replay sessions from the History page.",
  },
];

const demoSteps = [
  {
    label: "Empty frame",
    narration: "The scene is empty. Waiting for activity...",
  },
  { label: "Walk in", narration: "A person has entered the scene." },
  { label: "Place phone", narration: "A phone has appeared near the person." },
  { label: "Leave frame", narration: "The scene is now empty." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const Home: React.FC = () => {
  const typedNarration = useTypingEffect([
    "A person has entered the scene.",
    "A laptop and cell phone are visible on the desk.",
    "The scene is empty. Waiting for activity...",
    "Alert: person and backpack detected!",
  ]);

  // ── Live backend stats ──────────────────────────────────────────────────
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [totalSessions, setTotalSessions] = useState<number | null>(null);
  const [storedSessions, setStoredSessions] = useState<number>(0);

  useEffect(() => {
    // Count locally-saved sessions as a fallback metric
    try {
      const raw = localStorage.getItem("livescene_sessions");
      const arr = raw ? JSON.parse(raw) : [];
      setStoredSessions(Array.isArray(arr) ? arr.length : 0);
    } catch {
      /* ignore */
    }

    // Probe backend
    const base = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
    fetch(`${base}/api/status`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((d) => {
        setBackendOnline(true);
        setTotalSessions(d.sessions_saved ?? null);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-28 px-4">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-brand/5 blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/25 text-brand text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Real-Time AI Scene Understanding
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-6xl md:text-8xl font-bold text-white leading-[0.95] mb-6 tracking-tight"
          >
            Live<span className="text-brand">Scene</span>{" "}
            <span className="bg-gradient-to-r from-brand via-neon-cyan to-neon-purple bg-clip-text text-transparent">
              AI
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto mb-4 leading-relaxed font-light"
          >
            An AI agent that{" "}
            <span className="text-white/80 font-medium">watches</span>,{" "}
            <span className="text-white/80 font-medium">remembers</span>, and{" "}
            <span className="text-white/80 font-medium">understands</span> your
            world in real time.
          </motion.p>

          {/* Tech stack badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {TECH_STACK.map((t, i) => (
              <motion.span
                key={t.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className={`px-3 py-1 rounded-full border text-xs font-mono font-medium ${t.color}`}
              >
                {t.label}
              </motion.span>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-16"
          >
            <Link to="/analyze">
              <Button
                size="lg"
                variant="primary"
                icon={<ScanLine size={18} />}
                iconRight={<ArrowRight size={16} />}
              >
                Start Analyzing
              </Button>
            </Link>
            <Link to="/history">
              <Button size="lg" variant="ghost" icon={<Database size={18} />}>
                Session History
              </Button>
            </Link>
          </motion.div>

          {/* ── Live stats ticker ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex items-center justify-center gap-3 flex-wrap mt-6 mb-2"
          >
            {/* Backend status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                backendOnline === null
                  ? "border-white/10 text-white/30 bg-white/5"
                  : backendOnline
                    ? "border-neon-green/30 text-neon-green/80 bg-neon-green/8"
                    : "border-red-500/30 text-red-400/80 bg-red-500/8"
              }`}
            >
              <Server size={11} />
              {backendOnline === null
                ? "Checking backend…"
                : backendOnline
                  ? "Backend online"
                  : "Backend offline"}
            </div>

            {/* Sessions on backend */}
            {backendOnline && totalSessions !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand/25 text-brand/70 bg-brand/8 text-xs font-medium">
                <Layers size={11} />
                {totalSessions} server session{totalSessions !== 1 ? "s" : ""}
              </div>
            )}

            {/* Local saved sessions */}
            {storedSessions > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-white/40 bg-white/5 text-xs font-medium">
                <Package size={11} />
                {storedSessions} local session{storedSessions !== 1 ? "s" : ""}{" "}
                saved
              </div>
            )}
          </motion.div>

          {/* Live typing terminal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="max-w-2xl mx-auto"
          >
            <div className="rounded-2xl border border-white/8 bg-dark-700/70 backdrop-blur-sm overflow-hidden shadow-[0_0_60px_rgba(110,86,207,0.12)]">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-dark-600/50">
                <div className="w-3 h-3 rounded-full bg-neon-red/60" />
                <div className="w-3 h-3 rounded-full bg-neon-orange/60" />
                <div className="w-3 h-3 rounded-full bg-neon-green/60" />
                <span className="ml-2 text-xs text-white/25 font-mono">
                  livescene-ai // narration.stream
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[10px] text-neon-green/70 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                  LIVE
                </span>
              </div>
              {/* Typing output */}
              <div className="p-6 min-h-[72px] flex items-center">
                <div className="flex items-start gap-3">
                  <Brain
                    size={16}
                    className="text-brand mt-0.5 flex-shrink-0"
                  />
                  <p className="text-base text-white/85 italic font-light leading-relaxed">
                    "{typedNarration}
                    <span className="inline-block w-0.5 h-4 bg-brand ml-0.5 animate-pulse align-middle" />
                    "
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Demo Modes ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="font-display text-2xl font-bold text-white mb-2">
              One click to start a scenario
            </h2>
            <p className="text-white/35 text-sm">
              Pre-built agent goal sets — just pick and go
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_MODES.map((mode, i) => (
              <motion.div
                key={mode.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-white/8 bg-dark-700/60 p-5 flex flex-col gap-3 hover:border-white/15 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${mode.color}`}
                >
                  <mode.icon size={18} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    {mode.label}
                  </h3>
                  <p className="text-white/35 text-xs mt-0.5">{mode.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="font-display text-3xl md:text-4xl font-bold text-white mb-4"
            >
              Not just detecting.{" "}
              <span className="text-brand">Understanding.</span>
            </motion.h2>
            <motion.p
              custom={1}
              variants={fadeUp}
              className="text-white/40 text-lg max-w-xl mx-auto"
            >
              A complete AI agent pipeline — from raw pixels to spoken insight.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-2xl border border-white/8 bg-dark-700/60 backdrop-blur-sm p-5 hover:border-white/15 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${f.color}`}
                >
                  <f.icon size={18} />
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl font-bold text-white mb-14 text-center"
          >
            How It Works
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                icon: Camera,
                label: "Webcam",
                sub: "MediaDevices API",
                color: "text-white/60",
              },
              {
                icon: Cpu,
                label: "YOLOv8s",
                sub: "80 COCO classes",
                color: "text-brand",
              },
              {
                icon: GitBranch,
                label: "Memory Engine",
                sub: "Object tracking",
                color: "text-neon-cyan",
              },
              {
                icon: Brain,
                label: "Gemini 2.0",
                sub: "Scene reasoning",
                color: "text-neon-purple",
              },
              {
                icon: Bell,
                label: "Agent Goals",
                sub: "Alert system",
                color: "text-neon-orange",
              },
              {
                icon: Zap,
                label: "Voice + UI",
                sub: "Real-time output",
                color: "text-neon-green",
              },
            ].map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.09 }}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-dark-600 border border-white/10 flex items-center justify-center mb-1">
                    <step.icon size={20} className={step.color} />
                  </div>
                  <span className={`text-xs font-semibold ${step.color}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-white/25 font-mono">
                    {step.sub}
                  </span>
                </motion.div>
                {i < arr.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center col-span-0 -mx-2 mt-4">
                    <ArrowRight size={14} className="text-white/15" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 text-center border-t border-white/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Ready to watch it think?
          </h2>
          <p className="text-white/40 mb-8 text-lg">
            Open your camera and start a live session in seconds.
          </p>
          <Link to="/analyze">
            <Button
              size="lg"
              variant="primary"
              icon={<ScanLine size={18} />}
              iconRight={<ArrowRight size={16} />}
            >
              Launch Analyzer
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
