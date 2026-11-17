"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sliders,
  Activity,
  Car,
  BadgeDollarSign,
  Sparkles,
  Compass,
  X,
  ExternalLink,
} from "lucide-react";
import { fetchAllRealLeads } from "@/lib/realAnalytics";

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [depositsCount, setDepositsCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const loadSidebarData = async () => {
      try {
        const leads = await fetchAllRealLeads();
        if (!isMounted) return;
        const count = leads.filter((l) =>
          l.depositStatus.includes("Deposited"),
        ).length;
        setDepositsCount(count);
      } catch (e) {
        console.warn("Sidebar leads sync notice:", e);
      }
    };

    loadSidebarData();

    const handleOpenSidebar = () => setIsOpen(true);
    window.addEventListener("openSidebar", handleOpenSidebar);
    window.addEventListener("storage", loadSidebarData);

    return () => {
      isMounted = false;
      window.removeEventListener("openSidebar", handleOpenSidebar);
      window.removeEventListener("storage", loadSidebarData);
    };
  }, []);

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Overview",
      href: "/admin/dashboard",
      badge: null,
    },
    {
      icon: Sliders,
      label: "Preferences",
      href: "/admin/preferences",
      badge: null,
    },
    {
      icon: Activity,
      label: "Customer Journey",
      href: "/admin/funnel",
      badge: null,
    },
    {
      icon: Car,
      label: "Saved Builds",
      href: "/admin/builds",
      badge: null,
    },
    {
      icon: BadgeDollarSign,
      label: "Orders & Leads",
      href: "/admin/commissions",
      badge: `${depositsCount} Deposits`,
    },
    {
      icon: Sparkles,
      label: "AI Insights",
      href: "/admin/insights",
      badge: "Free Tier",
    },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#06090b]/90 backdrop-blur-2xl border-r border-glass-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-6 border-b border-glass-border flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex flex-col">
              <span
                className="text-base font-normal tracking-[0.16em] uppercase text-white"
                style={{ fontFamily: "'Drason', sans-serif" }}
              >
                CUSTOM<span className="text-[#d16b54]">LY-U</span>
              </span>
              <span className="text-[9px] tracking-[0.22em] text-[#d2e2ea]/60 uppercase font-semibold">
                Automotive Intelligence
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/5"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Quick Switcher */}
        <div className="p-4 border-b border-glass-border">
          <Link
            href="/"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl glass hover:bg-white/10 border border-glass-border text-white/90 hover:text-white transition group shadow-lg"
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <Compass className="w-4 h-4 text-[#d16b54] group-hover:rotate-45 transition-transform duration-300" />
              <span>Launch 3D Configurator</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition" />
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          <div className="px-3 pb-2 text-[9px] font-semibold tracking-[0.25em] text-[#d2e2ea]/50 uppercase">
            Menu
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-linear-to-r from-[rgba(209,107,84,0.3)] via-[rgba(209,107,84,0.18)] to-[rgba(2,109,254,0.15)] text-white border border-[rgba(209,107,84,0.7)] shadow-lg shadow-[#d16b54]/20 backdrop-blur-md"
                    : "text-[#d2e2ea]/70 hover:text-white hover:bg-white/4 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? "text-[#d16b54]"
                        : "text-[#d2e2ea]/50 group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-[#d16b54]/30 border border-[#d16b54]/60 text-white"
                        : "bg-white/10 text-white/70 border border-white/10"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Database & Hosting Status Footer */}
        <div className="p-4 border-t border-glass-border bg-black/30">
          <div className="rounded-xl p-3 glass border border-glass-border space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#d2e2ea]/60">Database Engine</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Supabase Free Tier
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#d2e2ea]/60">AI Summaries</span>
              <span className="text-[#d16b54] font-semibold">
                Gemini Free Tier
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-linear-to-r from-[#d16b54] to-[#026dfe] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(2, Math.min(100, depositsCount * 2))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#d2e2ea]/50">
              <span>Database Storage</span>
              <span>&lt; 1 MB / 500 MB</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
