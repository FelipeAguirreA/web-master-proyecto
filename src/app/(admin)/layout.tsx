"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/constants";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.email !== ADMIN_EMAIL) {
      router.replace("/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#FAFAF8]"
        style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
      >
        <div className="w-8 h-8 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || session.user.email !== ADMIN_EMAIL) return null;

  const name = session.user.name ?? "";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#0A0909] relative"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      {/* Ambient warm mesh */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        aria-hidden
      >
        <div className="absolute -top-40 -left-32 w-[620px] h-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(255,181,124,0.22),transparent_72%)] blur-[70px]" />
        <div className="absolute top-1/2 -right-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,138,82,0.16),transparent_70%)] blur-[70px]" />
      </div>

      <header className="sticky top-0 z-40 px-4 md:px-6 pt-4">
        <div className="max-w-screen-2xl mx-auto bg-white/75 backdrop-blur-xl border border-black/[0.06] rounded-2xl shadow-[0_8px_24px_-12px_rgba(20,15,10,0.08)] px-4 md:px-5 h-16 flex items-center justify-between">
          {/* Logo + badge admin */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[17px] font-bold tracking-[-0.02em] text-[#0A0909] hover:opacity-80 transition-opacity"
            >
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A3D] to-[#FF9B6A] flex items-center justify-center text-white text-[13px] shadow-[0_4px_12px_-2px_rgba(255,106,61,0.4)]">
                P
              </span>
              Practi
              <span className="bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] bg-clip-text text-transparent">
                X
              </span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold bg-[#0A0909] text-white px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3 h-3" strokeWidth={2.4} />
              Admin
            </span>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-medium text-[#4A4843] hover:text-[#0A0909] bg-white hover:bg-[#FAFAF8] border border-black/[0.06] px-2.5 sm:px-3 py-1.5 rounded-xl transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Volver</span>
            </Link>
          </div>

          {/* Usuario + dropdown */}
          <div
            ref={dropdownRef}
            className="relative flex items-center gap-2.5 pl-3 border-l border-black/[0.06]"
          >
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-[12.5px] font-semibold text-[#0A0909] tracking-[-0.01em]">
                {name || "Administrador"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.08em] text-[#9B9891] font-semibold">
                Super admin
              </span>
            </div>

            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1 group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0A0909] to-[#2a2722] text-white flex items-center justify-center text-[13px] font-bold ring-2 ring-white shadow-[0_2px_8px_-2px_rgba(20,15,10,0.3)] group-hover:shadow-[0_4px_12px_-2px_rgba(20,15,10,0.4)] transition-all">
                {initial || "A"}
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#9B9891] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-[0_16px_48px_-12px_rgba(20,15,10,0.18)] border border-black/[0.06] overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-black/[0.05]">
                  <p className="text-[13px] font-semibold text-[#0A0909] truncate">
                    {name || "Administrador"}
                  </p>
                  <p className="text-[11.5px] text-[#6D6A63] truncate mt-0.5">
                    {session.user.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#4A4843] hover:bg-[#FAFAF8] hover:text-[#0A0909] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Volver al dashboard
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-[#C2410C] hover:bg-[#FFF0ED] transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">{children}</main>
    </div>
  );
}
