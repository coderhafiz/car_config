"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone,
  Share2,
  TrendingUp,
  DollarSign,
  Users,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Filter,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { MetricCard } from "@/components/admin/MetricCard";
import {
  fetchAllRealEvents,
  fetchAllRealLeads,
  computeRealAcquisition,
  RealAcquisitionData,
  seedRealTelemetryData,
} from "@/lib/realAnalytics";

export default function AdminAcquisitionPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [copied, setCopied] = useState(false);

  // Link Builder State
  const [builderSource, setBuilderSource] = useState("instagram");
  const [builderMedium, setBuilderMedium] = useState("paid_social");
  const [builderCampaign, setBuilderCampaign] = useState("porsche_911_launch");
  const [builderContent, setBuilderContent] = useState("carbon_gt3_reel");

  const [data, setData] = useState<RealAcquisitionData>({
    totalTrackedVisitors: 0,
    paidTrafficRatio: 0,
    organicTrafficRatio: 100,
    topChannel: "Direct",
    totalPipelineValue: 0,
    sources: [],
    campaigns: [],
    channelConversion: [],
  });

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [events, leads] = await Promise.all([
        fetchAllRealEvents(),
        fetchAllRealLeads(),
      ]);
      const acq = computeRealAcquisition(events, leads);
      setData(acq);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedRealTelemetryData();
      await refreshData();
    } finally {
      setIsSeeding(false);
    }
  };

  // Generate tracked campaign URL
  const generatedUrl = (() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://customly-u.luxury";
    const params = new URLSearchParams();
    if (builderSource) params.set("utm_source", builderSource);
    if (builderMedium) params.set("utm_medium", builderMedium);
    if (builderCampaign) params.set("utm_campaign", builderCampaign);
    if (builderContent) params.set("utm_content", builderContent);
    return `${origin}/?${params.toString()}`;
  })();

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleExportCSV = () => {
    if (!data.campaigns.length) return;
    const headers = "Campaign,Source,Medium,Visitors,Builds,Deposits,Pipeline Value,Conversion Rate\n";
    const rows = data.campaigns
      .map(
        (c) =>
          `"${c.name}","${c.source}","${c.medium}",${c.visitors},${c.builds},${c.deposits},$${c.pipelineValue.toLocaleString()},"${c.conversionRate}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `customly_campaign_analytics_${Date.now()}.csv`);
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
            <Megaphone className="w-7 h-7 text-[#026dfe]" />
            <span>Acquisition & Campaigns</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            UTM channel attribution, paid vs organic breakdown, and marketing campaign pipeline value.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshData}
            title="Refresh Acquisition Data"
            className="p-2 rounded-xl glass border border-glass-border text-[#d2e2ea]/70 hover:text-white transition flex items-center gap-1.5 text-xs shadow-lg cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#026dfe]" : ""}`}
            />
            <span>Sync</span>
          </button>

          <button
            onClick={handleSeed}
            disabled={isSeeding}
            title="Generate sample UTM events and campaign attribution"
            className="px-3 py-2 rounded-xl bg-linear-to-r from-[#026dfe]/20 to-[#026dfe]/5 border border-[#026dfe]/40 text-[#026dfe] hover:bg-[#026dfe]/20 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-lg disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSeeding ? "Seeding..." : "Seed Campaign Data"}</span>
          </button>

          {data.campaigns.length > 0 && (
            <button
              onClick={handleExportCSV}
              title="Download Campaign Performance CSV"
              className="p-2 rounded-xl glass border border-glass-border text-[#d2e2ea]/70 hover:text-white transition flex items-center gap-1.5 text-xs shadow-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="TOTAL TRACKED TRAFFIC"
          value={data.totalTrackedVisitors.toLocaleString()}
          change="+18.4%"
          trend="up"
          sublabel="Distinct visitor sessions"
          icon={Users}
          accentColor="#026dfe"
        />
        <MetricCard
          label="PAID VS ORGANIC"
          value={`${data.paidTrafficRatio}% / ${data.organicTrafficRatio}%`}
          change="Balanced"
          trend="up"
          sublabel="Channel acquisition split"
          icon={TrendingUp}
          accentColor="#10b981"
        />
        <MetricCard
          label="TOP CONVERTING CHANNEL"
          value={data.topChannel}
          change="Primary Source"
          trend="up"
          sublabel="Highest session volume"
          icon={Share2}
          accentColor="#d16b54"
        />
        <MetricCard
          label="CAMPAIGN PIPELINE"
          value={`$${(data.totalPipelineValue / 1000).toFixed(0)}k`}
          change={`${data.campaigns.length} Active`}
          trend="up"
          sublabel="Tracked commission value"
          icon={DollarSign}
          accentColor="#8b5cf6"
        />
      </div>

      {/* Charts Grid: Traffic Breakdown + Channel Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sources Breakdown */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-glass-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#026dfe]/10 text-[#026dfe] border border-[#026dfe]/20">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Traffic Sources Breakdown
                </h2>
                <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                  Visitor volume attributed by UTM source & referrer.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full h-64">
            {data.sources.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-white/40">
                No traffic events tracked yet. Click &quot;Seed Campaign Data&quot; to test.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.sources}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="source"
                    stroke="rgba(210, 226, 234, 0.6)"
                    fontSize={11}
                    width={90}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(11, 21, 27, 0.95)",
                      border: "1px solid rgba(175, 212, 228, 0.25)",
                      borderRadius: "14px",
                      color: "#edf2f4",
                      fontSize: "12px",
                      backdropFilter: "blur(20px)",
                    }}
                    formatter={(val: unknown) => [
                      `${String(val)} visitors`,
                      "Volume",
                    ]}
                  />
                  <Bar dataKey="visitors" radius={[0, 8, 8, 0]}>
                    {data.sources.map((entry: { color: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Sources Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-glass-border">
            {data.sources.slice(0, 6).map((src: { source: string; color: string; share: number }) => (
              <div
                key={src.source}
                className="p-2 rounded-xl bg-white/3 border border-glass-border flex items-center justify-between"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: src.color }}
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {src.source}
                  </span>
                </div>
                <span className="text-xs font-black text-[#d2e2ea]/70">
                  {src.share}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Conversion & Avg Order Value */}
        <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-glass-border pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Channel Conversion Rates
                </h2>
                <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                  Percentage of visitors who placed a $5,000 deposit or quote.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full h-64">
            {data.channelConversion.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-white/40">
                Awaiting conversion telemetry.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.channelConversion}
                  margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                >
                  <XAxis
                    dataKey="channel"
                    stroke="rgba(175, 212, 228, 0.4)"
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="rgba(175, 212, 228, 0.4)"
                    fontSize={11}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(11, 21, 27, 0.95)",
                      border: "1px solid rgba(175, 212, 228, 0.25)",
                      borderRadius: "14px",
                      color: "#edf2f4",
                      fontSize: "12px",
                      backdropFilter: "blur(20px)",
                    }}
                    formatter={(val: unknown) => [
                      `${String(val)}%`,
                      "Conversion Rate",
                    ]}
                  />
                  <Bar dataKey="conversionRate" radius={[8, 8, 0, 0]}>
                    {data.channelConversion.map((entry: { color: string }, index: number) => (
                      <Cell key={`cell-conv-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Highlights */}
          <div className="p-3 rounded-xl bg-white/3 border border-glass-border flex items-center justify-between text-xs">
            <span className="text-white/60">Average Commission Value:</span>
            <span className="font-extrabold text-emerald-400">
              ${(data.totalPipelineValue / Math.max(1, data.campaigns.reduce((a, b) => a + b.deposits, 0))).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-glass-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#d16b54]/10 text-[#d16b54] border border-[#d16b54]/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Active Campaigns Performance
              </h2>
              <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                Full funnel tracking from initial ad click to bespoke build specification and deposit.
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-glass-border text-white/40 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Source / Medium</th>
                <th className="py-3 px-3 text-right">Visitors</th>
                <th className="py-3 px-3 text-right">Builds</th>
                <th className="py-3 px-3 text-right">Deposits ($5k)</th>
                <th className="py-3 px-3 text-right">Pipeline ($)</th>
                <th className="py-3 px-3 text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-white/40">
                    No active campaigns detected. Create one below with the UTM Link Generator.
                  </td>
                </tr>
              ) : (
                data.campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-white/3 transition group">
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#026dfe]" />
                      <span>{camp.name}</span>
                    </td>
                    <td className="py-3 px-3 text-white/60">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-glass-border text-[11px] font-mono">
                        {camp.source} / {camp.medium}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-white/80">
                      {camp.visitors}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-white/80">
                      {camp.builds}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      {camp.deposits}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-white">
                      ${camp.pipelineValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#026dfe]">
                      {camp.conversionRate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive UTM Campaign Link Builder */}
      <div className="rounded-2xl glass border border-glass-border p-6 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-glass-border pb-4">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Instant UTM Campaign Link Builder
            </h2>
            <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
              Generate tracked studio URLs for your Instagram ads, Google campaigns, or YouTube influencers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Traffic Source (utm_source)
            </label>
            <select
              value={builderSource}
              onChange={(e) => setBuilderSource(e.target.value)}
              className="w-full glass border border-glass-border text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#026dfe] bg-[#0c161f]"
            >
              <option value="instagram">Instagram (Meta)</option>
              <option value="google">Google Search</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="newsletter">Private Newsletter</option>
              <option value="x_twitter">X / Twitter</option>
              <option value="partner">Concierge / Luxury Partner</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Medium (utm_medium)
            </label>
            <select
              value={builderMedium}
              onChange={(e) => setBuilderMedium(e.target.value)}
              className="w-full glass border border-glass-border text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#026dfe] bg-[#0c161f]"
            >
              <option value="paid_social">Paid Social (paid_social)</option>
              <option value="cpc">Search CPC (cpc)</option>
              <option value="influencer">Influencer / Creator (influencer)</option>
              <option value="email">Direct Email (email)</option>
              <option value="organic_social">Organic Social (organic_social)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Campaign Name (utm_campaign)
            </label>
            <input
              type="text"
              value={builderCampaign}
              onChange={(e) => setBuilderCampaign(e.target.value)}
              placeholder="e.g. geneva_autoshow_2026"
              className="w-full glass border border-glass-border text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#026dfe] bg-[#0c161f] placeholder-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Ad Content / Creative (utm_content)
            </label>
            <input
              type="text"
              value={builderContent}
              onChange={(e) => setBuilderContent(e.target.value)}
              placeholder="e.g. video_hook_carbon_gt3"
              className="w-full glass border border-glass-border text-xs text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#026dfe] bg-[#0c161f] placeholder-white/30"
            />
          </div>
        </div>

        {/* Live URL Output Box */}
        <div className="p-4 rounded-xl bg-white/2 border border-glass-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
              Generated Attribution URL:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-[#026dfe] hover:brightness-110 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#026dfe]/20"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <a
                href={generatedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg glass border border-glass-border hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                <span>Test in 3D Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-black/60 border border-white/5 font-mono text-xs text-[#026dfe] break-all select-all">
            {generatedUrl}
          </div>
        </div>
      </div>
    </div>
  );
}
