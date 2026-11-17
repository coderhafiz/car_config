import React from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";

export const metadata = {
  title: "Management Dashboard | Customly-U 3D Intelligence",
  description:
    "Executive intelligence, customisation behaviour, conversion funnels, and bespoke commission leads for Customly-U.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#06090b] text-[#edf2f4] font-sans antialiased selection:bg-[#d16b54] selection:text-white relative">
      {/* Ambient 3D Studio lighting glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -15%, rgba(2, 109, 254, 0.15) 0%, rgba(209, 107, 84, 0.05) 50%, transparent 80%)",
        }}
      />

      {/* Fixed Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen relative z-10">
        <AdminNavbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}

