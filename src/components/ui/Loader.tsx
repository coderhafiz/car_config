"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DefaultLoadingManager } from "three";
import {
  Sparkles,
  Scan,
  Palette,
  FileText,
  Cpu,
  ShieldCheck,
  Gauge,
  Layers,
} from "lucide-react";

const PLATFORM_FEATURES = [
  {
    icon: Palette,
    title: "Bespoke Paint & Finish Atelier",
    desc: "Multi-stage metallic clearcoats, stealth satin-matte wraps, forged alloy finishes, and ceramic calipers.",
    color: "#d16b54",
  },
  {
    icon: Layers,
    title: "360° Exterior & Cockpit Views",
    desc: "Seamlessly transition from the architectural halo-lit showroom into the Nappa leather & carbon cockpit.",
    color: "#026dfe",
  },
  {
    icon: Scan,
    title: "WebXR AR & 3D Decal Studio",
    desc: "Project racing liveries onto curved 3D bodywork or point your phone at a real car in Augmented Reality.",
    color: "#10b981",
  },
  {
    icon: FileText,
    title: "4-Angle Spec Sheet & Commission",
    desc: "Capture multi-angle studio snapshots with an itemized MSRP breakdown and instant build reservation.",
    color: "#a855f7",
  },
];

export default function Loader({
  progress: externalProgress,
  isSceneReady = false,
}: {
  progress?: number;
  isSceneReady?: boolean;
}) {
  const [liveProgress, setLiveProgress] = useState<number>(8);
  const [activeAssetLabel, setActiveAssetLabel] = useState<string>(
    "Initializing WebGL2 Studio & Overhead Superloop Lighting..."
  );

  // Hook into Three.js DefaultLoadingManager + smooth background progress ticker
  useEffect(() => {
    let isMounted = true;

    const prevOnProgress = DefaultLoadingManager.onProgress;
    DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      if (prevOnProgress) prevOnProgress(url, itemsLoaded, itemsTotal);
      if (!isMounted) return;

      const ratio =
        itemsTotal > 0
          ? Math.min(96, Math.round((itemsLoaded / itemsTotal) * 95))
          : 45;
      setLiveProgress((prev) => Math.max(prev, ratio));

      const cleanName = url.split("/").pop() || "";
      if (cleanName.includes(".glb") || cleanName.includes(".gltf")) {
        setActiveAssetLabel("Streaming Draco-Compressed 3D Supercar Geometry...");
      } else if (cleanName.includes(".ktx2")) {
        setActiveAssetLabel("Transcoding KTX2 Interior Leather & Clearcoat Shaders...");
      } else if (cleanName.includes(".hdr") || cleanName.includes(".exr")) {
        setActiveAssetLabel("Calibrating Studio HDRI Reflections & Rim Lighting...");
      }
    };

    // Smooth non-blocking progress glide so the bar never appears frozen while shaders compile
    const interval = setInterval(() => {
      setLiveProgress((prev) => {
        if (isSceneReady || externalProgress === 100) return 100;
        if (prev < 35) return prev + 3;
        if (prev < 68) {
          setActiveAssetLabel("Streaming Draco-Compressed 3D Supercar Geometry...");
          return prev + 2;
        }
        if (prev < 92) {
          setActiveAssetLabel("Compiling PBR Clearcoat & Interior Cabin Shaders...");
          return prev + 0.8;
        }
        return prev;
      });
    }, 140);

    return () => {
      isMounted = false;
      clearInterval(interval);
      DefaultLoadingManager.onProgress = prevOnProgress;
    };
  }, [isSceneReady, externalProgress]);

  const displayProgress = isSceneReady
    ? 100
    : Math.min(99, Math.max(liveProgress, externalProgress || 0));

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-150 bg-[#06090b] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden select-none custom-scrollbar"
    >
      {/* Ambient Background Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-130 h-130 rounded-full opacity-20 blur-[130px]"
          style={{ background: "radial-gradient(circle, #026dfe 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-130 h-130 rounded-full opacity-20 blur-[130px]"
          style={{ background: "radial-gradient(circle, #d16b54 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      {/* Top Navbar (Clean without "Bespoke") */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="text-sm sm:text-xl font-normal tracking-[0.16em] text-white"
            style={{ fontFamily: "'Drason', sans-serif" }}
          >
            customly-<span className="text-[#d16b54]">U</span>
          </span>
        </div>

        {/* Non-blocking Background Engine Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-glass-border bg-white/3 text-[10px] font-semibold tracking-wider uppercase text-[#d2e2ea]/85">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Cpu className="w-3.5 h-3.5 text-[#026dfe]" />
          <span className="hidden sm:inline">Background 3D Scene Setup</span>
          <span className="font-mono font-bold text-white">{Math.round(displayProgress)}%</span>
        </div>
      </header>

      {/* Main Split Hero Content: Editorial Headline + 4 Feature Cards + Hero Image */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Editorial Headline, Introduction & 4 Feature Cards (6 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 space-y-4 sm:space-y-5"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d16b54]/10 border border-[#d16b54]/30 text-[#d16b54] text-[10px] font-bold uppercase tracking-[0.22em]">
              <Sparkles className="w-3 h-3" />
              <span>Real-Time WebGL2 & WebXR Configurator</span>
            </div>

            <h1 className="text-2xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.12] text-white">
              Sculpted in Light.{" "}
              <span className="bg-linear-to-r from-[#edf2f4] via-[#9cc6e8] to-[#d16b54] bg-clip-text text-transparent">
                Engineered to Your Spec.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#d2e2ea]/70 leading-relaxed max-w-xl">
              Welcome to <strong className="text-white font-semibold">Customly-U</strong>. Explore our
              curated fleet of flagship supercars in an interactive 3D architectural studio. Tailor
              multi-stage metallic and satin-matte finishes, cabin leathers, forged aero wheels,
              and project custom racing decals onto curved bodywork in 3D or directly onto real cars via{" "}
              <span className="text-[#026dfe] font-semibold">WebXR Augmented Reality</span>.
            </p>

            {/* 4 Key Website Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {PLATFORM_FEATURES.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-3 rounded-xl glass border border-glass-border bg-white/2 hover:bg-white/4 transition flex items-start gap-3"
                  >
                    <div
                      className="p-2 rounded-lg shrink-0 mt-0.5"
                      style={{
                        backgroundColor: `${feat.color}18`,
                        border: `1px solid ${feat.color}40`,
                        color: feat.color,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide">
                        {feat.title}
                      </h3>
                      <p className="text-[11px] text-[#d2e2ea]/55 leading-snug mt-0.5">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column: Cinematic High-Angle Supercar Hero Image (6 cols) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.1 }}
            className="lg:col-span-6"
          >
            <div className="relative rounded-2xl overflow-hidden glass border border-glass-border shadow-2xl bg-[#070d12] aspect-16/10 group">
              {/* Zero-Latency Local High-Angle Studio Vector Artwork Base Layer */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-supercar-high-angle.svg"
                alt="High-Angle Studio Supercar Render"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* High-Angle Cinematic Dark Studio Supercar Photography Layer */}
              <motion.img
                initial={{ scale: 1.06, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.92 }}
                transition={{ duration: 1.8, ease: "easeOut" }}
                src="https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1600&q=85"
                alt="Cinematic High-Angle Supercar Hero Shot"
                className="absolute inset-0 w-full h-full object-cover object-center mix-blend-lighten"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />

              {/* Cinematic Vignette & Studio Rim Gradients */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(6,9,11,0.55) 0%, rgba(6,9,11,0.05) 45%, rgba(6,9,11,0.88) 100%)",
                }}
              />

              {/* Top Camera Telemetry Overlay on Hero Image */}
              <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-none">
                <div className="px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md border border-white/10 text-[9px] font-mono uppercase tracking-widest text-[#d2e2ea]/90 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#026dfe]" />
                  <span>CAM 01 · HIGH-ANGLE 38° STUDIO OVERHEAD</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md border border-[#d16b54]/40 text-[9px] font-mono uppercase tracking-widest text-[#d16b54] flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  <span>620 HP · 0-100 2.9S</span>
                </div>
              </div>

              {/* Bottom Hero Caption & Spec Bar inside Image Card */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex flex-col sm:flex-row sm:items-end justify-between gap-2 pointer-events-none">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#026dfe]">
                    Flagship Studio Preview
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                    911 GT3 / R8 Aero Edition
                  </div>
                  <div className="text-[10px] text-[#d2e2ea]/65">
                    Obsidian Satin Clearcoat · Forged Champagne Gold Turbines · Ceramic Calipers
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold uppercase tracking-wider self-start sm:self-auto">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>60 FPS WebGL2 Ready</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Non-Blocking Background Loading Progress Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-5 sm:pb-7">
        <div className="p-3.5 sm:p-4 rounded-2xl glass border border-glass-border bg-[#091117]/90 shadow-2xl space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full border-2 border-[#026dfe] border-t-transparent animate-spin shrink-0" />
              <span className="font-semibold text-white tracking-wide">
                {activeAssetLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#d2e2ea]/60 font-mono">
              <span>NON-BLOCKING BACKGROUND WORKER</span>
              <span className="text-white font-extrabold">
                {Math.round(displayProgress)}% COMPLETE
              </span>
            </div>
          </div>

          {/* Progress Track */}
          <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "8%" }}
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full rounded-full bg-linear-to-r from-[#026dfe] via-[#38bdf8] to-[#d16b54] shadow-lg shadow-[#026dfe]/40"
            />
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
