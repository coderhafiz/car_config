"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Bell,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Inbox,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Video,
  X,
  Compass,
} from "lucide-react";
import {
  fetchAllRealEvents,
  fetchAllRealLeads,
  getActiveViewerSessions,
  ActiveViewerSession,
} from "@/lib/realAnalytics";

interface RealNotification {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: "deposit" | "inquiry";
  unread: boolean;
}

export function AdminNavbar() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [viewersModalOpen, setViewersModalOpen] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<number>(1);
  const [activeSessions, setActiveSessions] = useState<ActiveViewerSession[]>(
    [],
  );
  const [notifications, setNotifications] = useState<RealNotification[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadNavbarData = async () => {
      try {
        const [events, leads] = await Promise.all([
          fetchAllRealEvents(),
          fetchAllRealLeads(),
        ]);

        if (!isMounted) return;

        // Calculate real active sessions in last 30 minutes
        const sessions = getActiveViewerSessions(events);
        setActiveSessions(sessions);
        setActiveVisitors(Math.max(1, sessions.length));

        // Generate real notifications from actual leads
        const realNotifs: RealNotification[] = leads
          .slice(0, 5)
          .map((l, idx) => ({
            id: l.id,
            title: l.depositStatus.includes("Deposited")
              ? "New Bespoke Deposit ($5,000)"
              : "New Commission Inquiry",
            detail: `${l.clientName} configured ${l.vehicleModel} in ${l.exteriorFinish}.`,
            time: l.submittedAt || "Recent",
            type: l.depositStatus.includes("Deposited") ? "deposit" : "inquiry",
            unread: idx === 0,
          }));

        setNotifications(realNotifs);
      } catch (e) {
        console.warn("Navbar telemetry sync notice:", e);
      }
    };

    loadNavbarData();

    window.addEventListener("storage", loadNavbarData);
    const handleOpenViewers = () => setViewersModalOpen(true);
    window.addEventListener("openActiveViewers", handleOpenViewers);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", loadNavbarData);
      window.removeEventListener("openActiveViewers", handleOpenViewers);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className="sticky top-0 z-30 h-18 bg-[#06090b]/80 backdrop-blur-2xl border-b border-glass-border px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={() => window.dispatchEvent(new Event("openSidebar"))}
          className="lg:hidden p-2 rounded-xl glass border border-glass-border text-white/70 hover:text-white"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 text-[#d2e2ea]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads, vehicle specs, vinyl tags..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/3 border border-glass-border text-xs text-white placeholder-[#d2e2ea]/40 focus:outline-none focus:border-[#d16b54] focus:ring-1 focus:ring-[#d16b54]/40 transition"
          />
        </div>
      </div>

      {/* Right: Studio Status & Actions */}
      <div className="flex items-center gap-3">
        {/* Real Live Studio Pulse Badge (Interactive) */}
        <button
          onClick={() => setViewersModalOpen(true)}
          title="Click to view live active viewer sessions"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold cursor-pointer transition shadow-lg shadow-emerald-950/20"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {activeVisitors}{" "}
            {activeVisitors === 1 ? "Active Visitor" : "Active Visitors"}
          </span>
          <span className="text-[10px] text-emerald-400/60 ml-0.5">▾</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 rounded-xl glass hover:bg-white/10 border border-glass-border text-white/80 hover:text-white transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#d16b54] text-[10px] font-black text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl glass border border-glass-border shadow-2xl p-4 text-left z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-glass-border">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Commission Alerts
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-[#d16b54] hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-8 text-center text-white/40 text-xs flex flex-col items-center">
                  <Inbox className="w-6 h-6 text-white/20 mb-2" />
                  <p className="font-semibold text-white/60">
                    No recent alerts
                  </p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    Customer orders and inquiries will alert here live.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto mt-2 space-y-1">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl transition ${
                        item.unread ? "bg-white/4" : "opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{item.title}</span>
                        </div>
                        <span className="text-[10px] text-white/40 shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Studio Link Button (Signature Customly-U 3D Studio Blue Gradient - Hidden on mobile screens) */}
        <Link
          href="/"
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-linear-to-r from-[#026dfe] to-[#0151c2] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-[#026dfe]/30 transition shrink-0"
        >
          <span>3D Studio</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Active Viewers Modal / Drawer */}
      {viewersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl glass border border-glass-border shadow-2xl p-6 space-y-6 text-white max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-glass-border pb-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Live 3D Studio Viewers
                  </h3>
                  <p className="text-xs text-[#d2e2ea]/50 mt-0.5">
                    {activeVisitors}{" "}
                    {activeVisitors === 1
                      ? "visitor session"
                      : "visitor sessions"}{" "}
                    active in the last 30 minutes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewersModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clarity Watch Screen Recording Action Banner */}
            <div className="p-4 rounded-xl bg-linear-to-r from-[#026dfe]/20 via-[#026dfe]/10 to-transparent border border-[#026dfe]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Video className="w-4 h-4 text-cyan-400" />
                  <span>Microsoft Clarity Live Recordings</span>
                </div>
                <p className="text-[11px] text-[#d2e2ea]/70 mt-1">
                  Watch mouse movements, car orbits, and clicks replay
                  video-style.
                </p>
              </div>
              <a
                href="https://clarity.microsoft.com/projects/view/zehs4x7j11/recordings"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#026dfe] hover:bg-[#026dfe]/90 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-md shadow-[#026dfe]/30"
              >
                <span>Watch Replays</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Sessions List */}
            <div className="space-y-3">
              <div className="text-[9px] uppercase font-bold text-[#d2e2ea]/50 tracking-[0.22em]">
                Active Sessions Breakdown
              </div>

              <div className="space-y-2.5">
                {activeSessions.map((session, index) => (
                  <div
                    key={session.id || index}
                    className="p-3.5 rounded-xl bg-white/3 border border-glass-border hover:border-white/20 transition flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                        {session.device === "Mobile" ? (
                          <Smartphone className="w-4 h-4" />
                        ) : session.device === "Tablet" ? (
                          <Tablet className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {session.activeModel}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#d2e2ea]/70 border border-white/10 font-semibold">
                            {session.device}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#d2e2ea]/60 flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[#d16b54]">
                            <Compass className="w-3 h-3" />
                            {session.lastAction}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#d2e2ea]/50">
                            <Eye className="w-3 h-3" />
                            {session.currentAngle}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {session.lastActiveAgo}
                      </span>
                      <span className="text-[9px] text-[#d2e2ea]/40 font-mono mt-0.5 block">
                        {session.id.slice(0, 12)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Close */}
            <div className="pt-2 border-t border-glass-border flex justify-end">
              <button
                onClick={() => setViewersModalOpen(false)}
                className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-white text-xs font-semibold border border-glass-border transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
