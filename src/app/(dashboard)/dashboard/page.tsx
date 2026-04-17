"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (session.user.role === "COMPANY") {
      router.replace("/dashboard/empresa");
    } else {
      router.replace("/dashboard/estudiante");
    }
  }, [session, status, router]);

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center gap-3"
      style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
    >
      <div className="w-9 h-9 border-2 border-[#FF6A3D]/25 border-t-[#FF6A3D] rounded-full animate-spin" />
      <p className="text-[12.5px] text-[#6D6A63]">Preparando tu panel…</p>
    </div>
  );
}
