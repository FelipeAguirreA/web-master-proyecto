import { PublicNav } from "@/components/layout/PublicNav";
import { ADMIN_EMAIL } from "@/lib/constants";
import { AmbientMesh } from "./AmbientMesh";
import type { Session } from "next-auth";

interface SkeletonDetailProps {
  session: Session | null;
}

export function SkeletonDetail({ session }: SkeletonDetailProps) {
  return (
    <div className="relative min-h-screen bg-bg text-text font-[var(--font-onest),ui-sans-serif,system-ui] overflow-x-hidden">
      <AmbientMesh />
      <PublicNav
        isLoggedIn={!!session}
        isAdmin={session?.user.email === ADMIN_EMAIL}
      />
      <main className="relative z-10 pt-24 pb-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 flex items-center justify-center min-h-[320px]">
          {/* Non-standard 0.9s timing — uses practix-det-spin from globals.css */}
          <div
            className="w-9 h-9 rounded-full border-2 border-accent/[.15] border-t-accent"
            style={{ animation: "practix-det-spin .9s linear infinite" }}
          />
        </div>
      </main>
    </div>
  );
}
