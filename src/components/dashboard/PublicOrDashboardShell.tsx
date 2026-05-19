"use client";

/**
 * Shell condicional para páginas PÚBLICAS que tienen UX distinto según auth:
 * - Logged in → DashboardSidebar + DashboardTopbar + MobileDrawer (chrome del dashboard)
 * - Anónimo  → PublicNav (chrome público con FAQ/Producto/etc)
 *
 * Usado en /practicas y /practicas/[id] — páginas que tienen que ser
 * accesibles a anónimos pero también encajar visualmente con el dashboard
 * cuando el user está logueado.
 */

import { useState } from "react";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { PublicNav } from "@/components/layout/PublicNav";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import {
  MobileDrawer,
  STUDENT_DRAWER_ITEMS,
  COMPANY_DRAWER_ITEMS,
} from "./MobileDrawer";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { ADMIN_EMAIL } from "@/lib/constants";

type Props = {
  /** Padding del `<main>` cuando hay session (dashboard chrome). */
  authenticatedMainClass?: string;
  /** Padding del `<main>` cuando NO hay session (public chrome). */
  publicMainClass?: string;
  /** Decoración opcional (mesh, glow) que va detrás del PublicNav. */
  publicBackdrop?: React.ReactNode;
  children: React.ReactNode;
};

export function PublicOrDashboardShell({
  authenticatedMainClass = "flex-1 relative py-6 md:py-8",
  publicMainClass = "relative z-10 pt-24 pb-20",
  publicBackdrop,
  children,
}: Props) {
  const { data: session } = useSession();

  // Sin sesión → chrome público. NO montamos AuthenticatedShell (que dispara
  // hooks como useUnreadCount → 401 si no hay session).
  if (!session) {
    return (
      <div className="relative min-h-screen bg-bg text-text font-[var(--font-onest),ui-sans-serif,system-ui] overflow-x-hidden">
        {publicBackdrop}
        <PublicNav isLoggedIn={false} />
        <main className={publicMainClass}>{children}</main>
      </div>
    );
  }

  return (
    <AuthenticatedShell session={session} mainClass={authenticatedMainClass}>
      {children}
    </AuthenticatedShell>
  );
}

/**
 * Subcomponente: solo se monta cuando hay sesión. Sus hooks (useUnreadCount)
 * solo se ejecutan en ese caso → no hay 401 cuando el user no está logueado.
 */
function AuthenticatedShell({
  session,
  mainClass,
  children,
}: {
  session: Session;
  mainClass: string;
  children: React.ReactNode;
}) {
  const unreadCount = useUnreadCount();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const role = session.user.role as "STUDENT" | "COMPANY" | undefined;
  const isAdmin = session.user.email === ADMIN_EMAIL;
  const userName = session.user.name ?? "Usuario";
  const userEmail = session.user.email ?? "";
  const userImage = session.user.image;
  const items =
    role === "COMPANY" ? COMPANY_DRAWER_ITEMS : STUDENT_DRAWER_ITEMS;
  const roleLabel =
    role === "STUDENT"
      ? "Estudiante"
      : role === "COMPANY"
        ? "Empresa"
        : "Usuario";

  return (
    <div
      data-palette={role === "COMPANY" ? "company" : "student"}
      className="min-h-screen bg-bg text-text flex"
    >
      <DashboardSidebar role={role} unreadInbox={unreadCount} cvPct={null} />
      <div className="flex-1 min-w-0 flex flex-col">
        <DashboardTopbar
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          isAdmin={isAdmin}
          role={role}
          onMenu={() => setDrawerOpen(true)}
        />
        <main className={mainClass}>{children}</main>
      </div>
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={items}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        roleLabel={roleLabel}
        isAdmin={isAdmin}
        unreadCount={unreadCount}
      />
    </div>
  );
}
