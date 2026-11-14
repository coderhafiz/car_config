"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Printer,
  CheckCircle2,
  CreditCard,
  Building,
  ShieldCheck,
  ChevronRight,
  Download,
  Gauge,
  Zap,
  Activity,
  Layers,
  Award,
} from "lucide-react";
import { ConfigState, MODELS, DecalConfig } from "./Model";

export interface MultiAngleSnapshots {
  front: string;
  back: string;
  left: string;
  right: string;
}

export interface CarTechnicalSpecs {
  engine: string;
  power: string;
  torque: string;
  acceleration: string;
  topSpeed: string;
  transmission: string;
  drivetrain: string;
  chassis: string;
  curbWeight: string;
  fuelEconomy: string;
}

export const CAR_SPECS: Record<string, CarTechnicalSpecs> = {
  "audi-r8": {
    engine: "5.2L Naturally Aspirated V10 FSI",
    power: "602 HP @ 8,100 RPM",
    torque: "413 lb-ft @ 6,400 RPM",
    acceleration: "3.1s (0-60 mph)",
    topSpeed: "205 mph (330 km/h)",
    transmission: "7-Speed S Tronic Dual-Clutch",
    drivetrain: "Quattro Permanent All-Wheel Drive",
    chassis: "Audi Space Frame (ASF) Aluminum / Carbon",
    curbWeight: "3,594 lbs (1,630 kg)",
    fuelEconomy: "13 City / 19 Hwy MPG",
  },
  "audi-rs6-avant": {
    engine: "4.0L Twin-Turbocharged TFSI V8",
    power: "591 HP @ 6,000 RPM",
    torque: "590 lb-ft @ 2,050 RPM",
    acceleration: "3.5s (0-60 mph)",
    topSpeed: "190 mph (305 km/h)",
    transmission: "8-Speed Tiptronic Sport Automatic",
    drivetrain: "Quattro Permanent AWD with Sport Diff",
    chassis: "High-Strength Steel & Aluminum Hybrid",
    curbWeight: "4,960 lbs (2,250 kg)",
    fuelEconomy: "15 City / 22 Hwy MPG",
  },
  "audi-rs8-sport": {
    engine: "5.2L Twin-Turbo V10 Hybrid Performance",
    power: "680 HP @ 7,800 RPM",
    torque: "627 lb-ft @ 3,200 RPM",
    acceleration: "2.8s (0-60 mph)",
    topSpeed: "211 mph (340 km/h)",
    transmission: "8-Speed Dual-Clutch Sport Transmission",
    drivetrain: "Dynamic Torque-Vectoring Electric Quattro",
    chassis: "Full Carbon Monocoque & Subframe",
    curbWeight: "3,720 lbs (1,687 kg)",
    fuelEconomy: "18 City / 24 Hwy MPG",
  },
  "porsche-911": {
    engine: "3.0L Twin-Turbocharged Boxer 6 (Flat-Six)",
    power: "443 HP @ 6,500 RPM",
    torque: "390 lb-ft @ 2,300 RPM",
    acceleration: "3.4s (0-60 mph with Sport Chrono)",
    topSpeed: "190 mph (306 km/h)",
    transmission: "8-Speed Porsche Doppelkupplung (PDK)",
    drivetrain: "Rear-Engine All-Wheel Drive (Carrera 4S)",
    chassis: "Lightweight Aluminum-Steel Composite",
    curbWeight: "3,487 lbs (1,582 kg)",
    fuelEconomy: "18 City / 24 Hwy MPG",
  },
  "chevrolet-corvette-c8": {
    engine: "6.2L Small Block LT2 Naturally Aspirated V8",
    power: "495 HP @ 6,450 RPM",
    torque: "470 lb-ft @ 5,150 RPM",
    acceleration: "2.9s (0-60 mph)",
    topSpeed: "194 mph (312 km/h)",
    transmission: "8-Speed Dual-Clutch Transmission",
    drivetrain: "Mid-Engine Rear-Wheel Drive",
    chassis: "All-Aluminum Structural Backbone",
    curbWeight: "3,366 lbs (1,527 kg)",
    fuelEconomy: "16 City / 24 Hwy MPG",
  },
  "lamborghini-revuelto": {
    engine: "6.5L Naturally Aspirated V12 + 3 Electric Motors",
    power: "1,001 HP combined @ 9,250 RPM",
    torque: "535 lb-ft @ 6,750 RPM + 258 lb-ft Electric",
    acceleration: "2.5s (0-60 mph)",
    topSpeed: "217 mph (350 km/h)",
    transmission: "8-Speed Transverse Dual-Clutch E-Gearbox",
    drivetrain: "Electric All-Wheel Drive (E-4WD) Vectoring",
    chassis: "Aeronautical Monofuselage Carbon Chassis",
    curbWeight: "3,907 lbs (1,772 kg)",
    fuelEconomy: "12 City / 18 Hwy MPG",
  },
};

