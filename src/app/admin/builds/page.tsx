"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Car,
  Search,
  Download,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { fetchAllRealSavedBuilds, RealSavedBuild } from "@/lib/realAnalytics";

export default function SavedConfigurationsPage() {
  const [builds, setBuilds] = useState<RealSavedBuild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModel, setFilterModel] = useState("all");

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllRealSavedBuilds();
      setBuilds(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchAllRealSavedBuilds().then((data) => {
      if (isMounted) {
        setBuilds(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = builds.filter((b) => {
    const matchesModel =
      filterModel === "all" ||
      b.vehicleModel.toLowerCase().includes(filterModel.toLowerCase());
    const matchesSearch =
      b.vehicleModel.toLowerCase().includes(search.toLowerCase()) ||
      b.exteriorFinish.toLowerCase().includes(search.toLowerCase()) ||
      b.wheels.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    return matchesModel && matchesSearch;
  });

  const exportCSV = () => {
    const headers = [
      "Build ID",
      "Model",
      "Year",
      "Finish",
      "Hex",
      "Wheels",
      "Tint",
      "MSRP",
      "Status",
    ];
    const rows = filtered.map((b) => [
      b.id,
      `"${b.vehicleModel}"`,
      b.year,
      `"${b.exteriorFinish}"`,
      b.exteriorHex,
      `"${b.wheels}"`,
      `"${b.windowTint}"`,
      b.totalMSRP,
      b.intentScore,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `customly_real_builds_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Car className="w-7 h-7 text-[#d16b54]" />
            <span>Saved Builds</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Browse real customer car configurations saved across sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshData}
            title="Refresh builds"
            className="p-2 rounded-xl glass border border-glass-border text-[#d2e2ea]/70 hover:text-white transition flex items-center gap-1.5 text-xs shadow-lg"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#d16b54]" : ""}`}
            />
            <span>Sync</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="px-4 py-2 rounded-xl glass border border-glass-border hover:border-white/20 text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 shadow-lg"
          >
            <Download className="w-4 h-4 text-[#d16b54]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#d2e2ea]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved builds by model, paint, wheels, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/3 border border-glass-border text-xs text-white placeholder-[#d2e2ea]/40 focus:border-[#d16b54] outline-none shadow-lg"
          />
        </div>

        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="glass border border-glass-border text-xs font-semibold text-white rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:border-[#d16b54] shadow-lg"
        >
          <option value="all" className="bg-[#0c161f]">
            All Models
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

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl glass border border-glass-border p-12 text-center text-[#d2e2ea]/40 text-xs shadow-2xl">
          <Car className="w-8 h-8 mx-auto text-white/20 mb-3" />
          <p className="font-semibold text-white/60">No saved builds found</p>
          <p className="mt-1 text-[#d2e2ea]/30">
            Open the 3D Configurator and submit a configuration or click
            &ldquo;Seed Real Test Data&rdquo; on the Overview page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl glass border border-glass-border p-5 shadow-2xl flex flex-col justify-between hover:border-white/30 transition space-y-4"
            >
              <div>
                {/* Header row: Model + Intent pill */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {b.vehicleModel}
                    </h3>
                    <span className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {b.savedAgo} • {b.year}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      b.intentScore === "Converted"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : b.intentScore === "High"
                          ? "bg-[#d16b54]/10 text-[#d16b54] border border-[#d16b54]/20"
                          : "bg-white/5 text-white/60"
                    }`}
                  >
                    {b.intentScore}
                  </span>
                </div>

                {/* Color and Finish swatch */}
                <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-[11px]">
                      Paint Finish
                    </span>
                    <span className="font-medium text-white flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: b.exteriorHex }}
                      />
                      {b.exteriorFinish}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-white/50 text-[11px]">Wheels</span>
                    <span className="font-medium text-white truncate max-w-42.5 text-right">
                      {b.wheels}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-white/50 text-[11px]">
                      Glass Tint
                    </span>
                    <span className="font-medium text-white">
                      {b.windowTint}
                    </span>
                  </div>

                  {b.activeLivery && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-white/50 text-[11px] flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Graphics
                      </span>
                      <span className="font-medium text-white/90 truncate max-w-37.5">
                        {b.activeLivery}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                    Quoted MSRP
                  </div>
                  <div className="text-base font-extrabold text-white">
                    ${b.totalMSRP.toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    +${b.addedOptionsValue.toLocaleString()} options
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
