"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/constants";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9ff]">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const name = session.user.name ?? "";
  const initial = name.charAt(0).toUpperCase();
  const roleLabel =
    session.user.role === "STUDENT"
      ? "Estudiante"
      : session.user.role === "COMPANY"
        ? "Empresa"
        : "Usuario";

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f9ff]">
      <header className="bg-[#f9f9ff]/80 backdrop-blur-xl border-b border-gray-100/60 sticky top-0 z-40 h-20">
        <div className="max-w-screen-2xl mx-auto px-8 h-full flex items-center justify-between">
          {/* Logo + nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="font-black text-2xl tracking-tighter">
              <span className="text-brand-700">Practi</span>
              <span className="text-accent-500">X</span>
            </Link>
            <nav className="hidden md:flex gap-6 items-center">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/practicas", label: "Explorar prácticas" },
              ].map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`text-sm font-bold pb-0.5 transition-colors ${
                      active
                        ? "text-brand-700 border-b-2 border-brand-700"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-4">
            {session.user.email === ADMIN_EMAIL && (
              <Link
                href="/admin/empresas"
                className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors"
              >
                Admin
              </Link>
            )}

            {/* Campana */}
            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
              <Bell className="w-5 h-5" />
            </button>

            {/* Separador + usuario */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-gray-900">{name}</span>
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                  {roleLabel}
                </span>
              </div>
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={name}
                  className="w-10 h-10 rounded-full border-2 border-brand-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold border-2 border-brand-200">
                  {initial}
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
