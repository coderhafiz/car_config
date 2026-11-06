"use client";

import { MODELS, ConfigState, preloadCarModel } from "./Model";
import { Dispatch, SetStateAction, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Eye, Sofa } from "lucide-react";
import { useTheme } from "../ui/ThemeProvider";
import { useSafari } from "@/hooks/useSafari";

// ─── Car color palette ────────────────────────────────────────────────────────
const BODY_COLORS = [
  { name: "Pearl White", hex: "#F5F5F0" },
  { name: "Obsidian Black", hex: "#0a0a0a" },
  { name: "Nardo Grey", hex: "#8D8D8D" },
  { name: "Misano Red", hex: "#B22222" },
  { name: "Navarra Blue", hex: "#1B2A6B" },
  { name: "Java Green", hex: "#3D5A32" },
  { name: "Sambarot Orange", hex: "#C85A00" },
  { name: "Daytona Grey", hex: "#5A5A5A" },
];

const MATTE_BODY_COLORS = [
  { name: "Frozen White (Matte)", hex: "#F0F1EE" },
  { name: "Stealth Black (Matte)", hex: "#161618" },
  { name: "Matt Nardo Grey", hex: "#7C8085" },
  { name: "Velvet Red (Matte)", hex: "#9E1B20" },
  { name: "Frozen Blue (Matte)", hex: "#192341" },
  { name: "Military Olive (Matte)", hex: "#333F2E" },
  { name: "Desert Sand (Matte)", hex: "#B88E62" },
  { name: "Frozen Dark Grey (Matte)", hex: "#46484C" },
];

