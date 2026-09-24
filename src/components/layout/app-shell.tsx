"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/primitives";
import { CommandPalette } from "./command-palette";
import {
  LayoutDashboard, CalendarDays, CalendarRange, ClipboardList, Images,
  Users, BarChart3, Target, Package, FileBarChart, Tags,
  Settings, LogOut, Search, Menu, X, ChevronDown, Radio, Building2,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/public-engagement", label: "Public Engagement", icon: Radio },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/event-types", label: "Event Types", icon: Tags },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/daily-reports", label: "Daily Reports", icon: ClipboardList },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/partners", label: "Partners / Hosts", icon: Building2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/goals", label: "Goals / Pipeline", icon: Target },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user.role === "super_admin" || user.role === "admin";

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0 border-b">
        <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--brand)" }} aria-hidden>
          <Radio size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[14px] leading-tight tracking-tight">SAT-7 Insights</p>
          <p className="text-[10.5px] text-slate-500 leading-tight">Public Engagement Portal</p>
        </div>
        <button className="lg:hidden ml-auto text-slate-400" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto thin-scroll py-3 px-3 space-y-0.5" aria-label="Main navigation">
        {NAV.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium transition-colors",
                active ? "text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
              style={active ? { background: "var(--brand)" } : undefined}
            >
              <Icon size={17} className="shrink-0" style={active ? { color: "#fff" } : { color: "#64748b" }} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* user */}
      <div className="p-3 border-t shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
          <Avatar name={user.full_name} size={30} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{user.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate capitalize">{user.role.replace("_", " ")}</p>
          </div>
          <ChevronDown size={15} className="text-slate-400" />
        </div>
        {menuOpen && (
          <div className="mt-1 space-y-0.5">
            <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 rounded-lg text-[13px] text-slate-600 hover:bg-slate-100">
              <Settings size={15} /> Settings
            </Link>
            <button onClick={signOut} className="w-full flex items-center gap-2.5 px-4 py-2 rounded-lg text-[13px] text-red-600 hover:bg-red-50">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r bg-white sticky top-0 h-screen" aria-label="Sidebar">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0" style={{ background: "rgba(15,23,42,0.4)" }} onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* topbar */}
        <header className="h-16 border-b bg-white/85 backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 no-print">
          <button className="lg:hidden text-slate-500" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
            className="flex items-center gap-2.5 flex-1 max-w-md ml-1 px-3.5 py-2 rounded-[10px] border text-left text-slate-400 hover:border-slate-300 transition-colors"
            aria-label="Open search"
          >
            <Search size={15} />
            <span className="text-[13px] flex-1">Search…</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10.5px] text-slate-400 border rounded px-1.5 py-0.5 bg-slate-50">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="badge hidden sm:inline-flex" style={{ background: "var(--brand-soft)", color: "#1e40af" }}>
              {user.role.replace("_", " ")}
            </span>
            <Avatar name={user.full_name} size={32} />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>

      <CommandPalette />
    </div>
  );
}
