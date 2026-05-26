"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

/* ── Tipos compartidos ── */
import type {
  Internship,
  Applicant,
  Interview,
  Conversation,
  StageCounts,
} from "@/components/dashboard/sections/empresa/types";
import {
  EMPTY_FORM,
  type EmpForm,
} from "@/components/dashboard/sections/empresa/types";

/* ── Helpers ── */
import { startOfDay } from "@/components/dashboard/sections/empresa/utils";

/* ── Sub-componentes ── */
import { StatusBanner } from "@/components/dashboard/sections/empresa/StatusBanner";
import { HeroEmp } from "@/components/dashboard/sections/empresa/HeroEmp";
import { PracticasActivas } from "@/components/dashboard/sections/empresa/PracticasActivas";
import { PostulantesNuevos } from "@/components/dashboard/sections/empresa/PostulantesNuevos";
import { ProximasEntrevistas } from "@/components/dashboard/sections/empresa/ProximasEntrevistas";
import { InboxMini } from "@/components/dashboard/sections/empresa/InboxMini";
import { CalendarMini } from "@/components/dashboard/sections/empresa/CalendarMini";
import { PublishModal } from "@/components/dashboard/sections/empresa/PublishModal";
import { ConfirmActionModal } from "@/components/dashboard/sections/empresa/ConfirmActionModal";

/* Re-exportamos tipos para mantener compatibilidad con cualquier importador externo. */
export type { Internship, Applicant, Interview, Conversation };

