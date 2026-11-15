"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
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
  Layers,
  Award,
  Paintbrush,
  Palette,
} from "lucide-react";
import { ConfigState, MODELS, DecalConfig } from "./Model";

export interface MultiAngleSnapshots {
  front: string;
  back: string;
  left: string;
  right: string;
}

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
  const [activeView, setActiveView] = useState<
    "front" | "back" | "left" | "right"
  >("front");
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Customer checkout form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "wire" | "crypto"
  >("card");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modelInfo =
    MODELS.find((m) => m.id === config.selectedModel) || MODELS[0];

  // Derived loading state avoids synchronous render cascade inside effects
  const isCapturing = isOpen && Boolean(getSnapshots) && snapshots === null;

  const handleClose = useCallback(() => {
    setShowCheckoutModal(false);
    setOrderSubmitted(false);
    setIsEnlarged(false);
    setSnapshots(null);
    onClose();
  }, [onClose]);

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

  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Lock background scroll when checkout modal or enlarged lightbox is open
  useEffect(() => {
    if (!showCheckoutModal && !isEnlarged) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showCheckoutModal, isEnlarged]);

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
  }, [isOpen, showCheckoutModal, handleClose]);

  if (!isOpen) return null;

  // Customization price calculations
  const basePrice = modelInfo.price || 142700;
  const paintPrice = config.mattePaint ? 4800 : 2500;
  const wheelPrice = 3200;
  const stickerCount = (config.stickers || []).length;
  const decalPrice = stickerCount * 750;
  const destinationCharge = 1850;
  const customizationOnlyPrice =
    paintPrice + wheelPrice + decalPrice + destinationCharge;
  const totalPrice = basePrice + customizationOnlyPrice;

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
    { key: "left" as const, label: "Driver Profile", angle: "Left -90°" },
    { key: "right" as const, label: "Passenger Profile", angle: "Right +90°" },
    {
      key: "back" as const,
      label: "Rear Fascia & Spoiler",
      angle: "Rear 180°",
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-500 bg-black/95 backdrop-blur-2xl text-white flex flex-col font-sans ${
        showCheckoutModal || isEnlarged ? "overflow-hidden" : "overflow-y-auto"
      }`}
    >
      {/* Header Bar */}
      <header className="sticky top-0 z-40 px-6 py-4 border-b border-white/10 bg-[#070d11]/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="text-base font-normal tracking-[0.16em] uppercase"
            style={{ fontFamily: "'Drason', sans-serif" }}
          >
            CUSTOM<span className="text-[#d16b54]">LY-U</span>
          </span>
          <span className="text-xs uppercase tracking-widest text-[#d16b54] font-semibold border-l border-white/20 pl-3">
            Body & Finish Customisation Specification
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
            title="Print Specification Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-white/80" />
            <span>Print Spec Sheet</span>
          </button>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
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
              <span>Bespoke Styling Program</span>
              <span>•</span>
              <span>{modelInfo.brand}</span>
              <span>•</span>
              <span>{modelInfo.year} Edition</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-drason">
              {modelInfo.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/60 max-w-2xl mt-1.5 leading-relaxed">
              Bespoke body styling, custom paintwork, precision forged alloy
              finish, and high-gloss automotive vinyl liveries tailored
              specifically to this build.
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
              <CheckCircle2 className="w-3 h-3" /> Certified Customisation
              Package
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
              {isCapturing
                ? "Rendering 4 Studio Angles..."
                : "Click any angle to view full size"}
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
                  <div className="aspect-16/10 w-full relative flex items-center justify-center bg-[#070b0e] overflow-hidden">
                    {snapUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={snapUrl}
                        alt={`${modelInfo.name} ${view.label}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-white/40">
                        <div className="w-6 h-6 border-2 border-[#d16b54] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-mono uppercase">
                          Rendering {view.label}...
                        </span>
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
          {/* Left Column (2 Cols): Tailored Body & Finish Features */}
          <div className="lg:col-span-2 space-y-6">
            {/* Custom Options Card */}
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#d16b54]" />
                <span>Tailored Body & Finish Options</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Exterior Paint */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Exterior Coachwork Paint
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full border border-white/20 shadow-md shrink-0"
                      style={{ backgroundColor: config.mainColor }}
                    />
                    <span className="font-mono font-semibold text-white text-sm">
                      {config.mainColor}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 uppercase font-medium">
                      {config.mattePaint
                        ? "Satin Matte Finish"
                        : "High-Gloss Clearcoat"}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block">
                    Multi-stage automotive lacquer finish with UV clearcoat
                    shield.
                  </span>
                </div>

                {/* Wheels */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Forged Performance Wheels
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full border border-white/20 shadow-md shrink-0"
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <span className="font-mono font-semibold text-white text-sm">
                      {config.accentColor || "Bespoke Alloy"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 uppercase font-medium">
                      Forged Lightweight
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block">
                    Precision machined forged alloy with custom anodized/painted
                    finish.
                  </span>
                </div>

                {/* Calipers */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Brake Caliper Accent Finish
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full border border-white/20 shadow-md shrink-0"
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <span className="font-semibold text-white text-sm">
                      Custom Accent Enamel
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 uppercase font-medium">
                      High-Temp Enamel
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block">
                    High-temperature ceramic brake caliper finish with gloss
                    protective coat.
                  </span>
                </div>

                {/* Interior */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <span className="text-white/50 block font-mono uppercase text-[10px]">
                    Interior Cockpit Appointments
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-white text-sm">
                      {modelInfo.materialType || "Semi-Aniline Leather"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 uppercase font-medium">
                      Handcrafted
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block">
                    Tailored interior appointments and contrasting upholstery
                    stitching.
                  </span>
                </div>
                {/* Window Tint */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 block font-mono uppercase text-[10px]">
                      Window Tint & Glass
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#d16b54] uppercase font-semibold font-mono">
                      {(config.windowTint || "clear") === "limo"
                        ? "Limo Black (5%)"
                        : (config.windowTint || "clear") === "smoke"
                          ? "Smoke Tint (35%)"
                          : "Factory Clear (70%)"}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block">
                    High-performance UV solar protection cabin glazing with
                    anti-glare finish.
                  </span>
                </div>
                {/* Headlight Lens Treatment */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 block font-mono uppercase text-[10px]">
                      Headlight Lens Treatment
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#d16b54] uppercase font-semibold font-mono">
                      {(config.headlightTint || "clear") === "smoke"
                        ? "Competition Smoked"
                        : (config.headlightTint || "clear") === "yellow"
                          ? "GT3 Endurance Yellow"
                          : "Factory Optical Clear"}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 block">
                    Aerospace-grade polycarbonate lens coating with precision
                    optical transparency.
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Installed Liveries & Decals */}
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#d16b54]" />
                  <span>
                    Installed Decals & Racing Liveries ({stickerCount})
                  </span>
                </h3>
                <span className="text-xs text-white/50 font-mono">
                  High-Gloss Cast Vinyl
                </span>
              </div>

              {stickerCount === 0 ? (
                <div className="p-6 rounded-lg bg-black/20 border border-white/5 text-center text-white/50 text-xs">
                  No vinyl decals currently applied. Add custom liveries from
                  the configurator panel.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(config.stickers || []).map(
                    (st: DecalConfig, idx: number) => {
                      const presetLabel =
                        st.preset === "roof"
                          ? "Top Roof"
                          : st.preset === "hood"
                            ? "Front Hood"
                            : st.preset === "leftDoor"
                              ? "Driver Door (Left)"
                              : st.preset === "rightDoor"
                                ? "Passenger Door (Right)"
                                : "Custom Body Panel";
                      return (
                        <div
                          key={st.id}
                          className="p-3 rounded-lg bg-black/30 border border-white/5 flex items-center gap-3"
                        >
                          <div className="w-12 h-12 rounded bg-black/40 border border-white/10 p-1 flex items-center justify-center shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                              Placement: {presetLabel}
                            </span>
                            <span className="text-[9px] text-white/40 block">
                              Finish: Ultra-Gloss Cast Vinyl
                            </span>
                            {st.mirrored && (
                              <span className="text-[9px] text-amber-400/90 font-medium block">
                                • Mirrored to opposite side
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            {/* Customization Surface & Craftsmanship Standard */}
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-[#d16b54]" />
                <span>Coachwork Finishing & Application Standards</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <span className="font-semibold text-white text-xs block">
                    Surface Preparation
                  </span>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Full paint decontamination, clay bar treatment, and
                    single-stage polish before finish application.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <span className="font-semibold text-white text-xs block">
                    Automotive Cast Vinyl
                  </span>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Premium cast vinyl with micro-air channels, heat-set edge
                    sealing, and UV protective high-gloss overlaminate.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-black/25 border border-white/5 space-y-1">
                  <span className="font-semibold text-white text-xs block">
                    Quality Inspection
                  </span>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Precision alignment under dual 5000K inspection lights and
                    multi-point quality certification.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Pricing Summary & Commission Order CTA */}
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-[#0b141b]/90 p-5 space-y-5 sticky top-20">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90 pb-3 border-b border-white/10">
                Customisation Investment Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    Base Vehicle Platform ({modelInfo.name})
                  </span>
                  <span className="font-mono font-semibold">
                    ${basePrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    Bespoke Paint Finish (
                    {config.mattePaint ? "Satin Matte" : "Gloss Clearcoat"})
                  </span>
                  <span className="font-mono font-semibold">
                    ${paintPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    Custom Forged Alloy Rims
                  </span>
                  <span className="font-mono font-semibold">
                    ${wheelPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    Bespoke Vinyl Decals ({stickerCount})
                  </span>
                  <span className="font-mono font-semibold">
                    ${decalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    Surface Prep, Clearcoat Protection & Prep
                  </span>
                  <span className="font-mono font-semibold">
                    ${destinationCharge.toLocaleString()}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-bold text-white block">
                      Total Investment
                    </span>
                    <span className="text-[10px] text-white/50">
                      Includes full vehicle build and bespoke customisation
                    </span>
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
                  className="w-full py-3.5 px-4 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(135deg, #e07a5f 0%, #c4553b 100%)",
                    boxShadow: "0 6px 20px rgba(209, 107, 84, 0.4)",
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Proceed to Commission Order</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Secure Bespoke Build Reservation • Concierge Support
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enlarged Image Lightbox */}
      {hasMounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isEnlarged && snapshots && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-9999 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8"
                onClick={() => setIsEnlarged(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="relative max-w-6xl w-full flex flex-col items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full flex items-center justify-between text-white">
                    <div>
                      <span className="text-xs uppercase font-mono text-[#d16b54] tracking-widest block">
                        Bespoke 3D Studio Render
                      </span>
                      <h3 className="text-lg font-bold">
                        {modelInfo.name} —{" "}
                        {viewCards.find((v) => v.key === activeView)?.label}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsEnlarged(false)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-full rounded-xl overflow-hidden border border-white/20 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        onClick={() => setActiveView(v.key)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                          activeView === v.key
                            ? "bg-[#d16b54] text-white"
                            : "bg-white/10 hover:bg-white/20 text-white/70"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Checkout / Commission Modal */}
      {hasMounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showCheckoutModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-9999 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative max-w-lg w-full bg-[#0c161d] border border-white/15 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-white my-8"
                >
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {!orderSubmitted ? (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-[#d16b54] font-semibold tracking-wider uppercase">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Custom Commission Order</span>
                        </div>
                        <h3 className="text-xl font-bold">
                          Reserve Your Bespoke Build
                        </h3>
                        <p className="text-xs text-white/60">
                          Submit your reservation to commission this{" "}
                          {modelInfo.name} with your custom finish and liveries.
                        </p>
                      </div>

                      {/* Summary Snapshot Bar */}
                      <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold block">
                            {modelInfo.name}
                          </span>
                          <span className="text-[11px] text-white/50">
                            {config.mattePaint ? "Satin Matte" : "Gloss"} •{" "}
                            {stickerCount} Livery Decal
                            {stickerCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-base text-[#d16b54]">
                          ${totalPrice.toLocaleString()}
                        </span>
                      </div>

                      <form
                        onSubmit={handleCheckoutSubmit}
                        className="space-y-4 text-xs"
                      >
                        <div className="space-y-1.5">
                          <label className="font-semibold text-white/80">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="e.g. Alexander Vance"
                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 focus:border-[#d16b54] focus:outline-none text-white text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-semibold text-white/80">
                              Email Address
                            </label>
                            <input
                              type="email"
                              required
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              placeholder="client@bespoke.com"
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 focus:border-[#d16b54] focus:outline-none text-white text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-semibold text-white/80">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              required
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="+1 (555) 019-2834"
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 focus:border-[#d16b54] focus:outline-none text-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-semibold text-white/80">
                            Delivery City & Country
                          </label>
                          <input
                            type="text"
                            required
                            value={deliveryCity}
                            onChange={(e) => setDeliveryCity(e.target.value)}
                            placeholder="e.g. Zurich, Switzerland / Dubai, UAE"
                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 focus:border-[#d16b54] focus:outline-none text-white text-xs"
                          />
                        </div>

                        {/* Payment Method Selector */}
                        <div className="space-y-2 pt-1">
                          <label className="font-semibold text-white/80 block">
                            Commission Deposit Method
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              {
                                id: "card" as const,
                                label: "Credit Card",
                                icon: CreditCard,
                              },
                              {
                                id: "wire" as const,
                                label: "Bank Wire",
                                icon: Building,
                              },
                              {
                                id: "crypto" as const,
                                label: "Crypto / USDC",
                                icon: ShieldCheck,
                              },
                            ].map((m) => {
                              const Icon = m.icon;
                              const active = paymentMethod === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setPaymentMethod(m.id)}
                                  className={`py-2 px-2.5 rounded-lg border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                    active
                                      ? "border-[#d16b54] bg-[#d16b54]/20 text-white font-semibold"
                                      : "border-white/10 hover:border-white/25 bg-black/30 text-white/70"
                                  }`}
                                >
                                  <Icon className="w-4 h-4 text-[#d16b54]" />
                                  <span className="text-[10px]">{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3 rounded-lg font-bold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-2 mt-4 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
                          style={{
                            background:
                              "linear-gradient(135deg, #e07a5f 0%, #c4553b 100%)",
                            boxShadow: "0 4px 15px rgba(209, 107, 84, 0.4)",
                          }}
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Processing Commission...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Place Commission Deposit ($5,000)</span>
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="py-6 text-center space-y-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div>
                        <h3 className="text-xl font-bold">
                          Commission Reserved!
                        </h3>
                        <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
                          Thank you,{" "}
                          <strong className="text-white">
                            {customerName || "Collector"}
                          </strong>
                          . Your bespoke build commission has been registered.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-lg bg-black/50 border border-white/10 text-xs text-left space-y-1.5 max-w-sm mx-auto">
                        <div className="flex justify-between">
                          <span className="text-white/50">Reference:</span>
                          <span className="font-mono font-bold text-[#d16b54]">
                            {orderId}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Vehicle:</span>
                          <span className="font-semibold">
                            {modelInfo.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">
                            Production Slot:
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            6–8 Weeks Handcrafted
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-center pt-2">
                        <button
                          onClick={handlePrint}
                          className="px-4 py-2 text-xs rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Receipt</span>
                        </button>
                        <button
                          onClick={handleClose}
                          className="px-5 py-2 text-xs rounded-lg bg-[#d16b54] text-white font-bold hover:brightness-110 cursor-pointer"
                        >
                          Back to Configurator
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