interface SpecificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigState;
  getSnapshots?: () => Promise<MultiAngleSnapshots>;
}

export default function SpecificationSheet({
  isOpen,
  onClose,
  config,
  getSnapshots,
}: SpecificationSheetProps) {
  const [snapshots, setSnapshots] = useState<MultiAngleSnapshots | null>(null);
  const [activeView, setActiveView] = useState<"front" | "back" | "left" | "right">("front");
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Customer checkout form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wire" | "crypto">("card");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modelInfo = MODELS.find((m) => m.id === config.selectedModel) || MODELS[0];
  const specs = CAR_SPECS[modelInfo.id] || CAR_SPECS["porsche-911"];

  // Derived loading state avoids synchronous render cascade inside effects
  const isCapturing = isOpen && Boolean(getSnapshots) && snapshots === null;

  const handleClose = () => {
    setShowCheckoutModal(false);
    setOrderSubmitted(false);
    setIsEnlarged(false);
    setSnapshots(null);
    onClose();
  };

  // Capture snapshots asynchronously whenever the spec sheet is opened
  useEffect(() => {
    if (!isOpen || !getSnapshots) return;

    let isMounted = true;
    getSnapshots()
      .then((snaps) => {
        if (isMounted) {
          setSnapshots(snaps);
        }
      })
      .catch((err) => {
        console.warn("Failed to capture snapshots:", err);
        if (isMounted) {
          setSnapshots({ front: "", back: "", left: "", right: "" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, getSnapshots]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (showCheckoutModal) {
          setShowCheckoutModal(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showCheckoutModal]);

  if (!isOpen) return null;

  // Price calculations
  const basePrice = modelInfo.price || 142700;
  const paintPrice = config.mattePaint ? 4800 : 2500;
  const wheelPrice = 3200;
  const stickerCount = (config.stickers || []).length;
  const decalPrice = stickerCount * 750;
  const destinationCharge = 1850;
  const totalPrice = basePrice + paintPrice + wheelPrice + decalPrice + destinationCharge;

  const handlePrint = () => {
    window.print();
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const generatedId = `CMD-${modelInfo.brand.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
      setOrderId(generatedId);
      setIsSubmitting(false);
      setOrderSubmitted(true);
    }, 1200);
  };

  const viewCards = [
    { key: "front" as const, label: "Front Fascia & Hood", angle: "Front 0°" },
    { key: "left" as const, label: "Driver Profile", angle: "Left Side 90°" },
    { key: "right" as const, label: "Passenger Profile", angle: "Right Side 90°" },
    { key: "back" as const, label: "Rear Fascia & Spoiler", angle: "Rear 180°" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xl flex flex-col text-slate-100 print:bg-white print:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#080d11]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="text-lg sm:text-xl font-bold tracking-wider text-white"
              style={{ fontFamily: "var(--font-drason), system-ui, sans-serif" }}
            >
              CUSTOM<span className="text-[#d16b54]">LY-U</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 font-mono uppercase tracking-wider hidden sm:inline-block">
              Bespoke Commission
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all"
            title="Print Specification Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-white/80" />
            <span>Print Spec Sheet</span>
          </button>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
            title="Close Spec Sheet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8 print:p-0 print:space-y-4">
        {/* Title Banner */}
        <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#d16b54] mb-1">
              <span>Official Vehicle Build Sheet</span>
              <span>•</span>
              <span>{modelInfo.brand}</span>
              <span>•</span>
              <span>{modelInfo.year}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-drason">
              {modelInfo.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/60 max-w-2xl mt-1.5 leading-relaxed">
              {modelInfo.description}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
              Total Commission Price
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#d16b54] font-mono">
              ${totalPrice.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Certified Bespoke Specification
            </span>
          </div>
        </div>

        {/* 4-Angle Interactive Gallery */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-white/80 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#d16b54]" />
              <span>Customized 360° Studio Previews</span>
            </h2>
            <span className="text-xs text-white/50">
              {isCapturing ? "Rendering 4 Studio Angles..." : "Click any angle to view full size"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {viewCards.map((view) => {
              const snapUrl = snapshots?.[view.key];
              const isActive = activeView === view.key;
              return (
                <div
                  key={view.key}
                  onClick={() => {
                    setActiveView(view.key);
                    setIsEnlarged(true);
                  }}
                  className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                    isActive
                      ? "border-[#d16b54] ring-1 ring-[#d16b54] bg-[#0c161d]"
                      : "border-white/10 hover:border-white/30 bg-[#091016]/80"
                  }`}
                >
                  <div className="aspect-[16/10] w-full relative flex items-center justify-center bg-[#070b0e] overflow-hidden">
                    {snapUrl ? (
                      <img
                        src={snapUrl}
                        alt={`${modelInfo.name} ${view.label}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-white/40">
                        <div className="w-6 h-6 border-2 border-[#d16b54] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-mono uppercase">Rendering {view.label}...</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/90">
                      {view.angle}
                    </div>
                  </div>

                  <div className="p-2.5 flex items-center justify-between border-t border-white/5 bg-[#0a1218]">
                    <span className="text-xs font-semibold text-white/90 truncate">
                      {view.label}
                    </span>
                    <span className="text-[10px] text-[#d16b54] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Enlarge →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Two-Column Specification & Build Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols): Customization & Installed Liveries */}
          <div className="lg:col-span-2 space-y-6">
            {/* Custom Options Card */}
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d16b54]" />
                <span>Tailored Exterior & Interior Options</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Paint */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Exterior Coachwork Paint
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                      style={{ backgroundColor: config.mainColor }}
                    />
                    <span className="font-semibold text-white text-sm">
                      {config.mainColor}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase">
                      {config.mattePaint ? "Satin Matte" : "Gloss Metallic Clearcoat"}
                    </span>
                  </div>
                </div>

                {/* Wheels */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Forged Performance Wheels
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <span className="font-semibold text-white text-sm">
                      {config.accentColor || "Bespoke Alloy"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase">
                      Forged Lightweight
                    </span>
                  </div>
                </div>

                {/* Calipers */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Brake Caliper Accent
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <span className="font-semibold text-white text-sm">
                      Sport Finish
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase">
                      Monobloc 6-Piston
                    </span>
                  </div>
                </div>

                {/* Interior */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Interior Cockpit Appointments
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-white text-sm">
                      {modelInfo.materialType || "Semi-Aniline Leather"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase">
                      Handcrafted
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Stickers & Decals Applied */}
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#d16b54]" />
                  <span>Installed Decals & Racing Liveries ({stickerCount})</span>
                </h3>
                <span className="text-xs text-white/50 font-mono">
                  High-Gloss Cast Vinyl
                </span>
              </div>

              {stickerCount === 0 ? (
                <div className="p-6 rounded-lg bg-black/20 border border-white/5 text-center text-xs text-white/50">
                  No custom stickers placed on this vehicle build.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(config.stickers || []).map((st: DecalConfig, idx: number) => {
                    const presetLabel =
                      st.preset === "roof"
                        ? "Top Roof"
                        : st.preset === "hood"
                        ? "Front Hood"
                        : st.preset === "rightDoor"
                        ? "Passenger Door"
                        : st.preset === "leftDoor"
                        ? "Driver Door"
                        : "Custom Panel";

                    return (
                      <div
                        key={st.id}
                        className="p-3 rounded-lg bg-black/30 border border-white/5 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded bg-black/40 border border-white/10 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={st.textureUrl}
                            alt={st.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1 rounded bg-[#d16b54]/20 text-[#d16b54] font-bold">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {st.name || "Decal"}
                            </span>
                          </div>
                          <span className="text-[10px] text-white/60 block mt-0.5">
                            Location: {presetLabel}
                          </span>
                          {st.mirrored && (
                            <span className="text-[9px] text-amber-400/90 font-medium block">
                              • Mirrored to opposite side
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Technical Performance Specs Table */}
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#d16b54]" />
                <span>Powertrain & Performance Engineering</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-6 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Engine</span>
                  <span className="font-semibold text-white text-sm">{specs.engine}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Power Output</span>
                  <span className="font-semibold text-white text-sm">{specs.power}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Peak Torque</span>
                  <span className="font-semibold text-white text-sm">{specs.torque}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">0–60 MPH</span>
                  <span className="font-semibold text-[#d16b54] text-sm">{specs.acceleration}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Top Track Speed</span>
                  <span className="font-semibold text-white text-sm">{specs.topSpeed}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Transmission</span>
                  <span className="font-semibold text-white text-sm">{specs.transmission}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Drivetrain</span>
                  <span className="font-semibold text-white text-sm">{specs.drivetrain}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Curb Weight</span>
                  <span className="font-semibold text-white text-sm">{specs.curbWeight}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-white/50 block">Chassis Architecture</span>
                  <span className="font-semibold text-white text-sm">{specs.chassis}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Pricing Summary & Commission Order CTA */}
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-5 sticky top-20">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 pb-3 border-b border-white/10">
                Commission Investment Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Base Vehicle MSRP</span>
                  <span className="font-mono font-semibold">${basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    Bespoke Paint Finish ({config.mattePaint ? "Satin Matte" : "Gloss Clearcoat"})
                  </span>
                  <span className="font-mono font-semibold">${paintPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Custom Forged Alloy Rims</span>
                  <span className="font-mono font-semibold">${wheelPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Bespoke Vinyl Decals ({stickerCount})</span>
                  <span className="font-mono font-semibold">${decalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Enclosed Factory Delivery & Prep</span>
                  <span className="font-mono font-semibold">${destinationCharge.toLocaleString()}</span>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-white block">Total Investment</span>
                    <span className="text-[10px] text-white/50">Taxes & Registration calculated at handover</span>
                  </div>
                  <span className="text-2xl font-extrabold text-[#d16b54] font-mono">
                    ${totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Commission Order CTA */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="w-full py-3.5 px-4 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:brightness-110 active:scale-[0.99]"
                  style={{
                    background: "linear-gradient(135deg, #e07a5f 0%, #c4553b 100%)",
                    boxShadow: "0 6px 20px rgba(209, 107, 84, 0.4)",
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Proceed to Commission Order</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>

                <p className="text-[11px] text-white/50 text-center flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Secure Bespoke Build Reservation • Concierge Support
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enlarged Lightbox Modal */}
      <AnimatePresence>
        {isEnlarged && snapshots?.[activeView] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsEnlarged(false)}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          >
            <div className="relative max-w-5xl w-full flex flex-col items-center gap-3">
              <div className="w-full flex justify-between items-center text-white px-2">
                <span className="text-sm font-semibold uppercase tracking-wider">
                  {modelInfo.name} — {viewCards.find((v) => v.key === activeView)?.label}
                </span>
                <button
                  onClick={() => setIsEnlarged(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full rounded-xl overflow-hidden border border-white/20 bg-black">
                <img
                  src={snapshots[activeView]}
                  alt="Enlarged view"
                  className="w-full max-h-[75vh] object-contain mx-auto"
                />
              </div>

              {/* View Switcher in Lightbox */}
              <div className="flex items-center gap-2 mt-2">
                {viewCards.map((v) => (
                  <button
                    key={v.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveView(v.key);
                    }}
                    className={`px-3 py-1.5 text-xs rounded border transition-all ${
                      activeView === v.key
                        ? "bg-[#d16b54] text-white border-[#d16b54] font-semibold"
                        : "bg-white/5 hover:bg-white/10 border-white/20 text-white/80"
                    }`}
                  >
                    {v.angle}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout / Commission Modal */}
      <AnimatePresence>
        {showCheckoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-xl w-full bg-[#0d161d] border border-white/15 rounded-2xl p-6 sm:p-8 text-white shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-bold font-drason">Commission Build Reservation</h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    {modelInfo.name} • Total: ${totalPrice.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!orderSubmitted ? (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/60 mb-1 font-medium">Full Name / Entity</label>
                      <input
                        type="text"
                        required
                        placeholder="Johnathan Doe"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-[#d16b54]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white/60 mb-1 font-medium">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="client@luxury.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-[#d16b54]"
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 mb-1 font-medium">Phone / WhatsApp</label>
                        <input
                          type="tel"
                          required
                          placeholder="+1 (555) 019-2834"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-[#d16b54]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/60 mb-1 font-medium">Delivery Destination / City</label>
                      <input
                        type="text"
                        required
                        placeholder="Zurich, Switzerland or Beverly Hills, CA"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-[#d16b54]"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-white/60 font-medium">Reservation Deposit Method ($5,000)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "card"
                            ? "bg-[#d16b54]/20 border-[#d16b54] text-white font-semibold"
                            : "bg-black/20 border-white/10 text-white/70 hover:bg-black/40"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[11px]">Card / Apple Pay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("wire")}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "wire"
                            ? "bg-[#d16b54]/20 border-[#d16b54] text-white font-semibold"
                            : "bg-black/20 border-white/10 text-white/70 hover:bg-black/40"
                        }`}
                      >
                        <Building className="w-4 h-4" />
                        <span className="text-[11px]">Bank Wire Transfer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("crypto")}
                        className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentMethod === "crypto"
                            ? "bg-[#d16b54]/20 border-[#d16b54] text-white font-semibold"
                            : "bg-black/20 border-white/10 text-white/70 hover:bg-black/40"
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        <span className="text-[11px]">Crypto / USDC</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-white/60 block text-[11px]">Deposit Required Today</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">$5,000 USD</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="py-3 px-6 rounded-lg font-bold text-white flex items-center gap-2 shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #e07a5f 0%, #c4553b 100%)",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Reserving Build...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Confirm & Submit Order</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white font-drason">Commission Confirmed!</h4>
                    <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
                      Thank you, <span className="text-white font-semibold">{customerName || "VIP Client"}</span>. Your bespoke build reservation has been entered into the custom production queue.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 max-w-sm mx-auto text-xs space-y-1.5 font-mono text-left">
                    <div className="flex justify-between">
                      <span className="text-white/50">Order Reference:</span>
                      <span className="text-[#d16b54] font-bold">{orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Vehicle Model:</span>
                      <span className="text-white font-semibold">{modelInfo.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Delivery Hub:</span>
                      <span className="text-white">{deliveryCity || "Concierge Handover"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Estimated Completion:</span>
                      <span className="text-emerald-400 font-semibold">6–8 Weeks Handcrafted</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      onClick={handlePrint}
                      className="px-4 py-2 text-xs rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Receipt</span>
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-5 py-2 text-xs rounded-lg bg-[#d16b54] text-white font-bold hover:brightness-110"
                    >
                      Back to Configurator
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

