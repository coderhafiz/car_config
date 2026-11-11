"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConfiguratorCanvas from "@/components/configurator/ConfiguratorCanvas";
import ControlPanel from "@/components/configurator/ControlPanel";
import LandingOverlay from "@/components/ui/LandingOverlay";
import Loader from "@/components/ui/Loader";
import { ConfigState, MODELS } from "@/components/configurator/Model";
import { Sparkles, Share2 } from "lucide-react";
import { useSafari } from "@/hooks/useSafari";

export default function Home() {
  const isSafari = useSafari();

  // Initial state: load directly into the 3D studio configurator
  const [showConfigurator, setShowConfigurator] = useState(true);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [shouldEagerLoad, setShouldEagerLoad] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Auto-dismiss interaction hint after 5 seconds to keep the canvas clean
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Track viewport size (mobile / mobile-landscape layouts)
  useEffect(() => {
    const check = () => {
      setIsMobileLandscape(
        window.innerWidth > window.innerHeight && window.innerHeight < 700,
      );
    };
    const timer = setTimeout(() => {
      check();
      if (window.innerWidth < 640) setIsCollapsed(true);
    }, 0);
    window.addEventListener("resize", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", check);
    };
  }, []);

  // Eagerly start the WebGL scene behind the landing page (skip on Safari/iOS,
  // where heavy background WebGL initialisation hurts responsiveness)
  useEffect(() => {
    if (isSafari) return;
    const timer = setTimeout(() => setShouldEagerLoad(true), 50);
    return () => clearTimeout(timer);
  }, [isSafari]);

  // Default config with first car's accent color
  const [config, setConfig] = useState<ConfigState>(() => {
    const firstModel = MODELS[0];
    return {
      mainColor: "#0a0a0a", // Obsidian Black body
      accentColor: firstModel.accentColor, // Car-specific default accent
      interiorColor: "#1a1a1a", // Black interior
      selectedModel: firstModel.id,
      isAnimated: false,
      rotationY: 0,
      zoom: 700,
      lightIntensity: 1.3,
      partColors: {},
      viewMode: "exterior",
      selectedTexture: "leather",
      mattePaint: false,
      selectedShowroom: "showroom-1",
    };
  });

  // Apply a shared configuration from the URL (?config=...) after mount
  useEffect(() => {
    const sharedConfig = new URLSearchParams(window.location.search).get(
      "config",
    );
    if (!sharedConfig) return;

    let decoded: Partial<ConfigState> = {};
    try {
      decoded = JSON.parse(atob(sharedConfig));
    } catch (e) {
      console.error("Failed to parse shared config", e);
    }
    if (
      decoded.selectedModel &&
      !MODELS.some((m) => m.id === decoded.selectedModel)
    ) {
      delete decoded.selectedModel;
    }

    const timer = setTimeout(() => {
      setConfig((prev) => ({ ...prev, ...decoded }));
      setShowConfigurator(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const selectedModelInfo = useMemo(
    () => MODELS.find((m) => m.id === config.selectedModel) || MODELS[0],
    [config.selectedModel],
  );

  // When changing models, keep current colors but update accent default if not set
  const handleModelChange = (modelId: string) => {
    const model = MODELS.find((m) => m.id === modelId) || MODELS[0];
    setConfig((prev) => ({
      ...prev,
      selectedModel: modelId,
      accentColor: model.accentColor, // reset accent to car default
      isAnimated: false,
      viewMode: "exterior",
    }));
  };

  const handleShare = async () => {
    const configString = btoa(
      JSON.stringify({
        selectedModel: config.selectedModel,
        mainColor: config.mainColor,
        accentColor: config.accentColor,
        interiorColor: config.interiorColor,
        selectedTexture: config.selectedTexture,
        zoom: config.zoom,
      }),
    );

    const url = `${window.location.origin}${window.location.pathname}?config=${configString}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My customly-U Configuration",
          text: `Check out this ${selectedModelInfo.name} I configured!`,
          url,
        });
      } catch (e) {
        console.log("Share cancelled", e);
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Configuration link copied to clipboard!");
    }
  };

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-bg-dark selection:bg-brand-primary/30 flex flex-col">
      {/* Landing overlay */}
      <AnimatePresence>
        {!showConfigurator && (
          <motion.div
            key="landing"
            initial={{ y: 0 }}
            exit={{ y: "-100dvh" }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
            className="absolute inset-0 z-100"
            style={isSafari ? { willChange: "transform" } : undefined}
          >
            <LandingOverlay onEnter={() => setShowConfigurator(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          scale: showConfigurator ? 1 : 0.95,
          opacity: showConfigurator ? 1 : 0.3,
          y: showConfigurator ? 0 : 40,
          filter: showConfigurator ? "blur(0px)" : "blur(10px)",
        }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        className="relative w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        {/* Background ambience */}
        <div className="fixed top-0 left-0 w-full h-dvh pointer-events-none flex items-center justify-center overflow-hidden">
          {isSafari ? (
            <>
              <div
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 dark:opacity-15"
                style={{
                  background:
                    "radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)",
                }}
              />
              <div
                className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-15 dark:opacity-10"
                style={{
                  background:
                    "radial-gradient(circle, var(--brand-secondary) 0%, transparent 70%)",
                }}
              />
              <div
                className="absolute w-[60%] h-[60%] rounded-full opacity-15 dark:opacity-25 transition-colors duration-1000"
                style={{
                  background: `radial-gradient(circle, ${config.mainColor} 0%, transparent 70%)`,
                }}
              />
            </>
          ) : (
            <>
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-primary/20 dark:bg-brand-primary/15 blur-[140px] rounded-full" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-secondary/15 dark:bg-brand-secondary/10 blur-[140px] rounded-full" />
              <motion.div
                className="absolute w-[60%] h-[60%] rounded-full blur-[180px] opacity-15 dark:opacity-25"
                animate={{ backgroundColor: config.mainColor }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
              />
            </>
          )}
        </div>

        {/* Header */}
        <header className="sticky lg:absolute top-0 left-0 w-full px-4 py-3 lg:px-8 lg:py-4 flex justify-between items-center z-50 pointer-events-none backdrop-blur-md bg-(--bg-dark)/60 border-b border-(--glass-border) landscape-optimized-header">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto"
          >
            <div className="flex items-center">
              <h1
                className="text-sm sm:text-base lg:text-xl font-normal tracking-[0.12em] sm:tracking-[0.16em] text-white"
                style={{ fontFamily: "'Drason', var(--font-open-sans), sans-serif" }}
              >
                customly-<span className="text-brand-primary">U</span>
              </h1>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 lg:gap-3 pointer-events-auto items-center"
          >
            <button
              id="share-config-btn"
              onClick={handleShare}
              className="p-2 lg:p-2.5 glass rounded-[3px] glass-hover relative pointer-events-auto"
              title="Share configuration"
            >
              <Share2 className="w-4 h-4 text-text-main" />
            </button>
            <button
              id="add-to-cart-btn"
              className="px-3 lg:px-4 py-2 rounded-[3px] text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.18em] flex items-center gap-2 whitespace-nowrap transition-all duration-200 hover:brightness-110 glass"
              style={{
                background:
                  "linear-gradient(135deg, rgba(28, 54, 66, 0.85) 0%, rgba(16, 33, 42, 0.92) 100%)",
                border: "1px solid rgba(209, 107, 84, 0.75)",
                boxShadow:
                  "inset 0 0 18px rgba(209, 107, 84, 0.14), 0 4px 14px rgba(0, 0, 0, 0.35)",
                color: "#edf2f4",
              }}
              title="Commission build"
            >
              <span>Commission Build</span>
              <Sparkles
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: "var(--brand-secondary)" }}
              />
            </button>
          </motion.div>
        </header>

        {/* Main content area */}
        <div className="relative w-full flex-1 sm:h-full">
          <AnimatePresence>
            {!isLoaded && showConfigurator && (
              <Loader progress={isLoaded ? 100 : 45} />
            )}
          </AnimatePresence>

          <div className="relative w-full h-full">
            {/* Car info panel (Ceer Motors architectural glass card — hidden on mobile) */}
            <motion.div
              key={selectedModelInfo.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: isLoaded ? 0 : -100, opacity: isLoaded ? 1 : 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="hidden sm:block absolute left-4 right-4 top-4 lg:top-auto lg:right-auto lg:left-6 lg:bottom-10 lg:max-w-sm pointer-events-none z-10"
            >
              <div
                className="glass p-4 lg:p-6 rounded-sm shadow-2xl landscape-optimized-info"
                style={{
                  border: "1px solid rgba(209, 107, 84, 0.45)",
                }}
              >
                {/* Brand badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "var(--brand-secondary)" }}
                    />
                    <span className="text-[8px] lg:text-[10px] text-text-muted uppercase tracking-[0.24em] font-semibold">
                      {selectedModelInfo.brand} · {selectedModelInfo.year}{" "}
                      Edition
                    </span>
                  </div>
                  <span
                    className="hidden lg:inline-block px-2 py-0.5 rounded-xs text-[8px] font-semibold uppercase tracking-[0.2em] border"
                    style={{
                      borderColor: "var(--glass-border)",
                      color: "var(--brand-primary)",
                    }}
                  >
                    {config.viewMode === "interior"
                      ? "Interior View"
                      : "Exterior View"}
                  </span>
                </div>

                <h2 className="text-xl lg:text-2xl font-bold uppercase tracking-[0.12em] mb-3">
                  {selectedModelInfo.name}
                </h2>

                <div className="pt-3 border-t border-(--glass-border) flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                    Total Base Price
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg lg:text-2xl font-bold tabular-nums leading-none">
                      ${selectedModelInfo.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3D Canvas */}
            {(showConfigurator || shouldEagerLoad) && (
              <ConfiguratorCanvas
                config={config}
                onLoaded={() => setIsLoaded(true)}
                isInitialLoading={!isLoaded}
                isCollapsed={isCollapsed}
              />
            )}
          </div>

          {/* Control panel */}
          {isLoaded && showConfigurator && (
            <ControlPanel
              config={config}
              setConfig={setConfig}
              onModelChange={handleModelChange}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
            />
          )}
        </div>

        {/* Bottom interaction hint (auto-fades after 5s) */}
        <AnimatePresence>
          {isLoaded && showConfigurator && showHint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.6 }}
              className="fixed bottom-5 left-[50%] -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-100 landscape-optimized-selection-hint"
            >
              <div className="hidden lg:block lg:scale-100 origin-bottom landscape-optimized-interaction-hint">
                <div className="px-4 py-1.5 glass rounded-[3px] flex items-center gap-2.5 whitespace-nowrap shadow-xl border border-(--glass-border)">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--brand-secondary)" }}
                  />
                  <p className="lg:text-[9px] text-[8px] font-semibold uppercase tracking-[0.22em]">
                    {isMobileLandscape
                      ? "Drag to rotate · Two fingers to pan"
                      : config.viewMode === "interior"
                        ? "Drag to look around interior"
                        : config.isAnimated
                          ? "Auto-rotating · Drag to rotate vehicle"
                          : "Left-drag to rotate vehicle · Right-drag to pan"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
