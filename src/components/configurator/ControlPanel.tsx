"use client";

import { MODELS, ConfigState, preloadCarModel, DEFAULT_STICKERS, DecalConfig } from "./Model";
import { Dispatch, SetStateAction, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Eye, Sofa, Upload, Trash2, Crosshair, Plus } from "lucide-react";
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
  const activeSticker = useMemo(() => {
    const stickers = config.stickers || [];
    return stickers.find((s) => s.id === config.activeStickerId) || stickers[0] || null;
  }, [config.stickers, config.activeStickerId]);

  const handleAddNewSticker = (template?: { id?: string; url: string; name: string }) => {
    const tmpl = template || DEFAULT_STICKERS[0];
    const existingPresets = new Set((config.stickers || []).map((s) => s.preset));
    const candidatePresets: Array<"hood" | "roof" | "rightDoor" | "leftDoor"> = [
      "hood",
      "roof",
      "rightDoor",
      "leftDoor",
    ];
    const nextPreset = candidatePresets.find((p) => !existingPresets.has(p)) || "roof";

    const existingIds = new Set((config.stickers || []).map((s) => s.id));
    let count = (config.stickers || []).length + 1;
    let uniqueId = `sticker-${tmpl.id || "decal"}-${count}`;
    while (existingIds.has(uniqueId)) {
      count++;
      uniqueId = `sticker-${tmpl.id || "decal"}-${count}`;
    }
    const newSticker: DecalConfig = {
      id: uniqueId,
      name: tmpl.name,
      textureUrl: tmpl.url,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [34, 34, 16],
      preset: nextPreset,
      mirrored: false,
    };

    setConfig((prev) => ({
      ...prev,
      stickers: [...(prev.stickers || []), newSticker],
      activeStickerId: uniqueId,
    }));
  };

  const handleSelectSticker = (stickerId: string, url: string, name: string) => {
    if (activeSticker) {
      // Update active sticker graphic
      setConfig((prev) => ({
        ...prev,
        stickers: (prev.stickers || []).map((s) =>
          s.id === activeSticker.id ? { ...s, textureUrl: url, name } : s
        ),
      }));
    } else {
      // Create new sticker
      handleAddNewSticker({ id: stickerId, url, name });
    }
  };

  const handleApplyPreset = (presetKey: "roof" | "hood" | "leftDoor" | "rightDoor") => {
    if (!activeSticker) return;
        const preset = carPresets[presetKey];
    if (!preset) return;

    const isDoor = presetKey === "leftDoor" || presetKey === "rightDoor";

    setConfig((prev) => ({
      ...prev,
      stickers: (prev.stickers || []).map((s) =>
        s.id === activeSticker.id
          ? {
              ...s,
              position: [...preset.position],
              rotation: [...preset.rotation],
              scale: [activeSticker.scale[0], activeSticker.scale[1], preset.scale[2]],
              preset: presetKey,
              mirrored: isDoor ? s.mirrored : false,
            }
          : s
      ),
    }));
  };

  const updateActiveSticker = (partial: Partial<DecalConfig>) => {
    if (!activeSticker) return;
    setConfig((prev) => ({
      ...prev,
      stickers: (prev.stickers || []).map((s) =>
        s.id === activeSticker.id ? { ...s, ...partial } : s
      ),
    }));
  };

  const handleDeleteActiveSticker = () => {
    if (!activeSticker) return;
    setConfig((prev) => {
      const next = (prev.stickers || []).filter((s) => s.id !== activeSticker.id);
      return {
        ...prev,
        stickers: next,
        activeStickerId: next[0]?.id || null,
      };
    });
  };

  const handleCustomStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const existingPresets = new Set((config.stickers || []).map((s) => s.preset));
      const candidatePresets: Array<"hood" | "roof" | "rightDoor" | "leftDoor"> = [
        "hood",
        "roof",
        "rightDoor",
        "leftDoor",
      ];
      const nextPreset = candidatePresets.find((p) => !existingPresets.has(p)) || "roof";

      const existingIds = new Set((config.stickers || []).map((s) => s.id));
      let count = (config.stickers || []).length + 1;
      const baseName = file.name.replace(/[^a-zA-Z0-9]/g, "");
      let uniqueId = `upload-${baseName}-${count}`;
      while (existingIds.has(uniqueId)) {
        count++;
        uniqueId = `upload-${baseName}-${count}`;
      }
      const newSticker: DecalConfig = {
        id: uniqueId,
        name: file.name.replace(/\.[^/.]+$/, ""),
        textureUrl: dataUrl,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [34, 34, 16],
        preset: nextPreset,
        mirrored: false,
      };
      setConfig((prev) => ({
        ...prev,
        stickers: [...(prev.stickers || []), newSticker],
        activeStickerId: newSticker.id,
      }));
    };
    reader.readAsDataURL(file);
  };

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

      {/* ── Custom Stickers & Decals (three-mesh-bvh) ── */}
      <Folder
        key={`Decals-${isLandscape}`}
        title="Custom Stickers & Decals"
        defaultOpen={false}
      >
        <div className="space-y-3 pt-1 pb-2">
          {/* Header & Upload Button */}
          <div className="flex items-center justify-between text-xs text-text-sub font-medium">
            <span>Sticker Gallery</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-brand hover:underline font-semibold text-[11px]">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom Logo</span>
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={handleCustomStickerUpload}
              />
            </label>
          </div>

          {/* Curated Stickers Grid */}
          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_STICKERS.map((st) => (
              <button
                key={st.id}
                onClick={() => handleSelectSticker(st.id, st.url, st.name)}
                className={`p-1.5 rounded-[4px] border flex flex-col items-center gap-1 transition-all ${
                  activeSticker?.textureUrl === st.url
                    ? "border-brand bg-brand/10 ring-1 ring-brand"
                    : "border-border-glass glass glass-hover"
                }`}
                title={st.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={st.url}
                  alt={st.name}
                  className="w-10 h-10 object-contain drop-shadow"
                />
                <span className="text-[10px] text-text-sub truncate w-full text-center">
                  {st.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Button to add another decal to car */}
          {activeSticker && (
            <button
              onClick={() => handleAddNewSticker()}
              className="w-full py-1.5 px-3 text-xs rounded-[3px] border border-dashed border-brand/60 hover:border-brand text-brand glass glass-hover flex items-center justify-center gap-1.5 font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Decal to Car</span>
            </button>
          )}

          {activeSticker && (
            <div className="mt-3 pt-3 border-t border-border-glass space-y-3">
              {/* Placed Stickers Tabs */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-sub uppercase tracking-wider mb-1.5">
                  <span>Vehicle Decals ({config.stickers?.length || 0})</span>
                  <button
                    onClick={() => handleAddNewSticker()}
                    className="flex items-center gap-1 text-brand hover:underline font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {(config.stickers || []).map((st, idx) => {
                    const presetLabel =
                      st.preset === "roof"
                        ? "Roof"
                        : st.preset === "hood"
                        ? "Hood"
                        : st.preset === "rightDoor"
                        ? "R-Door"
                        : st.preset === "leftDoor"
                        ? "L-Door"
                        : "Custom";
                    return (
                      <button
                        key={st.id}
                        onClick={() => setConfig((p) => ({ ...p, activeStickerId: st.id }))}
                        className={`px-2.5 py-1 text-xs rounded-[3px] border flex items-center gap-1.5 whitespace-nowrap transition-all ${
                          st.id === activeSticker?.id
                            ? "bg-brand text-white border-brand font-semibold shadow-sm"
                            : "glass glass-hover border-border-glass text-text-sub"
                        }`}
                      >
                        <span>#{idx + 1}</span>
                        <span className="truncate max-w-[80px]">{st.name?.split(" ")[0] || "Decal"}</span>
                        <span className="text-[10px] opacity-75">({presetLabel})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preset Snapping (Top & Sides) */}
              <div>
                <span className="text-[11px] font-semibold text-text-sub uppercase tracking-wider block mb-1.5">
                  Placement Presets
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleApplyPreset("roof")}
                    className={`py-1.5 px-2 text-xs rounded-[3px] border transition-all text-center ${
                      activeSticker.preset === "roof"
                        ? "bg-brand text-white border-brand font-semibold"
                        : "glass glass-hover border-border-glass text-text-main"
                    }`}
                  >
                    Top (Roof)
                  </button>
                  <button
                    onClick={() => handleApplyPreset("hood")}
                    className={`py-1.5 px-2 text-xs rounded-[3px] border transition-all text-center ${
                      activeSticker.preset === "hood"
                        ? "bg-brand text-white border-brand font-semibold"
                        : "glass glass-hover border-border-glass text-text-main"
                    }`}
                  >
                    Front Hood
                  </button>
                  <button
                    onClick={() => handleApplyPreset("leftDoor")}
                    className={`py-1.5 px-2 text-xs rounded-[3px] border transition-all text-center ${
                      activeSticker.preset === "leftDoor"
                        ? "bg-brand text-white border-brand font-semibold"
                        : "glass glass-hover border-border-glass text-text-main"
                    }`}
                  >
                    Driver Door (Left)
                  </button>
                  <button
                    onClick={() => handleApplyPreset("rightDoor")}
                    className={`py-1.5 px-2 text-xs rounded-[3px] border transition-all text-center ${
                      activeSticker.preset === "rightDoor"
                        ? "bg-brand text-white border-brand font-semibold"
                        : "glass glass-hover border-border-glass text-text-main"
                    }`}
                  >
                    Passenger Door (Right)
                  </button>
                </div>
              </div>

              {/* BVH Surface Raycast Placement Button */}
              <button
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    stickerPlacementMode: !p.stickerPlacementMode,
                  }))
                }
                className={`w-full py-2 px-3 text-xs rounded-[3px] border flex items-center justify-center gap-2 transition-all font-medium ${
                  config.stickerPlacementMode
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30 animate-pulse"
                    : "glass glass-hover border-border-glass text-text-main"
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>
                  {config.stickerPlacementMode
                    ? "Click anywhere on vehicle body..."
                    : "Click to Place / Drag on Body"}
                </span>
              </button>

              {/* Size Slider */}
              <SliderRow
                label="Sticker Size"
                value={activeSticker.scale[0]}
                min={12}
                max={60}
                step={1}
                onChange={(val) => {
                  const ratio = activeSticker.scale[1] / activeSticker.scale[0] || 1;
                  updateActiveSticker({
                    scale: [val, Math.round(val * ratio), activeSticker.scale[2]],
                  });
                }}
              />

              {/* Rotation Slider */}
              <SliderRow
                label="Sticker Rotation"
                value={Math.round((activeSticker.rotation[2] * 180) / Math.PI)}
                min={-180}
                max={180}
                step={1}
                onChange={(val) => {
                  const rad = (val * Math.PI) / 180;
                  updateActiveSticker({
                    rotation: [activeSticker.rotation[0], activeSticker.rotation[1], rad],
                  });
                }}
              />

              {/* Mirror Toggle */}
              <ToggleRow
                label="Mirror to Opposite Door"
                value={Boolean(activeSticker.mirrored)}
                onChange={(v) => updateActiveSticker({ mirrored: v })}
              />

              {/* Remove button */}
              <button
                onClick={handleDeleteActiveSticker}
                className="w-full py-1.5 text-xs text-red-500 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-[3px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Active Sticker</span>
              </button>
            </div>
          )}
        </div>
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
            <span className="text-[9px] tracking-[0.22em] text-text-muted font-semibold">
              {activeModel.brand.toUpperCase()} · customly-U
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
