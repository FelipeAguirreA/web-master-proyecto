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
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 border-2 border-accent/25 border-t-accent rounded-full animate-spin" />
      <p className="text-[12.5px] text-muted">Preparando tu panel…</p>
    </div>
  );
}
