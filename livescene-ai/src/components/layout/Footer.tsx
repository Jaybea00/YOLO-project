import React from "react";
import { Brain, Github, Twitter } from "lucide-react";
import { NavLink } from "react-router-dom";

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/8 bg-dark-800/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <Brain size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-sm">
              LiveScene <span className="text-brand">AI</span>
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-white/40">
            <NavLink to="/" className="hover:text-white transition-colors">
              Home
            </NavLink>
            <NavLink
              to="/analyze"
              className="hover:text-white transition-colors"
            >
              Analyze
            </NavLink>
            <NavLink
              to="/history"
              className="hover:text-white transition-colors"
            >
              History
            </NavLink>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Jaybea00/YOLO-project"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-white transition-colors"
            >
              <Github size={18} />
            </a>
            <span className="text-white/20 text-xs font-mono">
              © {new Date().getFullYear()} LiveScene AI
            </span>
          </div>
        </div>

        {/* Bottom tag line */}
        <p className="text-center text-white/20 text-xs font-mono mt-6">
          Powered by YOLO · Real-Time Object Detection · LLM Scene Reasoning
        </p>
      </div>
    </footer>
  );
};

export default Footer;
