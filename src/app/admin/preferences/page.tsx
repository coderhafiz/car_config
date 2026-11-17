"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sliders, Palette, Disc, Layers, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  fetchAllRealEvents,
  fetchAllRealLeads,
  computeRealPreferences,
  RealPreferencesData,
} from "@/lib/realAnalytics";

export default function CustomisationPreferencesPage() {
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<RealPreferencesData>({
    paintFinishes: [],
    wheelChoices: [],
    decalPlacements: [],
    topCombinations: [],
  });

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [events, leads] = await Promise.all([
        fetchAllRealEvents(),
        fetchAllRealLeads(),
      ]);
      const data = computeRealPreferences(events, leads);
      setPreferences(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchAllRealEvents(), fetchAllRealLeads()]).then(
      ([events, leads]) => {
        if (isMounted) {
          setPreferences(computeRealPreferences(events, leads));
          setIsLoading(false);
        }
      },
    );
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
            <Sliders className="w-7 h-7 text-[#d16b54]" />
            <span>Preferences</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Real customer choices for exterior paint, wheels, and bespoke
            details.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshData}
            title="Refresh preferences"
            className="p-2 rounded-xl glass border border-glass-border text-[#d2e2ea]/70 hover:text-white transition flex items-center gap-1.5 text-xs shadow-lg"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#d16b54]" : ""}`}
            />
            <span>Sync</span>
          </button>

          {/* Model Filter */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="glass border border-glass-border text-xs font-semibold text-white rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-[#d16b54] shadow-lg"
          >
            <option value="all" className="bg-[#0c161f]">
              All Vehicles Combined
            </option>
            <option value="porsche" className="bg-[#0c161f]">
              Porsche 911 992
            </option>
            <option value="rs6" className="bg-[#0c161f]">
              Audi RS6 Avant
            </option>
            <option value="rs8" className="bg-[#0c161f]">
              Audi RS8 Sport
            </option>
          </select>
        </div>
      </div>

      {/* Grid: Paint Finishes + Wheel Designs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paint Choices */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-glass-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#d16b54]/10 text-[#d16b54] border border-[#d16b54]/20">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Paint Choices
                </h2>
                <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                  Breakdown of customer finish choices.
                </p>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={preferences.paintFinishes}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(210, 226, 234, 0.6)"
                  fontSize={11}
                  width={140}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(11, 21, 27, 0.95)",
                    border: "1px solid rgba(175, 212, 228, 0.25)",
                    borderRadius: "14px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
                    color: "#edf2f4",
                    fontSize: "12px",
                    backdropFilter: "blur(20px)",
                  }}
                  formatter={(val: unknown) => [
                    `${String(val)}% share`,
                    "Selection Share",
                  ]}
                />
                <Bar dataKey="share" radius={[0, 8, 8, 0]} fill="#d16b54" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary rows */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {preferences.paintFinishes.map((f) => (
              <div
                key={f.name}
                className="p-3 rounded-xl bg-white/2 border border-white/5 flex flex-col justify-between"
              >
                <span className="text-[11px] text-white/60 font-medium truncate">
                  {f.name}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-extrabold text-white">
                    {f.share}%
                  </span>
                  <span className="text-[10px] text-white/40">
                    {f.count} picks
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wheel Choices */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-glass-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#026dfe]/10 text-[#026dfe] border border-[#026dfe]/20">
                <Disc className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Wheel Choices
                </h2>
                <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                  Wheel designs and finish selections.
                </p>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={preferences.wheelChoices}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(210, 226, 234, 0.6)"
                  fontSize={11}
                  width={140}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(11, 21, 27, 0.95)",
                    border: "1px solid rgba(175, 212, 228, 0.25)",
                    borderRadius: "14px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
                    color: "#edf2f4",
                    fontSize: "12px",
                    backdropFilter: "blur(20px)",
                  }}
                  formatter={(val: unknown) => [
                    `${String(val)}% share`,
                    "Selection Share",
                  ]}
                />
                <Bar dataKey="share" radius={[0, 8, 8, 0]} fill="#026dfe" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Wheel Options Details */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {preferences.wheelChoices.map((w) => (
              <div
                key={w.name}
                className="p-3 rounded-xl bg-white/3 border border-glass-border flex flex-col justify-between"
              >
                <span className="text-[11px] text-[#d2e2ea]/70 font-medium truncate">
                  {w.name}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-extrabold text-white">
                    {w.share}%
                  </span>
                  <span className="text-[10px] text-[#d2e2ea]/40">
                    ${w.avgOptionPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decal Placements + High-Demand Combos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decal Spots (1 col) */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-glass-border">
            <div className="p-2 rounded-xl bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Sticker Locations
              </h2>
              <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                Where users position graphics on the car.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {preferences.decalPlacements.map((d) => (
              <div
                key={d.location}
                className="p-3 rounded-xl bg-white/3 border border-glass-border flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white">
                    {d.location}
                  </div>
                  <div className="text-[10px] text-[#d2e2ea]/40 mt-0.5">
                    {d.count} placements
                  </div>
                </div>
                <span className="text-xs font-bold text-[#a855f7] px-2 py-0.5 rounded-md bg-[#a855f7]/10 border border-[#a855f7]/20">
                  {d.share}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* High-Demand Combos (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-glass-border">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Popular Combinations
              </h2>
              <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                Full customization sets that customers choose together.
              </p>
            </div>
          </div>

          {preferences.topCombinations.length === 0 ? (
            <div className="py-12 text-center text-[#d2e2ea]/40 text-xs">
              <p>No combination patterns yet.</p>
              <p className="mt-1 text-[#d2e2ea]/30">
                Submit builds in the 3D Studio to see combination clusters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#d2e2ea]/40 uppercase tracking-[0.16em] text-[10px] border-b border-glass-border">
                    <th className="pb-3 font-semibold">Custom Set</th>
                    <th className="pb-3 font-semibold">Top Model</th>
                    <th className="pb-3 font-semibold">Avg. Build Price</th>
                    <th className="pb-3 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border text-[#d2e2ea]/80">
                  {preferences.topCombinations.map((combo, idx) => (
                    <tr key={idx} className="hover:bg-white/3 transition">
                      <td className="py-3 font-medium text-white max-w-xs truncate">
                        {combo.combo}
                      </td>
                      <td className="py-3 text-[#d2e2ea]/70">
                        {combo.topModel}
                      </td>
                      <td className="py-3 font-semibold text-white">
                        {combo.avgMSRP}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d16b54]/10 text-[#d16b54] border border-[#d16b54]/20">
                          {combo.share}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