const WHEEL_COLORS = [
  { name: "Brushed Silver", hex: "#D4D8DD" },
  { name: "Titanium Grey", hex: "#7A8088" },
  { name: "Gunmetal Metallic", hex: "#43484F" },
  { name: "Champagne Gold", hex: "#D4AF37" },
  { name: "Satin Bronze", hex: "#9C7044" },
  { name: "Rose Copper", hex: "#B86B4B" },
  { name: "Cobalt Blue Metallic", hex: "#2B547E" },
  { name: "Crimson Metallic", hex: "#8B1E24" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Folder({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mb-3 border-b border-(--glass-border) pb-3 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-left group"
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{
            color: isDark
              ? "rgba(210, 226, 234, 0.72)"
              : "rgba(11, 20, 24, 0.65)",
          }}
        >
          {title}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform shrink-0 ${open ? "" : "-rotate-90"}`}
          style={{
            color: isDark
              ? "rgba(210, 226, 234, 0.55)"
              : "rgba(11, 20, 24, 0.45)",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-1.5 px-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const display = step < 1 ? value.toFixed(2) : Math.round(value).toString();
  const labelColor = isDark ? "#edf2f4" : "#0b1418";
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const emptyTrack = isDark
    ? "rgba(175, 212, 228, 0.2)"
    : "rgba(20, 45, 56, 0.2)";

  return (
    <div className="flex items-center gap-3 px-3 py-2 landscape-optimized-row">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.12em] w-24 sm:w-28 shrink-0 truncate"
        style={{ color: labelColor }}
      >
        {label}
      </span>
      <div className="relative flex-1 h-5 flex items-center">
        {/* Thin 2px track line */}
        <div
          className="w-full h-0.5 rounded-full overflow-hidden"
          style={{ backgroundColor: emptyTrack }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: "var(--brand-secondary)",
            }}
          />
        </div>
        {/* Thumb */}
        <div
          className="absolute w-3 h-3 rounded-full pointer-events-none shadow-md"
          style={{
            left: `calc(${pct}% - 6px)`,
            backgroundColor: "var(--brand-secondary)",
            border: "1.5px solid #edf2f4",
          }}
        />
        {/* Interactive native range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
        />
      </div>
      <span
        className="hidden sm:block text-[11px] font-mono w-10 text-right tabular-nums opacity-75"
        style={{ color: labelColor }}
      >
        {display}
      </span>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  const labelColor = theme === "dark" ? "#edf2f4" : "#0b1418";
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 landscape-optimized-row">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.12em] shrink-0 truncate"
        style={{ color: labelColor }}
      >
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-4.5 rounded-xs transition-colors border ${
          value
            ? "border-brand-secondary"
            : theme === "dark"
              ? "bg-white/10 border-white/15"
              : "bg-black/10 border-black/15"
        }`}
        style={value ? { backgroundColor: "rgba(209, 107, 84, 0.35)" } : {}}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-[1px] transition-transform ${
            value ? "translate-x-4 bg-[#edf2f4]" : "bg-white/60"
          }`}
        />
      </button>
    </div>
  );
}

/** Horizontal swatch row styled after Ceer Motors bevelled swatch tiles */
function ColorSwatchRow({
  label,
  swatches,
  current,
  onSelect,
  metallic = false,
  isGroupActive = true,
}: {
  label: string;
  swatches: { name: string; hex: string }[];
  current: string;
  onSelect: (hex: string) => void;
  metallic?: boolean;
  isGroupActive?: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const matchedSwatch = swatches.find((s) => s.hex.toLowerCase() === current.toLowerCase());
  const activeColorName =
    isGroupActive && matchedSwatch
      ? matchedSwatch.name
      : isGroupActive
        ? "Custom"
        : "";

  return (
    <div
      className="px-3 py-3 rounded-[3px] landscape-optimized-row"
      style={{
        background: isDark
          ? "rgba(9, 18, 23, 0.45)"
          : "rgba(255, 255, 255, 0.55)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{
            color: isDark ? "rgba(210,226,234,0.7)" : "rgba(11,20,24,0.65)",
          }}
        >
          {label}
        </span>
        {isGroupActive && (
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block shadow-xs"
              animate={{ backgroundColor: current }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={activeColorName}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: 0.2 }}
                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--text-main)" }}
              >
                {activeColorName}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {swatches.map((color) => {
          const isActive = isGroupActive && current.toLowerCase() === color.hex.toLowerCase();
          return (
            <button
              key={color.hex}
              title={color.name}
              onClick={() => onSelect(color.hex)}
              className="relative w-8 h-7 sm:w-9 sm:h-7 rounded-xs transition-all duration-200 hover:scale-105 focus:outline-none shrink-0 overflow-hidden"
              style={{
                backgroundColor: color.hex,
                backgroundImage: metallic
                  ? "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.05) 45%, rgba(0,0,0,0.45) 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.4) 100%)",
                border: isActive
                  ? "1px solid var(--brand-secondary)"
                  : "1px solid rgba(255,255,255,0.18)",
                boxShadow: isActive
                  ? "0 0 0 1px var(--brand-secondary), 0 4px 12px rgba(0,0,0,0.5)"
                  : "none",
              }}
            >
              {isActive && (
                <motion.span
                  layoutId={`active-swatch-${label}`}
                  className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--brand-secondary)" }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── View Mode Toggle (Ceer Motors bottom tab style) ──────────────────────────

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: "exterior" | "interior";
  onChange: (mode: "exterior" | "interior") => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="grid grid-cols-2 border-t border-(--glass-border)">
      {(["exterior", "interior"] as const).map((mode) => {
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`flex items-center justify-center gap-2 py-3.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-200 ${
              active
                ? "text-text-main"
                : isDark
                  ? "text-white/45 hover:text-white/75"
                  : "text-black/45 hover:text-black/75"
            }`}
            style={{
              background: active
                ? isDark
                  ? "rgba(38, 66, 78, 0.72)"
                  : "rgba(20, 45, 56, 0.12)"
                : isDark
                  ? "rgba(9, 17, 22, 0.55)"
                  : "rgba(0, 0, 0, 0.03)",
              borderBottom: active
                ? "2px solid var(--brand-secondary)"
                : "2px solid transparent",
            }}
          >
            {mode === "exterior" ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <Sofa className="w-3.5 h-3.5" />
            )}
            {mode}
          </button>
        );
      })}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ControlPanelProps {
  config: ConfigState;
  setConfig: Dispatch<SetStateAction<ConfigState>>;
  onModelChange: (id: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ControlPanel({
  config,
  setConfig,
  onModelChange,
  isCollapsed,
  setIsCollapsed,
}: ControlPanelProps) {
  const isSafari = useSafari();

  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsLandscape(window.innerWidth > 640 && window.innerHeight < 700);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const activeModel = useMemo(
    () => MODELS.find((m) => m.id === config.selectedModel) || MODELS[0],
    [config.selectedModel],
  );

  // Car selection: group by brand
  const brandGroups = useMemo(() => {
    const groups: Record<string, typeof MODELS> = {};
    MODELS.forEach((m) => {
      if (!groups[m.brand]) groups[m.brand] = [];
      groups[m.brand].push(m);
    });
    return groups;
  }, []);

  const innerContent = (
    <div className="px-1 py-1">
      {/* ── Model Selection (Ceer Variant Card Style) ── */}
      <Folder key={`Models-${isLandscape}`} title="Variant" defaultOpen={true}>
        {Object.entries(brandGroups).map(([brand, models]) => (
          <div key={brand} className="pb-2">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.25em] px-1 py-1 mb-1"
              style={{ color: "var(--brand-primary)" }}
            >
              {brand}
            </p>
            <div className="space-y-2">
              {models.map((m) => {
                const isActive = config.selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    id={`car-select-${m.id}`}
                    onClick={() => onModelChange(m.id)}
                    onMouseEnter={() => preloadCarModel(m.url)}
                    onFocus={() => preloadCarModel(m.url)}
                    className="w-full text-left px-3.5 py-3 rounded-[3px] transition-all duration-200 flex items-center justify-between group"
                    style={{
                      background: isActive
                        ? isDark
                          ? "rgba(22, 42, 52, 0.72)"
                          : "rgba(255, 255, 255, 0.85)"
                        : isDark
                          ? "rgba(9, 18, 23, 0.45)"
                          : "rgba(255, 255, 255, 0.45)",
                      border: isActive
                        ? "1px solid rgba(209, 107, 84, 0.75)"
                        : "1px solid var(--glass-border)",
                      boxShadow: isActive
                        ? "inset 0 0 24px rgba(209, 107, 84, 0.08)"
                        : "none",
                    }}
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.12em]">
                        {m.name}
                      </div>
                      <div
                        className="text-[10px] font-medium mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {m.year} Edition · {m.materialType}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold tabular-nums">
                        ${m.price.toLocaleString()}
                      </div>
                      {isActive && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full mt-1"
                          style={{ backgroundColor: "var(--brand-secondary)" }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Folder>

      {/* ── Body Color ── */}
      <Folder
        key={`BodyColor-${isLandscape}`}
        title="Exterior"
        defaultOpen={!isLandscape}
      >
        <div className="space-y-2.5">
          <ColorSwatchRow
            label="Metallic Paint"
            swatches={BODY_COLORS}
            current={config.mainColor}
            metallic={true}
            isGroupActive={!config.mattePaint}
            onSelect={(hex) =>
              setConfig((p) => ({ ...p, mainColor: hex, mattePaint: false }))
            }
          />
          <ColorSwatchRow
            label="Matte Paint"
            swatches={MATTE_BODY_COLORS}
            current={config.mainColor}
            metallic={false}
            isGroupActive={Boolean(config.mattePaint)}
            onSelect={(hex) =>
              setConfig((p) => ({ ...p, mainColor: hex, mattePaint: true }))
            }
          />
        </div>
      </Folder>

      {/* ── Wheels ── */}
      <Folder
        key={`Wheels-${isLandscape}`}
        title="Wheels"
        defaultOpen={!isLandscape}
      >
        <ColorSwatchRow
          label="Alloy Finish"
          swatches={WHEEL_COLORS}
          current={config.accentColor}
          metallic={true}
          onSelect={(hex) => setConfig((p) => ({ ...p, accentColor: hex }))}
        />
      </Folder>

      {/* ── View Settings ── */}
      <Folder
        key={`View-${isLandscape}`}
        title="Environment"
        defaultOpen={!isLandscape}
      >
        {/* Zoom level and studio light controls hidden for now */}
        {false && (
          <>
            <SliderRow
              label="Zoom Level"
              value={config.zoom}
              min={100}
              max={1000}
              step={1}
              onChange={(v) => setConfig((p) => ({ ...p, zoom: v }))}
            />
            <SliderRow
              label="Studio Light"
              value={config.lightIntensity}
              min={0}
              max={10}
              step={0.1}
              onChange={(v) => setConfig((p) => ({ ...p, lightIntensity: v }))}
            />
          </>
        )}
        <ToggleRow
          label="Auto Rotate"
          value={config.isAnimated && config.viewMode === "exterior"}
          onChange={(v) =>
            setConfig((p) => ({
              ...p,
              isAnimated: v,
              viewMode: v ? "exterior" : p.viewMode,
            }))
          }
        />
      </Folder>
    </div>
  );

  return (
    <div className="fixed bottom-0 sm:bottom-auto sm:top-24 left-0 w-full sm:left-auto sm:right-6 sm:w-102 z-40 select-none landscape-optimized-panel">
      {/* Mobile pan hint */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none sm:hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 glass rounded-[3px] flex items-center gap-2 whitespace-nowrap border border-(--glass-border) shadow-xl"
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--brand-secondary)" }}
          />
          <p className="text-[9px] font-semibold text-text-muted uppercase tracking-[0.2em]">
            Drag to rotate vehicle
          </p>
        </motion.div>
      </div>

      {/* Ceer Motors inspired architectural glass panel */}
      <div className="glass rounded-t-sm rounded-b-none sm:rounded-sm p-0 shadow-2xl flex flex-col sm:max-h-[calc(100dvh-120px)] overflow-hidden will-change-transform">
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b border-(--glass-border) flex items-center justify-between cursor-pointer group"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-[0.14em] text-text-main leading-tight">
              {activeModel.name}
            </h2>
            <span className="text-[9px] uppercase tracking-[0.22em] text-text-muted font-semibold">
              {activeModel.brand} · Khaz Customs
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile price display inside config panel header */}
            <div className="text-right sm:hidden">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-sm font-bold tabular-nums text-text-main leading-none">
                  ${activeModel.price.toLocaleString()}
                </span>
              </div>
              <span className="block text-[8px] uppercase tracking-[0.18em] text-text-muted font-semibold mt-0.5">
                Total Base Price
              </span>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-xs border border-(--glass-border) hover:bg-white/10 transition-colors"
            >
              {isSafari ? (
                <ChevronUp
                  className={`w-3.5 h-3.5 text-text-main transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`}
                />
              ) : isCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5 text-text-main" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-text-main" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        {isSafari ? (
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
            style={{ willChange: "grid-template-rows, opacity" }}
          >
            <div
              className="overflow-hidden overflow-y-auto custom-scrollbar px-3 max-h-[calc(45vh-80px)] sm:max-h-none min-h-0"
              style={{ overflowX: "hidden" }}
            >
              <div className="py-3">{innerContent}</div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={false}
            animate={{
              height: isCollapsed ? 0 : "auto",
              opacity: isCollapsed ? 0 : 1,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden overflow-y-auto custom-scrollbar px-3 py-3 max-h-[calc(45vh-80px)] sm:max-h-none min-h-0"
            style={{ overflowX: "hidden" }}
          >
            {innerContent}
          </motion.div>
        )}

        {/* Ceer-style Total Summary + Exterior/Interior Tab Footer */}
        {!isCollapsed && (
          <div
            className="border-t border-(--glass-border)"
            style={{
              background: isDark
                ? "rgba(8, 16, 21, 0.55)"
                : "rgba(255, 255, 255, 0.65)",
            }}
          >
            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold tracking-wide text-text-main">
                  Total ${activeModel.price.toLocaleString()}
                </div>
                <div className="text-[9px] uppercase tracking-[0.16em] text-text-muted">
                  Bespoke Custom Specification
                </div>
              </div>
              <span className="px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] border border-(--glass-border) rounded-xs text-text-main">
                {activeModel.year} Spec
              </span>
            </div>

            <ViewModeToggle
              viewMode={config.viewMode}
              onChange={(mode) =>
                setConfig((p) => ({
                  ...p,
                  viewMode: mode,
                  isAnimated: mode === "exterior" ? p.isAnimated : false,
                }))
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
