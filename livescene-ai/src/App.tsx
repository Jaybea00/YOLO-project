import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Sidebar from "./components/layout/Sidebar";
import BottomNav from "./components/layout/BottomNav";
import Home from "./pages/Home";
import Analyze from "./pages/Analyze";
import {
  SceneAnalysisProvider,
  useSceneAnalysisContext,
} from "./context/SceneAnalysisContext";
import "./styles/globals.css";
import "./styles/animations.css";

// Lazy-load heavy pages that aren't on the critical path
const History = lazy(() => import("./pages/History"));

// Inner shell reads from the shared context (same instance as Analyze.tsx)
const AppShell: React.FC = () => {
  const { isRunning, isConnected, stats } = useSceneAnalysisContext();

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-dark-900 text-white font-sans">
        <Header isConnected={isConnected} isLive={isRunning} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar isRunning={isRunning} fps={stats.fps} />

          <main className="flex-1 overflow-y-auto min-h-0 pb-16 md:pb-0">
            <AnimatePresence mode="wait">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-text-secondary text-sm py-20">
                    Loading…
                  </div>
                }
              >
                <Routes>
                  <Route
                    path="/"
                    element={
                      <motion.div
                        key="home"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Home />
                      </motion.div>
                    }
                  />
                  <Route
                    path="/analyze"
                    element={
                      <motion.div
                        key="analyze"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="h-full"
                      >
                        <Analyze />
                      </motion.div>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <motion.div
                        key="history"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <History />
                      </motion.div>
                    }
                  />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </main>
        </div>

        {/* Footer hidden on mobile — BottomNav takes over */}
        <div className="hidden md:block">
          <Footer />
        </div>

        <BottomNav isRunning={isRunning} />
      </div>
    </Router>
  );
};

// Outer wrapper — provides the single shared SceneAnalysis instance to the whole tree
const App: React.FC = () => (
  <SceneAnalysisProvider>
    <AppShell />
  </SceneAnalysisProvider>
);

export default App;
