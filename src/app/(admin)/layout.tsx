"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ADMIN_EMAIL } from "@/lib/constants";

// El layout admin sólo cumple un rol: guarda de auth. El chrome (sidebar +
// topbar) vive dentro de cada página para que el rediseño Claude Design
// controle su propio layout y no se apilen dos navbars.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.email !== ADMIN_EMAIL) {
      router.replace("/login");
    }
  }, [session, status, router]);

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

  return <>{children}</>;
}
