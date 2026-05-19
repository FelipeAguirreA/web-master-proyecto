"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

import type { Company, TabKey } from "./_components/types";
import { SidebarAdmin } from "./_components/SidebarAdmin";
import { TopbarAdmin } from "./_components/TopbarAdmin";
import { StatsBar } from "./_components/StatsBar";
import { AdminFilterBar } from "./_components/AdminFilterBar";
import { BulkActionBar } from "./_components/BulkActionBar";
import { EmpresaTable } from "./_components/EmpresaTable";
import { EmpresaCard } from "./_components/EmpresaCard";
import { EmpresaDrawer } from "./_components/EmpresaDrawer";
import { SuspendModal } from "./_components/SuspendModal";
import { EmptyState } from "./_components/EmptyState";

export default function AdminEmpresasPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("PENDING");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Company | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Company | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // --- Carga inicial ---
  const load = async () => {
    try {
      const res = await fetchWithRefresh("/api/admin/empresas");
      const data = await res.json();
      setCompanies((data.companies ?? []) as Company[]);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // --- Derivados ---
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      SUSPENDED: 0,
    };
    for (const e of companies) c[e.companyStatus]++;
    return c;
  }, [companies]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sRutNorm = s.replace(/[.\-\s]/g, "");
    return companies.filter((e) => {
      if (e.companyStatus !== tab) return false;
      if (!s) return true;
      const rutNorm = (e.empresaRut || "")
        .toLowerCase()
        .replace(/[.\-\s]/g, "");
      return (
        e.companyName.toLowerCase().includes(s) ||
        rutNorm.includes(sRutNorm) ||
        e.user.email.toLowerCase().includes(s) ||
        (e.industry || "").toLowerCase().includes(s)
      );
    });
  }, [companies, tab, q]);

  // --- Mutaciones locales ---
  const applyLocal = (id: string, patch: Partial<Company>) =>
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );

  const callAction = async (
    id: string,
    body: Record<string, unknown>,
  ): Promise<Company | null> => {
    setProcessing(id);
    try {
      const res = await fetchWithRefresh(`/api/admin/empresas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as Company;
    } finally {
      setProcessing(null);
    }
  };

  const approve = async (id: string) => {
    const updated = await callAction(id, { action: "approve" });
    if (updated) {
      applyLocal(id, {
        companyStatus: "APPROVED",
        suspensionReason: null,
        suspendedAt: null,
      });
      if (active?.id === id) setActive(null);
    }
  };

  const reject = async (id: string) => {
    const updated = await callAction(id, { action: "reject" });
    if (updated) {
      applyLocal(id, { companyStatus: "REJECTED" });
      if (active?.id === id) setActive(null);
    }
  };

  const unsuspend = async (id: string) => {
    const updated = await callAction(id, { action: "unsuspend" });
    if (updated) {
      applyLocal(id, {
        companyStatus: "APPROVED",
        suspensionReason: null,
        suspendedAt: null,
      });
      if (active?.id === id) setActive(null);
    }
  };

  const reopen = async (id: string) => {
    const updated = await callAction(id, { action: "reopen" });
    if (updated) {
      applyLocal(id, {
        companyStatus: "PENDING",
        suspensionReason: null,
        suspendedAt: null,
      });
      if (active?.id === id) setActive(null);
    }
  };

  const suspendWithReason = async (reason: string) => {
    if (!suspendTarget) return;
    const id = suspendTarget.id;
    const body: Record<string, unknown> = { action: "suspend" };
    if (reason) body.reason = reason;
    const updated = await callAction(id, body);
    if (updated) {
      applyLocal(id, {
        companyStatus: "SUSPENDED",
        suspensionReason: reason || null,
        suspendedAt: new Date().toISOString(),
      });
      setSuspendTarget(null);
      if (active?.id === id) setActive(null);
    }
  };

  // --- Selección bulk ---
  const bulkApprove = async () => {
    for (const id of Array.from(selected)) await approve(id);
    setSelected(new Set());
  };

  const bulkReject = async () => {
    for (const id of Array.from(selected)) await reject(id);
    setSelected(new Set());
  };

  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(filtered.map((c) => c.id)));
  const clearSel = () => setSelected(new Set());

  // --- Session ---
  const adminName = session?.user?.name ?? "Admin";
  const adminEmail = session?.user?.email ?? "";
  const adminImage = session?.user?.image ?? null;

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar (hidden mobile, visible md+) */}
      <SidebarAdmin pendingCount={counts.PENDING} />

      {/* Contenido principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopbarAdmin
          adminName={adminName}
          adminEmail={adminEmail}
          adminImage={adminImage}
          pendingCount={counts.PENDING}
        />

        <main className="px-4 sm:px-6 md:px-8 py-5 md:py-7 max-w-[1400px] w-full mx-auto">
          {/* Encabezado */}
          <header className="flex justify-between items-start gap-3.5 mb-3.5 flex-wrap">
            <div>
              <h1 className="text-[clamp(1.4rem,2.2vw,1.8rem)] font-extrabold text-text tracking-[-1px] leading-[1.1] m-0">
                Empresas
              </h1>
              <p className="text-[13px] text-subtle mt-[5px]">
                Aprueba, rechaza o suspende empresas que se registran en
                PractiX.
              </p>
            </div>
          </header>

          {/* Stats */}
          <StatsBar counts={counts} />

          {/* Tabla / Cards */}
          <section className="bg-surface border border-border rounded-[14px] overflow-hidden">
            <AdminFilterBar
              tab={tab}
              counts={counts}
              q={q}
              onTabChange={(t) => {
                setTab(t);
                clearSel();
              }}
              onSearchChange={setQ}
            />

            {/* Bulk actions (solo PENDING con selección) */}
            {selected.size > 0 && tab === "PENDING" && (
              <BulkActionBar
                selectedCount={selected.size}
                processing={processing !== null}
                onApproveAll={bulkApprove}
                onRejectAll={bulkReject}
                onClear={clearSel}
              />
            )}

            {/* Mobile: cards */}
            <div className="md:hidden">
              {loading || filtered.length === 0 ? (
                <EmptyState loading={loading} />
              ) : (
                filtered.map((c) => (
                  <EmpresaCard
                    key={c.id}
                    company={c}
                    tab={tab}
                    selected={selected.has(c.id)}
                    processing={processing !== null}
                    onSelect={() => toggleSel(c.id)}
                    onOpen={() => setActive(c)}
                    onApprove={approve}
                    onReject={reject}
                  />
                ))
              )}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden md:block">
              <EmpresaTable
                companies={companies}
                tab={tab}
                loading={loading}
                selected={selected}
                filtered={filtered}
                processing={processing !== null}
                onToggleSel={toggleSel}
                onSelectAll={selectAll}
                onClearSel={clearSel}
                onOpen={setActive}
                onApprove={approve}
                onReject={reject}
              />
            </div>
          </section>
        </main>
      </div>

      {/* Detalle drawer */}
      {active && (
        <EmpresaDrawer
          emp={active}
          onClose={() => setActive(null)}
          onApprove={approve}
          onReject={reject}
          onUnsuspend={unsuspend}
          onReopen={reopen}
          onOpenSuspend={(emp) => setSuspendTarget(emp)}
          processing={processing !== null}
        />
      )}

      {/* Modal suspensión */}
      {suspendTarget && (
        <SuspendModal
          emp={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onConfirm={suspendWithReason}
          processing={processing === suspendTarget.id}
        />
      )}
    </div>
  );
}