export default function CompanyDashboard() {
  const { data: session } = useSession();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [companyStatus, setCompanyStatus] = useState<string | null>(null);
  const [applicantsByInt, setApplicantsByInt] = useState<
    Record<string, Applicant[]>
  >({});
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmpForm>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof EmpForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "finalize" | "delete";
  } | null>(null);
  // Edición: editingId !== null → modal en modo "edit". Cuando es null y
  // showForm es true → modo "create".
  const [editingId, setEditingId] = useState<string | null>(null);
  const [globalFormError, setGlobalFormError] = useState<string | null>(null);

  /* ── API handlers ── */

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    setProcessingId(id);
    try {
      const res = await fetchWithRefresh(`/api/internships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (res.ok) {
        setInternships((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isActive: nextActive } : i)),
        );
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetchWithRefresh(`/api/internships/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Soft delete: la práctica NO desaparece del state — pasa a la tab
        // "Eliminadas" con deletedAt seteado. Preserva info histórica.
        const nowIso = new Date().toISOString();
        setInternships((prev) =>
          prev.map((i) => (i.id === id ? { ...i, deletedAt: nowIso } : i)),
        );
      }
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [intsRes, intvRes, convRes] = await Promise.all([
        fetchWithRefresh("/api/company/internships?includeDeleted=1", {
          cache: "no-store",
        }),
        fetchWithRefresh("/api/interviews?status=SCHEDULED", {
          cache: "no-store",
        }),
        fetchWithRefresh("/api/chat/conversations", { cache: "no-store" }),
      ]);

      const intsData = intsRes.ok ? await intsRes.json() : { internships: [] };
      const ints: Internship[] = intsData.internships ?? [];
      setInternships(ints);
      if (intsData.companyStatus) setCompanyStatus(intsData.companyStatus);

      if (intvRes.ok) {
        const intv = await intvRes.json();
        setInterviews(Array.isArray(intv) ? intv : []);
      }
      if (convRes.ok) {
        const conv = await convRes.json();
        setConversations(Array.isArray(conv) ? conv : []);
      }

      // "active" para el bulk fetch de postulantes: solo prácticas vivas
      // (no eliminadas y aún abiertas). Las eliminadas mantienen su lista
      // de aplicantes histórica accesible desde el ATS, pero no inflamos
      // el dashboard con sus postulantes "nuevos".
      const active = ints.filter((i) => i.isActive && !i.deletedAt);
      const applicantsArr: Array<[string, Applicant[]]> = await Promise.all(
        active.map(async (i): Promise<[string, Applicant[]]> => {
          try {
            const r = await fetchWithRefresh(
              `/api/applications/internship/${i.id}`,
              {
                cache: "no-store",
              },
            );
            if (!r.ok) return [i.id, []];
            const data = (await r.json()) as Applicant[];
            return [i.id, data.map((a) => ({ ...a, internshipId: i.id }))];
          } catch {
            return [i.id, []];
          }
        }),
      );
      const map: Record<string, Applicant[]> = {};
      for (const [id, list] of applicantsArr) map[id] = list;
      setApplicantsByInt(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadAll();
  }, [session]);

  /* ── Derived state ── */

  const activeInternships = useMemo(
    () => internships.filter((i) => i.isActive && !i.deletedAt),
    [internships],
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, StageCounts> = {};
    for (const i of internships) {
      const list = applicantsByInt[i.id] ?? [];
      counts[i.id] = {
        nuevos: list.filter(
          (a) =>
            a.pipelineStatus === "PENDING" ||
            (!a.pipelineStatus && a.status === "PENDING"),
        ).length,
        screening: list.filter(
          (a) =>
            a.pipelineStatus === "REVIEWING" ||
            (!a.pipelineStatus && a.status === "REVIEWED"),
        ).length,
        entrev: list.filter((a) => a.pipelineStatus === "INTERVIEW").length,
        ofertas: list.filter((a) => a.status === "ACCEPTED").length,
        total: list.length,
      };
    }
    return counts;
  }, [internships, applicantsByInt]);

  const newApplicants = useMemo(() => {
    const all: Applicant[] = [];
    for (const list of Object.values(applicantsByInt)) {
      for (const a of list) if (a.status === "PENDING") all.push(a);
    }
    return all.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }, [applicantsByInt]);

  const kpis = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const interviewsToday = interviews.filter((i) => {
      const t = new Date(i.scheduledAt);
      return t >= todayStart && t < todayEnd;
    }).length;
    const accepted = Object.values(applicantsByInt)
      .flat()
      .filter((a) => a.status !== "PENDING").length;
    const total = Object.values(applicantsByInt).flat().length;
    const responseRate =
      total > 0 ? Math.round((accepted / total) * 100) : null;
    return {
      nuevos: newApplicants.length,
      activas: activeInternships.length,
      hoy: interviewsToday,
      tasa: responseRate,
    };
  }, [newApplicants, activeInternships, interviews, applicantsByInt]);

  const interviewsHoy = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return interviews
      .filter((i) => new Date(i.scheduledAt) >= todayStart)
      .slice(0, 4);
  }, [interviews]);

  const inboxTop = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => {
          const ta = a.lastMessage
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const tb = b.lastMessage
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return tb - ta;
        })
        .slice(0, 4),
    [conversations],
  );

  /* ── Form handlers ── */

  const recruiterName = session?.user?.name?.split(" ")[0] ?? "Reclutador";

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const validateForm = (): Partial<Record<keyof EmpForm, string>> => {
    const errs: Partial<Record<keyof EmpForm, string>> = {};
    if (!form.title.trim() || form.title.trim().length < 3)
      errs.title = "El título debe tener al menos 3 caracteres";
    if (!form.description.trim() || form.description.trim().length < 20)
      errs.description = "La descripción debe tener al menos 20 caracteres";
    if (!form.location.trim()) errs.location = "La ubicación es obligatoria";
    if (!form.duration.trim()) errs.duration = "La duración es obligatoria";
    if (!form.skills.trim()) errs.skills = "Ingresa al menos una skill";
    if (!form.requirements.trim())
      errs.requirements = "Ingresa al menos un requisito";
    return errs;
  };

  // GET práctica completa → llena el form para editar. Reusa el endpoint
  // existente (que ya pasa owner via session) y mapea al shape del form.
  const handleOpenEdit = async (id: string) => {
    setProcessingId(id);
    setGlobalFormError(null);
    try {
      const res = await fetchWithRefresh(`/api/internships/${id}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setForm({
        title: data.title ?? "",
        description: data.description ?? "",
        area: data.area ?? EMPTY_FORM.area,
        location: data.location ?? "",
        modality: data.modality ?? EMPTY_FORM.modality,
        duration: data.duration ?? "",
        skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
        responsibilities: Array.isArray(data.responsibilities)
          ? data.responsibilities.join("\n")
          : "",
        requirements: Array.isArray(data.requirements)
          ? data.requirements.join(", ")
          : "",
      });
      setFormErrors({});
      setEditingId(id);
      setShowForm(true);
    } finally {
      setProcessingId(null);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setGlobalFormError(null);
  };

  // Abre el modal en modo CREATE: limpia cualquier residuo de edición previa
  // antes de mostrar. Necesario porque setShowForm(true) directo no resetea
  // editingId si la última interacción había sido un edit.
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setGlobalFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalFormError(null);
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setSubmitting(true);
    const toArray = (s: string) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    const payload = {
      ...form,
      skills: toArray(form.skills),
      requirements: toArray(form.requirements),
      responsibilities: form.responsibilities
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    };
    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/internships/${editingId}` : "/api/internships";
      const res = await fetchWithRefresh(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        closeForm();
        await loadAll();
        return;
      }
      // 409 = ya hay postulantes (race condition: alguien postuló entre el
      // open del modal y el submit, o el botón se forzó vía DevTools).
      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        setGlobalFormError(
          body?.error ??
            "No podés editar esta práctica porque ya tiene postulantes.",
        );
        return;
      }
      // 400 con field errors del backend
      if (res.status === 400) {
        const body = await res.json().catch(() => null);
        setGlobalFormError(body?.error ?? "Datos inválidos.");
        return;
      }
      setGlobalFormError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ── */

  return (
    <div className="bg-bg min-h-full px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 pb-16 [font-family:var(--font-onest),ui-sans-serif,system-ui]">
      <div className="max-w-[1400px] mx-auto">
        {/* Status banners (empresa en revisión / rechazada) */}
        {companyStatus === "PENDING" && (
          <StatusBanner
            tone="amber"
            title="Cuenta en revisión"
            body="Tus prácticas no serán visibles para estudiantes hasta que aprobemos tu empresa."
            icon="alert"
          />
        )}
        {companyStatus === "REJECTED" && (
          <StatusBanner
            tone="rose"
            title="Cuenta rechazada"
            body="Contacta a soporte@practix.cl para más información."
            icon="x"
          />
        )}

        {/* Hero con KPIs */}
        <HeroEmp
          today={today.charAt(0).toUpperCase() + today.slice(1)}
          recruiterName={recruiterName}
          kpis={kpis}
          onPublish={handleOpenCreate}
        />

        {/*
          Layout principal: columna izquierda (prácticas + postulantes)
          + rail derecho (entrevistas, inbox, calendar).
          Mobile: 1 columna. lg+: split [1fr 340px].
        */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3.5 items-start">
          {/* Columna principal */}
          <div className="flex flex-col gap-3.5 min-w-0">
            <PracticasActivas
              internships={internships}
              stageCounts={stageCounts}
              loading={loading}
              onPublish={handleOpenCreate}
              onAskFinalize={(id) => setConfirmAction({ id, type: "finalize" })}
              onAskDelete={(id) => setConfirmAction({ id, type: "delete" })}
              onEdit={handleOpenEdit}
              processingId={processingId}
            />
            <PostulantesNuevos
              applicants={newApplicants}
              internships={internships}
              loading={loading}
              onRefresh={loadAll}
            />
          </div>

          {/* Rail lateral — sticky en desktop, fluye en mobile */}
          <aside className="flex flex-col gap-3.5 lg:sticky lg:top-3">
            <ProximasEntrevistas interviews={interviewsHoy} loading={loading} />
            <InboxMini conversations={inboxTop} loading={loading} />
            <CalendarMini interviews={interviews} />
          </aside>
        </div>
      </div>

      {/* Modal: publicar / editar práctica (mismo componente, modo distinto) */}
      {showForm && (
        <PublishModal
          form={form}
          formErrors={formErrors}
          submitting={submitting}
          mode={editingId ? "edit" : "create"}
          globalError={globalFormError}
          onChange={(key, value) => {
            setForm((f) => ({ ...f, [key]: value }));
            setFormErrors((errs) => ({ ...errs, [key]: undefined }));
          }}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      {/* Modal: confirmar finalizar / eliminar */}
      {confirmAction &&
        (() => {
          const target = internships.find((i) => i.id === confirmAction.id);
          if (!target) return null;
          return (
            <ConfirmActionModal
              type={confirmAction.type}
              busy={processingId === confirmAction.id}
              internshipTitle={target.title}
              onCancel={() => setConfirmAction(null)}
              onConfirm={async () => {
                if (confirmAction.type === "finalize") {
                  await handleToggleActive(confirmAction.id, false);
                  setConfirmAction(null);
                } else {
                  await handleDelete(confirmAction.id);
                }
              }}
            />
          );
        })()}
    </div>
  );
}
