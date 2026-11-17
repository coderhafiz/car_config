"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  Car,
  TrendingUp,
  Activity,
  ArrowRight,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Database,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MetricCard } from "@/components/admin/MetricCard";
import {
  fetchAllRealEvents,
  fetchAllRealLeads,
  computeRealDashboardMetrics,
  RealDashboardMetrics,
  seedRealTelemetryData,
  clearAllRealTelemetry,
} from "@/lib/realAnalytics";

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState("7D");
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [metrics, setMetrics] = useState<RealDashboardMetrics>({
    commissionPipelineValue: 0,
    depositsCollectedValue: 0,
    depositsCollectedCount: 0,
    totalConfigurations: 0,
    completedBuildRate: "0.0%",
    activeStudios: 1,
    pipelineTrend: [
      { day: "Mon", pipelineValue: 0, sessions: 0 },
      { day: "Tue", pipelineValue: 0, sessions: 0 },
      { day: "Wed", pipelineValue: 0, sessions: 0 },
      { day: "Thu", pipelineValue: 0, sessions: 0 },
      { day: "Fri", pipelineValue: 0, sessions: 0 },
      { day: "Sat", pipelineValue: 0, sessions: 0 },
      { day: "Sun", pipelineValue: 0, sessions: 0 },
    ],
    vehicleModelBreakdown: [
      { name: "Porsche 911 992", count: 0, share: 0, color: "#d16b54" },
      { name: "Audi RS6 Avant", count: 0, share: 0, color: "#38bdf8" },
      { name: "Audi RS8 Sport", count: 0, share: 0, color: "#a855f7" },
    ],
    recentLeads: [],
  });

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [events, leads] = await Promise.all([
        fetchAllRealEvents(),
        fetchAllRealLeads(),
      ]);
      const computed = computeRealDashboardMetrics(events, leads);
      setMetrics(computed);
    } catch (err) {
      console.error("Error loading real analytics", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchAllRealEvents(), fetchAllRealLeads()]).then(
      ([events, leads]) => {
        if (isMounted) {
          setMetrics(computeRealDashboardMetrics(events, leads));
          setIsLoading(false);
        }
      },
    );
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSeedTraffic = async () => {
    setIsSeeding(true);
    try {
      await seedRealTelemetryData();
      await refreshData();
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (
      confirm(
        "Reset real telemetry and leads? All local and test records will be cleared.",
      )
    ) {
      setIsLoading(true);
      try {
        await clearAllRealTelemetry();
        await refreshData();
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Aggregated in real-time from Supabase events and customer 3D studio
            sessions.
          </p>
        </div>

        {/* Live Actions & Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshData}
            title="Refresh Live Data"
            className="p-2 rounded-xl glass border border-glass-border text-[#d2e2ea]/70 hover:text-white transition flex items-center gap-1.5 text-xs shadow-lg"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#d16b54]" : ""}`}
            />
            <span>Sync</span>
          </button>

          <button
            onClick={handleSeedTraffic}
            disabled={isSeeding}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1.5 text-xs font-semibold shadow-lg shadow-emerald-950/20"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSeeding ? "Seeding..." : "Seed Real Test Data"}</span>
          </button>

          <button
            onClick={handleClearData}
            title="Reset telemetry"
            className="p-2 rounded-xl glass border border-glass-border text-[#d2e2ea]/40 hover:text-red-400 transition shadow-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 glass border border-glass-border rounded-xl p-1 shadow-lg">
            {["24H", "7D", "30D", "All"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  timeRange === range
                    ? "bg-linear-to-r from-[#d16b54] to-[#b3533e] text-white shadow-md shadow-[#d16b54]/30"
                    : "text-[#d2e2ea]/60 hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Quoted Pipeline"
          value={
            metrics.commissionPipelineValue >= 1000000
              ? `$${(metrics.commissionPipelineValue / 1000000).toFixed(2)}M`
              : `$${metrics.commissionPipelineValue.toLocaleString()}`
          }
          change={metrics.commissionPipelineValue > 0 ? "Real Active" : "$0.00"}
          trend="up"
          icon={DollarSign}
          sublabel="Total quoted build value"
          accentColor="#d16b54"
        />
        <MetricCard
          label="Collected Deposits"
          value={`$${(metrics.depositsCollectedValue / 1000).toFixed(0)}k`}
          change={`${metrics.depositsCollectedCount} orders`}
          trend="up"
          icon={TrendingUp}
          sublabel={`${metrics.depositsCollectedCount} reservations @ $5k`}
          accentColor="#10b981"
        />
        <MetricCard
          label="Completed Builds"
          value={metrics.totalConfigurations.toLocaleString()}
          change={metrics.completedBuildRate}
          trend="up"
          icon={Car}
          sublabel="Total saved car builds"
          accentColor="#38bdf8"
        />
        <MetricCard
          label="Active Visitors"
          value={`${metrics.activeStudios} Online`}
          change="Real Sessions"
          trend="up"
          icon={Activity}
          sublabel="Click to inspect active 3D sessions ↗"
          accentColor="#026dfe"
          onClick={() => window.dispatchEvent(new Event("openActiveViewers"))}
        />
      </div>

      {/* Charts Row: Revenue & Activity Area Chart + Car Model Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Studio Sessions Trend (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl glass border border-glass-border p-6 shadow-2xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Sales & Visitor Activity
              </h2>
              <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                Daily visitor numbers and quoted build value.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#d2e2ea]/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d16b54]" />
                Sales ($)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#026dfe]" />
                Visitors
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics.pipelineTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d16b54" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d16b54" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient
                    id="colorSessions"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#026dfe" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#026dfe" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="rgba(175, 212, 228, 0.2)"
                  tick={{ fill: "rgba(210, 226, 234, 0.6)", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="rgba(175, 212, 228, 0.2)"
                  tick={{ fill: "rgba(210, 226, 234, 0.6)", fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="rgba(175, 212, 228, 0.2)"
                  tick={{ fill: "rgba(210, 226, 234, 0.6)", fontSize: 11 }}
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
                  formatter={(value: unknown, name: unknown) => [
                    name === "pipelineValue"
                      ? `$${Number(value).toLocaleString()}`
                      : String(value ?? ""),
                    name === "pipelineValue"
                      ? "Pipeline Value"
                      : "Studio Sessions",
                  ]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="pipelineValue"
                  stroke="#d16b54"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="sessions"
                  stroke="#026dfe"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSessions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Popular Cars Donut Chart (1 col) */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Most Popular Cars
            </h2>
            <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
              Which car models customers choose most.
            </p>
          </div>

          <div className="relative w-full h-52 flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.vehicleModelBreakdown}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {metrics.vehicleModelBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
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
                  formatter={(val: unknown) => [`${String(val)} selections`, "Count"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold text-white">
                {metrics.totalConfigurations}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#d2e2ea]/50">
                Total Builds
              </span>
            </div>
          </div>

          {/* Model Breakdown Legend */}
          <div className="space-y-2 pt-2 border-t border-glass-border">
            {metrics.vehicleModelBreakdown.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2 text-[#d2e2ea]/80">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate max-w-35">{item.name}</span>
                </span>
                <span className="font-semibold text-white/90">
                  {item.share}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Orders & Leads + AI Recommendation Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders & Leads (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl glass border border-glass-border p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Recent Orders & Leads
              </h2>
              <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                Customers who saved their build or placed a $5,000 deposit.
              </p>
            </div>
            <Link
              href="/admin/commissions"
              className="text-xs font-semibold text-[#d16b54] hover:text-[#d16b54]/80 flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentLeads.length === 0 ? (
            <div className="py-12 text-center text-[#d2e2ea]/40 text-xs">
              <p>No orders or inquiries recorded yet.</p>
              <p className="mt-1 text-[#d2e2ea]/30">
                Customize a car in the 3D Studio or click &ldquo;Seed Real Test
                Data&rdquo; above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#d2e2ea]/40 uppercase tracking-[0.16em] text-[10px] border-b border-glass-border">
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Vehicle</th>
                    <th className="pb-3 font-semibold">Spec Summary</th>
                    <th className="pb-3 font-semibold">Total</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border text-[#d2e2ea]/80">
                  {metrics.recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/3 transition">
                      <td className="py-3">
                        <div className="font-semibold text-white">
                          {lead.clientName}
                        </div>
                        <div className="text-[11px] text-[#d2e2ea]/50">
                          {lead.location}
                        </div>
                      </td>
                      <td className="py-3 font-medium text-white/90">
                        {lead.vehicleModel}
                      </td>
                      <td className="py-3 text-[#d2e2ea]/70">
                        {lead.exteriorFinish} • {lead.wheelDesign}
                      </td>
                      <td className="py-3 font-semibold text-white tabular-nums">
                        ${lead.totalPrice.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            lead.depositStatus.includes("Deposited")
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                          }`}
                        >
                          {lead.depositStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Recommendation Quick Action (1 col) */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          {/* Ambient decorative glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#026dfe]/15 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] px-2.5 py-1 rounded-full bg-[#d16b54]/20 border border-[#d16b54]/40 text-[#d16b54]">
                AI Recommendation
              </span>
              <span className="text-xs text-[#d2e2ea]/50">Active Analysis</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2 leading-snug">
              {metrics.vehicleModelBreakdown[0]?.name
                ? `${metrics.vehicleModelBreakdown[0].name} Leads Production Demand`
                : "Promote Popular Custom Finishes"}
            </h3>
            <p className="text-xs text-[#d2e2ea]/70 leading-relaxed mb-4">
              Real telemetry shows customer interest in custom finishes and
              wheel options. Generate full executive digests on customer
              conversion.
            </p>
          </div>

          <Link
            href="/admin/insights"
            className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-[#d16b54] to-[#e07a63] hover:from-[#e07a63] hover:to-[#d16b54] text-white text-xs font-bold shadow-lg shadow-[#d16b54]/25 flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Full AI Digest</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  );
}
