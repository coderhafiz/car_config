"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  sublabel?: string;
  accentColor?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  sublabel,
  accentColor = "#d16b54",
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative overflow-hidden rounded-2xl glass border border-glass-border p-5.5 shadow-2xl transition-all duration-300 hover:border-white/30 hover:shadow-cyan-950/20 ${
        onClick
          ? "cursor-pointer hover:scale-[1.015] active:scale-[0.99]"
          : ""
      }`}
    >
      {/* Top subtle glow bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-80"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#d2e2ea]/60">
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-glass-border backdrop-blur-md"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
          {value}
        </h3>

        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
              trend === "up"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{change}</span>
          </div>

          {sublabel && (
            <span className="text-[11px] text-[#d2e2ea]/50">{sublabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

