"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useSafari } from "@/hooks/useSafari";

interface LandingOverlayProps {
  onEnter: () => void;
}

export default function LandingOverlay({ onEnter }: LandingOverlayProps) {
  const isSafari = useSafari();

  return (
    <div className="absolute inset-0 w-full h-full z-100 bg-bg-dark text-text-main overflow-hidden transition-colors duration-500">
      {/* Fixed shell */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        {/* Background Ambience */}
        {isSafari ? (
          <>
            <div
              className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none -z-10 opacity-20"
              style={{
                background:
                  "radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full pointer-events-none -z-10 opacity-10"
              style={{
                background:
                  "radial-gradient(circle, var(--brand-secondary) 0%, transparent 70%)",
              }}
            />
          </>
        ) : (
          <>
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-brand-primary/20 blur-[140px] rounded-full pointer-events-none -z-10" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-secondary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
          </>
        )}

        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Scrollable content */}
      <div className="relative w-full h-full overflow-y-auto custom-scrollbar z-10">
        <div className="min-h-full w-full flex flex-col items-center py-16 sm:py-20 px-4 landscape-optimized-landing-container">
          <motion.div
            className="my-auto flex flex-col items-center text-center px-4 sm:px-8 max-w-4xl landscape-optimized-landing-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            {/* Brand */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="mb-6 sm:mb-8"
            >
              <div className="flex items-center justify-center mb-4">
                <h1 className="text-4xl sm:text-7xl font-black tracking-tighter landscape-optimized-landing-title">
                  KHAZ <span className="text-brand-primary">CUSTOMS</span>
                </h1>
              </div>
              <p className="text-xs sm:text-sm font-bold text-text-muted uppercase tracking-[0.4em] mt-2 landscape-optimized-landing-subtitle">
                Premium Automotive Configurator
              </p>
            </motion.div>

            <h2 className="text-2xl sm:text-5xl font-bold mb-6 sm:mb-8 leading-tight tracking-tight landscape-optimized-landing-hero">
              Configure Your Dream <br className="hidden sm:block" />
              Machine.
            </h2>

            <p className="text-sm sm:text-lg text-text-muted mb-10 sm:mb-14 max-w-2xl leading-relaxed landscape-optimized-landing-desc">
              Explore our iconic fleet in photorealistic 3D. Customize colors,
              materials and finishes. Switch between exterior and interior views in real-time.
            </p>

            {/* Car thumbnails row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex gap-3 mb-10 sm:mb-14"
            >
              {["Audi R8", "Audi RS6", "Audi RS8", "Porsche 911", "Corvette C8"].map((name, i) => (
                <div
                  key={name}
                  className="glass rounded-xl px-3 py-2 flex flex-col items-center gap-1 border border-(--glass-border)"
                >
                  <span className="text-[8px] sm:text-[10px] font-bold text-brand-primary uppercase tracking-widest">{name}</span>
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: ["#ff0000", "#0066cc", "#222", "#ff6600", "#d16b54"][i] }}
                  />
                </div>
              ))}
            </motion.div>

            <button
              id="enter-configurator-btn"
              onClick={onEnter}
              className={`group relative w-full sm:w-auto flex justify-center px-6 py-4 sm:px-10 sm:py-5 glass rounded-full items-center gap-3 sm:gap-4 border-2 border-(--glass-border) hover:border-brand-primary/50 duration-500 overflow-hidden landscape-optimized-landing-btn ${
                isSafari ? "transition-colors" : "transition-all"
              }`}
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <span className="relative z-10 text-[10px] sm:text-base font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                Configure Your Vehicle
              </span>
              <ArrowRight className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-brand-primary group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
