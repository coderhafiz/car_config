"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BadgeDollarSign,
  Download,
  Search,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Printer,
  X,
  RefreshCw,
} from "lucide-react";
import { VehicleCommissionLead } from "@/lib/adminData";
import { fetchAllRealLeads } from "@/lib/realAnalytics";

export default function CommissionsPipelinePage() {
  const [leads, setLeads] = useState<VehicleCommissionLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] =
    useState<VehicleCommissionLead | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllRealLeads();
      setLeads(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchAllRealLeads().then((data) => {
      if (isMounted) {
        setLeads(data);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = leads.filter((lead) => {
    const matchesStatus =
      statusFilter === "all" ||
      lead.depositStatus.toLowerCase().includes(statusFilter.toLowerCase());
    const matchesSearch =
      lead.clientName.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.vehicleModel.toLowerCase().includes(search.toLowerCase()) ||
      lead.location.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalDepositsCollected =
    leads.filter((l) => l.depositStatus.includes("Deposited")).length * 5000;

  const exportCSV = () => {
    const headers = [
      "Order ID",
      "Client",
      "Email",
      "Phone",
      "Location",
      "Vehicle",
      "Finish",
      "Wheels",
      "Total Price",
      "Deposit Status",
      "Payment Method",
    ];
    const rows = filtered.map((l) => [
      l.id,
      `"${l.clientName}"`,
      l.email,
      `"${l.phone}"`,
      `"${l.location}"`,
      `"${l.vehicleModel}"`,
      `"${l.exteriorFinish}"`,
      `"${l.wheelDesign}"`,
      l.totalPrice,
      `"${l.depositStatus}"`,
      `"${l.paymentMethod}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `customly_real_commissions_${new Date().toISOString().slice(0, 10)}.csv`,
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
            <BadgeDollarSign className="w-7 h-7 text-[#d16b54]" />
            <span>Orders & Leads</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Manage real customer inquiries, build specs, and $5,000 reservation
            deposits in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={refreshData}
            title="Refresh leads"
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

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass border border-glass-border shadow-xl">
          <span className="text-[10px] uppercase font-bold text-[#d2e2ea]/50 tracking-[0.2em]">
            Total Pipeline Value
          </span>
          <div className="text-2xl font-black text-white mt-1 tabular-nums">
            $
            {leads
              .reduce((acc, l) => acc + (l.totalPrice || 0), 0)
              .toLocaleString()}
          </div>
          <div className="text-[11px] text-[#d2e2ea]/50 mt-0.5">
            Sum of all bespoke customer builds
          </div>
        </div>

        <div className="p-5 rounded-2xl glass border border-glass-border shadow-xl">
          <span className="text-[10px] uppercase font-bold text-[#d2e2ea]/50 tracking-[0.2em]">
            Total Deposits Collected
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">
            ${totalDepositsCollected.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400/70 mt-0.5">
            {leads.filter((l) => l.depositStatus.includes("Deposited")).length}{" "}
            confirmed $5,000 reservation deposits
          </div>
        </div>

        <div className="p-5 rounded-2xl glass border border-glass-border shadow-xl">
          <span className="text-[10px] uppercase font-bold text-[#d2e2ea]/50 tracking-[0.2em]">
            Average Vehicle Quoted
          </span>
          <div className="text-2xl font-black text-white mt-1 tabular-nums">
            $
            {leads.length > 0
              ? Math.round(
                  leads.reduce((acc, l) => acc + (l.totalPrice || 0), 0) /
                    leads.length,
                ).toLocaleString()
              : "0"}
          </div>
          <div className="text-[11px] text-[#d2e2ea]/50 mt-0.5">
            Based on {leads.length} customer records
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#d2e2ea]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by client name, email, vehicle, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/3 border border-glass-border text-xs text-white placeholder-[#d2e2ea]/40 focus:border-[#d16b54] outline-none shadow-lg"
          />
        </div>

        <div className="flex items-center gap-1 glass border border-glass-border rounded-xl p-1 shadow-lg">
          {["all", "Deposited", "Quote"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === filter
                  ? "bg-linear-to-r from-[#d16b54] to-[#b3533e] text-white shadow-md shadow-[#d16b54]/30"
                  : "text-[#d2e2ea]/60 hover:text-white"
              }`}
            >
              {filter === "all" ? "All Orders" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl glass border border-glass-border shadow-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#d2e2ea]/40 text-xs">
            <BadgeDollarSign className="w-8 h-8 mx-auto text-white/20 mb-3" />
            <p className="font-semibold text-white/60">
              No orders or leads recorded yet
            </p>
            <p className="mt-1 text-[#d2e2ea]/30">
              Submit a build in the 3D Studio or click &ldquo;Seed Real Test
              Data&rdquo; on the Overview page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#d2e2ea]/40 uppercase tracking-[0.16em] text-[10px] border-b border-glass-border bg-white/2">
                  <th className="p-4 font-semibold">Client Details</th>
                  <th className="p-4 font-semibold">Vehicle</th>
                  <th className="p-4 font-semibold">Custom Spec</th>
                  <th className="p-4 font-semibold">Pricing</th>
                  <th className="p-4 font-semibold">Deposit Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border text-[#d2e2ea]/80">
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-white/3 transition cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">
                        {lead.clientName}
                      </div>
                      <div className="text-[11px] text-[#d2e2ea]/50 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#d16b54]" />
                          {lead.email}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#d2e2ea]/40" />
                          {lead.location}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {lead.vehicleModel}
                      </div>
                      <div className="text-[11px] text-[#d2e2ea]/40 font-mono mt-0.5">
                        {lead.id}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="truncate font-medium text-white/90">
                        {lead.exteriorFinish}
                      </div>
                      <div className="text-[11px] text-[#d2e2ea]/50 truncate mt-0.5">
                        {lead.wheelDesign} • {lead.glassTint}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-white tabular-nums">
                        ${lead.totalPrice.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                        +${lead.optionsTotal.toLocaleString()} options
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                          lead.depositStatus.includes("Deposited")
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                        }`}
                      >
                        {lead.depositStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                        className="px-3 py-1.5 rounded-lg glass hover:bg-white/10 text-white font-semibold text-xs border border-glass-border transition"
                      >
                        View Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Work Order Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl glass border border-glass-border shadow-2xl p-6 space-y-6 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-glass-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d16b54]">
                  Bespoke Commission Work Order
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {selectedLead.clientName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white/3 border border-glass-border space-y-1">
                <span className="text-white/40 uppercase tracking-wider text-[10px] font-bold">
                  Contact
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Mail className="w-3.5 h-3.5 text-[#d16b54]" />
                  {selectedLead.email}
                </div>
                <div className="flex items-center gap-1.5 text-white/70">
                  <Phone className="w-3.5 h-3.5 text-white/40" />
                  {selectedLead.phone}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-1">
                <span className="text-white/40 uppercase tracking-wider text-[10px] font-bold">
                  Delivery Destination
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <MapPin className="w-3.5 h-3.5 text-[#d16b54]" />
                  {selectedLead.location}
                </div>
                <div className="text-white/50 text-[11px]">
                  Placed {selectedLead.submittedAt}
                </div>
              </div>
            </div>

            {/* Spec Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">
                Vehicle Specifications
              </h4>
              <div className="rounded-xl bg-white/2 border border-white/5 divide-y divide-white/5 text-xs">
                <div className="p-3 flex justify-between">
                  <span className="text-white/50">Car Model</span>
                  <span className="font-bold text-white">
                    {selectedLead.vehicleModel}
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-white/50">Exterior Finish</span>
                  <span className="font-medium text-white">
                    {selectedLead.exteriorFinish} ({selectedLead.exteriorColor})
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-white/50">Wheel Package</span>
                  <span className="font-medium text-white">
                    {selectedLead.wheelDesign} • {selectedLead.wheelColor}
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-white/50">Glass Tint</span>
                  <span className="font-medium text-white">
                    {selectedLead.glassTint}
                  </span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-white/50">Brake Calipers</span>
                  <span className="font-medium text-white">
                    {selectedLead.caliperColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="p-4 rounded-xl bg-[#d16b54]/10 border border-[#d16b54]/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d16b54]">
                  Total Quoted Commission
                </span>
                <div className="text-2xl font-black text-white mt-0.5">
                  ${selectedLead.totalPrice.toLocaleString()}
                </div>
                <div className="text-[11px] text-white/60 mt-0.5">
                  {selectedLead.depositStatus} via {selectedLead.paymentMethod}
                </div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            {/* Print Work Order Button */}
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Workshop Build Order</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
