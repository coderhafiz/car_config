"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Eye,
  Clock,
  AlertTriangle,
  RefreshCw,
  Monitor,
} from "lucide-react";
import {
  fetchAllRealEvents,
  computeRealFunnel,
  RealFunnelData,
} from "@/lib/realAnalytics";

export default function ConfiguratorFunnelPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [funnel, setFunnel] = useState<RealFunnelData>({
    totalVisitors: 0,
    stages: [],
    cameraAngles: [],
    deviceViews: [],
  });

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const events = await fetchAllRealEvents();
      const data = computeRealFunnel(events);
      setFunnel(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchAllRealEvents().then((events) => {
      if (isMounted) {
        setFunnel(computeRealFunnel(events));
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Activity className="w-7 h-7 text-[#d16b54]" />
            <span>Customer Journey</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            See where visitors leave the configurator and how they explore the
            car in 3D.
          </p>
        </div>

        <button
          onClick={refreshData}
          title="Refresh funnel"
          className="p-2 rounded-xl glass border border-glass-border text-[#d2e2ea]/70 hover:text-white transition flex items-center gap-1.5 text-xs self-start sm:self-auto shadow-lg"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#d16b54]" : ""}`}
          />
          <span>Sync</span>
        </button>
      </div>

      {/* 5-Step Funnel Visualizer */}
      <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-glass-border">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Step-by-Step Drop-off
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Tracking {funnel.totalVisitors} real visitors through each step of
              building a car.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {funnel.stages[3] && funnel.totalVisitors > 0
              ? `${((funnel.stages[3].visitors / funnel.totalVisitors) * 100).toFixed(1)}% Reach Spec Sheet`
              : "0% Reach Spec Sheet"}
          </span>
        </div>

        {/* Funnel Steps Horizontal / Vertical Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnel.stages.map((f) => (
            <div
              key={f.step}
              className="p-4 rounded-xl bg-white/3 border border-glass-border flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white tracking-wide">
                  {f.step}
                </span>
                <span className="text-[10px] font-semibold text-[#d2e2ea]/50 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {f.avgTimeSeconds}s avg
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-white tabular-nums">
                  {f.visitors.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#d2e2ea]/50 mt-0.5">
                  Visitors completed step
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-linear-to-r from-[#d16b54] to-[#026dfe] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, funnel.totalVisitors > 0 ? (f.visitors / funnel.totalVisitors) * 100 : 0)}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-glass-border">
                <span className="text-[#d2e2ea]/50">Drop-off to next</span>
                <span
                  className={`font-semibold ${
                    parseInt(f.dropRate) > 30
                      ? "text-amber-400"
                      : "text-white/80"
                  }`}
                >
                  {f.dropRate}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Camera Angles Heatmap & Device Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Angles (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-glass-border">
            <div className="p-2 rounded-xl bg-[#026dfe]/10 text-[#026dfe] border border-[#026dfe]/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Most Viewed Camera Angles
              </h2>
              <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                Angles and viewpoints where visitors spend the most inspection
                time.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#d2e2ea]/40 uppercase tracking-[0.16em] text-[10px] border-b border-glass-border">
                  <th className="pb-3 font-semibold">Camera Angle</th>
                  <th className="pb-3 font-semibold">Real Views</th>
                  <th className="pb-3 font-semibold">Avg. Duration</th>
                  <th className="pb-3 font-semibold">Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border text-[#d2e2ea]/80">
                {funnel.cameraAngles.map((cam) => (
                  <tr key={cam.name} className="hover:bg-white/3 transition">
                    <td className="py-3 font-medium text-white">{cam.name}</td>
                    <td className="py-3 tabular-nums">
                      {cam.views.toLocaleString()}
                    </td>
                    <td className="py-3">{cam.avgDuration}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cam.engagement === "Very High"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : cam.engagement === "High"
                              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              : "bg-white/10 text-white/60 border border-white/10"
                        }`}
                      >
                        {cam.engagement}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device & Viewport (1 col) */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-glass-border">
            <div className="p-2 rounded-xl bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Devices & Views
              </h2>
              <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                Hardware breakdown of 3D studio visitors.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {funnel.deviceViews.map((d) => (
              <div
                key={d.device}
                className="p-3 rounded-xl bg-white/3 border border-glass-border flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white">
                    {d.device}
                  </div>
                  <div className="text-[10px] text-[#d2e2ea]/40">
                    {d.count} sessions
                  </div>
                </div>
                <span className="text-xs font-bold text-white tabular-nums">
                  {d.share}%
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 mt-4">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">3D WebGL Performance</div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">
                Maintain 60 FPS across mobile by avoiding canvas unmounts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
