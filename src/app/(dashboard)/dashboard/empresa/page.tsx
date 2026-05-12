"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { E } from "@/components/dashboard/palettes";
import { Icon } from "@/components/dashboard/Icon";
import { Avatar } from "@/components/dashboard/atoms/Avatar";
import { ScoreVis } from "@/components/dashboard/atoms/ScoreVis";

/** "hoy", "ayer", "hace 5 días", "hace 2 meses". Pensado para mostrar
 *  cuándo se publicó una práctica, sin pseudoplurales raros. */
function publishedAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const day = 24 * 3600 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}

type Internship = {
  id: string;
  title: string;
  description: string;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  skills: string[];
  responsibilities?: string[];
  requirements: string[];
  isActive: boolean;
  createdAt: string;
};

type StudentProfile = { university?: string; career?: string };

type Applicant = {
  id: string;
  internshipId: string;
  matchScore: number;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  pipelineStatus?: "PENDING" | "REVIEWING" | "INTERVIEW" | "REJECTED";
  createdAt: string;
  student: {
    name: string;
    email: string;
    image?: string | null;
    studentProfile?: StudentProfile | null;
  };
};

type Interview = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMins: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  meetingLink?: string | null;
  mode?: string | null;
  student: { id: string; name: string; image?: string | null };
  internship: { id: string; title: string };
  conversation?: { id: string };
};

type Conversation = {
  id: string;
  student: { id: string; name: string; image?: string | null };
  internship?: { id: string; title: string };
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount?: number;
  updatedAt: string;
};

const AREAS = [
  "Ingeniería",
  "Marketing",
  "Diseño",
  "Datos",
  "Finanzas",
  "RRHH",
  "Legal",
  "Operaciones",
  "Producto",
];

const MODALITIES = [
  { value: "REMOTE", label: "Remoto" },
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
];

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  area: AREAS[0],
  location: "",
  modality: "REMOTE",
  duration: "",
  skills: "",
  responsibilities: "",
  requirements: "",
};

function avatarColors(name: string): [string, string] {
  const palette: Array<[string, string]> = [
    ["#FFD4B8", "#FF9B6A"],
    ["#B8E6D4", "#3DBE85"],
    ["#D8C4FF", "#7C3AED"],
    ["#B8C9FF", "#2C5CFA"],
    ["#FFE6A8", "#D69E2E"],
    ["#FFD4B8", "#C74A1E"],
    ["#A8E0FF", "#0EA5E9"],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay() === 0 ? 7 : x.getDay();
  x.setDate(x.getDate() - (day - 1));
  return x;
}

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
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof typeof EMPTY_FORM, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "finalize" | "delete";
  } | null>(null);

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
        setInternships((prev) => prev.filter((i) => i.id !== id));
        setApplicantsByInt((prev) => {
          const { [id]: _omit, ...rest } = prev;
          return rest;
        });
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
        fetchWithRefresh("/api/company/internships", { cache: "no-store" }),
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

      const active = ints.filter((i) => i.isActive);
      const applicantsArr: Array<[string, Applicant[]]> = await Promise.all(
        active.map(async (i): Promise<[string, Applicant[]]> => {
          try {
            const r = await fetchWithRefresh(
              `/api/applications/internship/${i.id}`,
              { cache: "no-store" },
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

  const activeInternships = useMemo(
    () => internships.filter((i) => i.isActive),
    [internships],
  );

  const stageCounts = useMemo(() => {
    const counts: Record<
      string,
      {
        nuevos: number;
        screening: number;
        entrev: number;
        ofertas: number;
        total: number;
      }
    > = {};
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

  const recruiterName = session?.user?.name?.split(" ")[0] ?? "Reclutador";

  const validateForm = (): Partial<Record<keyof typeof EMPTY_FORM, string>> => {
    const errs: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
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

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
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
    try {
      const res = await fetchWithRefresh("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: toArray(form.skills),
          requirements: toArray(form.requirements),
          responsibilities: form.responsibilities
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        setFormErrors({});
        await loadAll();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      style={{
        background: E.bg,
        minHeight: "100%",
        padding: "20px 24px 60px",
        fontFamily: "var(--font-onest), ui-sans-serif, system-ui",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
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

        <HeroEmp
          today={today.charAt(0).toUpperCase() + today.slice(1)}
          recruiterName={recruiterName}
          kpis={kpis}
          onPublish={() => setShowForm(true)}
        />

        <div
          className="practix-emp-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 340px",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              minWidth: 0,
            }}
          >
            <PracticasActivas
              internships={internships}
              stageCounts={stageCounts}
              loading={loading}
              onPublish={() => setShowForm(true)}
              onAskFinalize={(id) => setConfirmAction({ id, type: "finalize" })}
              onAskDelete={(id) => setConfirmAction({ id, type: "delete" })}
              processingId={processingId}
            />
            <PostulantesNuevos
              applicants={newApplicants}
              internships={internships}
              loading={loading}
              onRefresh={loadAll}
            />
          </div>

          <aside
            className="practix-emp-rail"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              position: "sticky",
              top: 76,
            }}
          >
            <ProximasEntrevistas interviews={interviewsHoy} loading={loading} />
            <InboxMini conversations={inboxTop} loading={loading} />
            <CalendarMini interviews={interviews} />
          </aside>
        </div>
      </div>

      {showForm && (
        <PublishModal
          form={form}
          formErrors={formErrors}
          submitting={submitting}
          onChange={(key, value) => {
            setForm((f) => ({ ...f, [key]: value }));
            setFormErrors((errs) => ({ ...errs, [key]: undefined }));
          }}
          onClose={() => {
            setShowForm(false);
            setFormErrors({});
          }}
          onSubmit={handleCreate}
        />
      )}

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

      <style>{`
        @media (max-width: 1024px) {
          .practix-emp-grid { grid-template-columns: 1fr !important; }
          .practix-emp-rail { position: static !important; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────── Status banner ───────────────── */

function StatusBanner({
  tone,
  title,
  body,
  icon,
}: {
  tone: "amber" | "rose";
  title: string;
  body: string;
  icon: "alert" | "x";
}) {
  const c = tone === "amber" ? E.amber : E.rose;
  const bg = tone === "amber" ? E.amberBg : E.roseBg;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${c}33`,
        borderRadius: 14,
        padding: "12px 16px",
        marginBottom: 14,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: c,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon === "alert" ? "flag" : "x"} size={15} color="#fff" />
      </span>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 800, color: E.text }}>
          {title}
        </p>
        <p style={{ fontSize: 12.5, color: E.muted, marginTop: 2 }}>{body}</p>
      </div>
    </div>
  );
}

/* ───────────────── Hero ───────────────── */

function HeroEmp({
  today,
  recruiterName,
  kpis,
  onPublish,
}: {
  today: string;
  recruiterName: string;
  kpis: { nuevos: number; activas: number; hoy: number; tasa: number | null };
  onPublish: () => void;
}) {
  const items = [
    { k: "Postulantes nuevos", v: kpis.nuevos, tone: E.accentHi },
    { k: "Prácticas activas", v: kpis.activas, tone: "#94A3B8" },
    { k: "Entrevistas hoy", v: kpis.hoy, tone: E.green },
    {
      k: "Tasa de respuesta",
      v: kpis.tasa !== null ? `${kpis.tasa}%` : "—",
      tone: "#A78BFA",
    },
  ];
  return (
    <section
      style={{
        background: E.dark,
        color: "#fff",
        borderRadius: 22,
        padding: "28px 30px",
        marginBottom: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -100,
          right: -60,
          width: 380,
          height: 380,
          background: `radial-gradient(circle, ${E.accent}40, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px,rgba(255,255,255,.05) 1px,transparent 0)",
          backgroundSize: "22px 22px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: E.accentHi,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {today}
          </p>
          <h1
            style={{
              fontSize: "clamp(1.7rem,2.8vw,2.2rem)",
              fontWeight: 800,
              letterSpacing: -1.4,
              lineHeight: 1.1,
              marginBottom: 12,
            }}
          >
            Hola {recruiterName},{" "}
            {kpis.nuevos > 0 ? (
              <>
                tienes{" "}
                <span style={{ color: E.accentHi }}>
                  {kpis.nuevos} postulantes
                </span>{" "}
                por revisar.
              </>
            ) : kpis.hoy > 0 ? (
              <>
                tienes{" "}
                <span style={{ color: E.accentHi }}>
                  {kpis.hoy} entrevista{kpis.hoy === 1 ? "" : "s"}
                </span>{" "}
                hoy.
              </>
            ) : (
              <>todo al día por ahora.</>
            )}
          </h1>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            <button
              type="button"
              onClick={onPublish}
              style={{
                padding: "10px 16px",
                background: `linear-gradient(135deg,${E.accent},${E.accentHi})`,
                color: "#fff",
                border: "none",
                borderRadius: 11,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: `0 6px 18px ${E.accent}55`,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Icon name="plus" size={14} color="#fff" />
              Publicar nueva práctica
            </button>
            {kpis.hoy > 0 && (
              <Link
                href="/dashboard/empresa/calendar"
                style={{
                  padding: "10px 16px",
                  background: "rgba(255,255,255,.1)",
                  border: "1px solid rgba(255,255,255,.16)",
                  color: "#fff",
                  borderRadius: 11,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="cal" size={13} color="#fff" />
                Ver agenda
              </Link>
            )}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            minWidth: 280,
            alignSelf: "center",
          }}
        >
          {items.map((it) => (
            <div
              key={it.k}
              style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 13,
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: "rgba(255,255,255,.55)",
                  textTransform: "uppercase",
                }}
              >
                {it.k}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  marginTop: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: -0.8,
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  {it.v}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Prácticas Activas ───────────────── */

function PracticasActivas({
  internships,
  stageCounts,
  loading,
  onPublish,
  onAskFinalize,
  onAskDelete,
  processingId,
}: {
  internships: Internship[];
  stageCounts: Record<
    string,
    {
      nuevos: number;
      screening: number;
      entrev: number;
      ofertas: number;
      total: number;
    }
  >;
  loading: boolean;
  onPublish: () => void;
  onAskFinalize: (id: string) => void;
  onAskDelete: (id: string) => void;
  processingId: string | null;
}) {
  if (loading) return <CardSkeleton label="Cargando prácticas…" />;

  if (internships.length === 0) {
    return (
      <section
        style={{
          background: E.surface,
          border: `1px dashed ${E.borderHi}`,
          borderRadius: 18,
          padding: "32px 28px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: 48,
            height: 48,
            borderRadius: 12,
            background: E.accentBg,
            color: E.accent,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Icon name="briefc" size={22} color={E.accent} />
        </span>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: E.text,
            letterSpacing: -0.4,
          }}
        >
          Publica tu primera práctica
        </h3>
        <p
          style={{
            fontSize: 13,
            color: E.muted,
            marginTop: 6,
            lineHeight: 1.5,
            maxWidth: 380,
            margin: "6px auto 16px",
          }}
        >
          Los estudiantes top de Chile están esperando ofertas como las tuyas.
        </p>
        <button
          type="button"
          onClick={onPublish}
          style={{
            padding: "10px 18px",
            background: `linear-gradient(135deg,${E.accent},${E.accentHi})`,
            color: "#fff",
            border: "none",
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 6px 16px ${E.accent}45`,
          }}
        >
          Publicar práctica
        </button>
      </section>
    );
  }

  const activeCount = internships.filter((i) => i.isActive).length;
  const totalNuevos = internships.reduce(
    (acc, i) => acc + (stageCounts[i.id]?.nuevos ?? 0),
    0,
  );

  return (
    <section>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: E.text,
              letterSpacing: -0.3,
            }}
          >
            Mis prácticas
          </h2>
          <p style={{ fontSize: 11.5, color: E.subtle, marginTop: 2 }}>
            {activeCount} {activeCount === 1 ? "activa" : "activas"}
            {totalNuevos > 0 &&
              ` · ${totalNuevos} postulantes nuevos por revisar`}
          </p>
        </div>
        <button
          type="button"
          onClick={onPublish}
          style={{
            padding: "7px 11px",
            background: E.accent,
            border: "none",
            color: "#fff",
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon name="plus" size={12} color="#fff" />
          Nueva
        </button>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 12,
        }}
      >
        {internships.map((p) => (
          <PracticaCardEmp
            key={p.id}
            p={p}
            stages={stageCounts[p.id]}
            busy={processingId === p.id}
            onAskFinalize={onAskFinalize}
            onAskDelete={onAskDelete}
          />
        ))}
      </div>
    </section>
  );
}

function PracticaCardEmp({
  p,
  stages,
  busy,
  onAskFinalize,
  onAskDelete,
}: {
  p: Internship;
  stages?: {
    nuevos: number;
    screening: number;
    entrev: number;
    ofertas: number;
    total: number;
  };
  busy: boolean;
  onAskFinalize: (id: string) => void;
  onAskDelete: (id: string) => void;
}) {
  const s = stages ?? {
    nuevos: 0,
    screening: 0,
    entrev: 0,
    ofertas: 0,
    total: 0,
  };
  const stagesArr: Array<{ k: string; v: number; c: string }> = [
    { k: "Nuevos", v: s.nuevos, c: E.accent },
    { k: "Revisión", v: s.screening, c: E.blue },
    { k: "Entrevista", v: s.entrev, c: E.purple },
    { k: "Oferta", v: s.ofertas, c: E.green },
  ];
  const max = Math.max(1, ...stagesArr.map((x) => x.v));
  const chip = p.isActive
    ? { l: "Activa", c: E.green, bg: E.greenBg }
    : { l: "Finalizada", c: E.subtle, bg: "rgba(15,23,42,.05)" };

  return (
    <article
      className="practix-emp-pcard"
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "all .15s",
      }}
    >
      <header
        style={{ display: "flex", justifyContent: "space-between", gap: 10 }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: chip.c,
                background: chip.bg,
                padding: "2px 8px",
                borderRadius: 5,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {chip.l}
            </span>
            <span style={{ fontSize: 10.5, color: E.subtle }}>· {p.area}</span>
            <span
              style={{ fontSize: 10.5, color: E.subtle }}
              title={new Date(p.createdAt).toLocaleString("es-CL")}
            >
              · Publicado {publishedAgo(p.createdAt)}
            </span>
          </div>
          <Link
            href={`/practicas/${p.id}`}
            style={{
              fontSize: 14.5,
              fontWeight: 800,
              color: E.text,
              letterSpacing: -0.3,
              lineHeight: 1.25,
              textDecoration: "none",
              display: "block",
            }}
          >
            {p.title}
          </Link>
          <p style={{ fontSize: 11.5, color: E.muted, marginTop: 3 }}>
            {MODALITY_LABEL[p.modality]} · {p.duration} · {p.location}
          </p>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {stagesArr.map((st) => (
          <div key={st.k} style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: E.subtle,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {st.k}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  color: st.v > 0 ? st.c : E.faint,
                  letterSpacing: -0.5,
                  lineHeight: 1,
                }}
              >
                {st.v}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "rgba(15,23,42,.06)",
                borderRadius: 2,
                marginTop: 5,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(st.v / max) * 100}%`,
                  background: st.c,
                  borderRadius: 2,
                  transition: "width .6s",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <footer
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          borderTop: `1px solid ${E.border}`,
          paddingTop: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11.5,
          }}
        >
          <div style={{ display: "flex", gap: 12, color: E.muted }}>
            <span>
              <b style={{ color: E.text }}>{s.total}</b> total
            </span>
            {s.nuevos > 0 && (
              <span style={{ color: E.accent, fontWeight: 700 }}>
                {s.nuevos} nuevos
              </span>
            )}
          </div>
          <Link
            href={`/practicas/${p.id}`}
            style={{
              color: E.muted,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Ver publicación
          </Link>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "stretch",
          }}
        >
          <Link
            href={`/dashboard/empresa/ats/${p.id}`}
            style={{
              flex: 1,
              minWidth: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "8px 10px",
              background: E.accentBg,
              color: E.accent,
              border: "none",
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="user" size={12} color={E.accent} />
            Postulantes
          </Link>
          {p.isActive && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAskFinalize(p.id)}
              title="Finalizar"
              style={{
                flex: 1,
                minWidth: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "8px 10px",
                background: E.greenBg,
                color: E.green,
                border: "none",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="check" size={12} color={E.green} />
              Finalizar
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onAskDelete(p.id)}
            title="Eliminar"
            style={{
              flex: 1,
              minWidth: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "8px 10px",
              background: E.roseBg,
              color: E.rose,
              border: "none",
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="x" size={12} color={E.rose} />
            Eliminar
          </button>
        </div>
      </footer>
    </article>
  );
}

/* ───────────────── Postulantes Nuevos ───────────────── */

function PostulantesNuevos({
  applicants,
  internships,
  loading,
  onRefresh,
}: {
  applicants: Applicant[];
  internships: Internship[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const intsById = useMemo(() => {
    const m: Record<string, Internship> = {};
    for (const i of internships) m[i.id] = i;
    return m;
  }, [internships]);

  if (loading) return <CardSkeleton label="Cargando postulantes…" />;

  return (
    <section
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 18,
        padding: "20px 22px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: E.text,
              letterSpacing: -0.3,
            }}
          >
            Postulantes nuevos
          </h2>
          <p style={{ fontSize: 11.5, color: E.subtle, marginTop: 2 }}>
            {applicants.length} sin revisar · ordenados por match
          </p>
        </div>
      </header>

      {applicants.length === 0 ? (
        <p
          style={{
            fontSize: 12.5,
            color: E.muted,
            padding: "12px 4px",
          }}
        >
          Cuando lleguen postulantes nuevos van a aparecer acá ordenados por su
          match con la práctica.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {applicants.slice(0, 6).map((a, i) => (
            <ApplicantRow
              key={a.id}
              a={a}
              internship={intsById[a.internshipId]}
              first={i === 0}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ApplicantRow({
  a,
  internship,
  first,
  onRefresh,
}: {
  a: Applicant;
  internship?: Internship;
  first: boolean;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [c1, c2] = avatarColors(a.student.name);
  const ini = initialsFor(a.student.name);
  const prof = a.student.studentProfile;

  const setStatus = async (status: "ACCEPTED" | "REJECTED") => {
    setBusy(status === "ACCEPTED" ? "accept" : "reject");
    try {
      await fetchWithRefresh(`/api/applications/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await onRefresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 4px",
        borderTop: first ? "none" : `1px solid ${E.border}`,
      }}
    >
      <Avatar size={38} ini={ini} c1={c1} c2={c2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: E.text,
              whiteSpace: "nowrap",
            }}
          >
            {a.student.name}
          </span>
          {(prof?.university || prof?.career) && (
            <span style={{ fontSize: 10.5, color: E.subtle }}>
              · {prof?.university}
              {prof?.career && ` · ${prof.career}`}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: E.muted,
            marginTop: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {internship?.title ?? "Práctica"} · {formatRelative(a.createdAt)}
        </div>
      </div>
      <ScoreVis
        score={Math.round(a.matchScore ?? 0)}
        style="badge"
        size={48}
        label={false}
      />
      <div style={{ display: "flex", gap: 5 }}>
        <button
          type="button"
          title="Avanzar"
          disabled={busy !== null}
          onClick={() => setStatus("ACCEPTED")}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: E.greenBg,
            border: "none",
            cursor: busy ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: busy === "accept" ? 0.5 : 1,
          }}
        >
          <Icon name="check" size={13} color={E.green} />
        </button>
        <button
          type="button"
          title="Descartar"
          disabled={busy !== null}
          onClick={() => setStatus("REJECTED")}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "rgba(15,23,42,.045)",
            border: "none",
            cursor: busy ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: busy === "reject" ? 0.5 : 1,
          }}
        >
          <Icon name="x" size={12} color={E.muted} />
        </button>
      </div>
    </div>
  );
}

/* ───────────────── Próximas Entrevistas ───────────────── */

function ProximasEntrevistas({
  interviews,
  loading,
}: {
  interviews: Interview[];
  loading: boolean;
}) {
  return (
    <section
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 18,
        padding: "18px 20px",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 14.5,
              fontWeight: 800,
              color: E.text,
              letterSpacing: -0.3,
            }}
          >
            Entrevistas próximas
          </h2>
          <p style={{ fontSize: 11, color: E.subtle, marginTop: 2 }}>
            {interviews.length === 0
              ? "Sin agendadas"
              : `${interviews.length} próxima${interviews.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/dashboard/empresa/calendar"
          style={{
            color: E.accent,
            fontSize: 11.5,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            textDecoration: "none",
          }}
        >
          Calendario <Icon name="cal" size={11} color={E.accent} />
        </Link>
      </header>
      {loading ? (
        <p style={{ fontSize: 12, color: E.muted }}>Cargando…</p>
      ) : interviews.length === 0 ? (
        <p style={{ fontSize: 12, color: E.muted, lineHeight: 1.5 }}>
          Cuando agendes una entrevista desde el chat va a aparecer acá.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {interviews.slice(0, 3).map((e) => {
            const d = new Date(e.scheduledAt);
            const todayStart = startOfDay(new Date());
            const dayStart = startOfDay(d);
            const diffDays = Math.round(
              (dayStart.getTime() - todayStart.getTime()) / 86_400_000,
            );
            const day =
              diffDays === 0
                ? "Hoy"
                : diffDays === 1
                  ? "Mañana"
                  : d.toLocaleDateString("es-CL", {
                      weekday: "short",
                    });
            const time = d.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isVideo = !!e.meetingLink;
            const confirmed = e.status === "SCHEDULED";
            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 12px",
                  background: "rgba(15,23,42,.025)",
                  borderRadius: 11,
                  borderLeft: `3px solid ${confirmed ? E.green : E.amber}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: 56,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: E.subtle,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {day}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: E.text,
                      letterSpacing: -0.4,
                      lineHeight: 1.1,
                    }}
                  >
                    {time}
                  </span>
                  <span style={{ fontSize: 10, color: E.subtle, marginTop: 1 }}>
                    {e.durationMins} min
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderLeft: `1px solid ${E.border}`,
                    paddingLeft: 11,
                  }}
                >
                  <div
                    style={{ fontSize: 12.5, fontWeight: 700, color: E.text }}
                  >
                    {e.student.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: E.muted,
                      marginTop: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {e.internship.title}
                  </div>
                </div>
                {isVideo && e.meetingLink ? (
                  <a
                    href={e.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 10px",
                      background: E.accent,
                      color: "#fff",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                    }}
                  >
                    Unirse
                  </a>
                ) : (
                  <Link
                    href="/dashboard/empresa/calendar"
                    style={{
                      padding: "6px 10px",
                      background: E.surface,
                      color: E.text,
                      border: `1px solid ${E.border}`,
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                    }}
                  >
                    Ver
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ───────────────── Inbox Mini (navy gradient) ───────────────── */

function InboxMini({
  conversations,
  loading,
}: {
  conversations: Conversation[];
  loading: boolean;
}) {
  return (
    <section
      style={{
        background: `linear-gradient(135deg, ${E.dark}, #1B2C56)`,
        color: "#fff",
        borderRadius: 18,
        padding: "18px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          background: `radial-gradient(circle, ${E.accent}30, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          position: "relative",
        }}
      >
        <h2
          style={{
            fontSize: 14.5,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: -0.3,
          }}
        >
          Mensajes
        </h2>
        <Link
          href="/dashboard/empresa/inbox"
          style={{
            color: E.accentHi,
            fontSize: 11.5,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            textDecoration: "none",
          }}
        >
          Inbox →
        </Link>
      </header>
      {loading ? (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>Cargando…</p>
      ) : conversations.length === 0 ? (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,.7)",
            lineHeight: 1.5,
          }}
        >
          Cuando alguno de tus postulantes te escriba va a aparecer acá.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            position: "relative",
          }}
        >
          {conversations.map((c) => {
            const name = c.student?.name ?? "Sin nombre";
            const [c1, c2] = avatarColors(name);
            const ini = initialsFor(name);
            const unread = (c.unreadCount ?? 0) > 0;
            const when = c.lastMessage
              ? formatRelative(c.lastMessage.createdAt)
              : "";
            return (
              <Link
                key={c.id}
                href={`/dashboard/empresa/inbox?c=${c.id}`}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "9px 8px",
                  borderRadius: 9,
                  alignItems: "center",
                  textDecoration: "none",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Avatar size={32} ini={ini} c1={c1} c2={c2} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: unread ? 800 : 600,
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                      }}
                    >
                      {name}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: unread ? E.accentHi : "rgba(255,255,255,.5)",
                        fontWeight: unread ? 800 : 500,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {when}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11.5,
                      color: unread
                        ? "rgba(255,255,255,.85)"
                        : "rgba(255,255,255,.55)",
                      fontWeight: unread ? 600 : 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: 1,
                    }}
                  >
                    {c.lastMessage?.content ?? "Sin mensajes aún"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ───────────────── Calendar Mini (semana actual) ───────────────── */

function CalendarMini({ interviews }: { interviews: Interview[] }) {
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const days = useMemo(() => {
    const labels = ["Lun", "Mar", "Mié", "Jue", "Vie"];
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return { label: labels[i], n: d.getDate(), date: d };
    });
  }, [weekStart]);

  const hours = ["09", "11", "13", "15", "17"];

  const eventsByDayHour: Record<string, Interview[]> = {};
  for (const iv of interviews) {
    const d = new Date(iv.scheduledAt);
    if (d < days[0].date) continue;
    const last = new Date(days[4].date);
    last.setDate(last.getDate() + 1);
    if (d >= last) continue;
    const dayIdx = days.findIndex(
      (x) =>
        x.date.getFullYear() === d.getFullYear() &&
        x.date.getMonth() === d.getMonth() &&
        x.date.getDate() === d.getDate(),
    );
    if (dayIdx < 0) continue;
    const hourBucket = String(d.getHours()).padStart(2, "0");
    const matched = hours.find((h) => {
      const diff = Math.abs(Number(h) - Number(hourBucket));
      return diff < 2;
    });
    if (!matched) continue;
    const key = `${dayIdx}-${matched}`;
    eventsByDayHour[key] = [...(eventsByDayHour[key] ?? []), iv];
  }

  const today = startOfDay(new Date());
  const todayIdx = days.findIndex(
    (x) =>
      x.date.getFullYear() === today.getFullYear() &&
      x.date.getMonth() === today.getMonth() &&
      x.date.getDate() === today.getDate(),
  );

  return (
    <section
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 18,
        padding: "18px 20px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 14.5,
              fontWeight: 800,
              color: E.text,
              letterSpacing: -0.3,
            }}
          >
            Esta semana
          </h2>
          <p style={{ fontSize: 11, color: E.subtle, marginTop: 2 }}>
            {interviews.length} entrevista{interviews.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px repeat(5, 1fr)",
          gap: 4,
        }}
      >
        <div />
        {days.map((d, i) => (
          <div
            key={d.label}
            style={{
              textAlign: "center",
              fontSize: 10.5,
              fontWeight: 800,
              color: i === todayIdx ? E.accent : E.subtle,
              letterSpacing: 0.3,
              padding: "4px 0",
              borderRadius: 6,
              background: i === todayIdx ? E.accentBg : "transparent",
            }}
          >
            <div style={{ textTransform: "uppercase" }}>{d.label}</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: i === todayIdx ? E.accent : E.text,
                marginTop: 1,
              }}
            >
              {d.n}
            </div>
          </div>
        ))}
        {hours.map((h) => (
          <Fragment key={h}>
            <div
              style={{
                fontSize: 10,
                color: E.subtle,
                paddingTop: 6,
                textAlign: "right",
              }}
            >
              {h}
            </div>
            {[0, 1, 2, 3, 4].map((di) => {
              const ev = eventsByDayHour[`${di}-${h}`]?.[0];
              return (
                <div
                  key={di}
                  style={{
                    height: 32,
                    borderTop: `1px dashed ${E.border}`,
                    padding: 2,
                    position: "relative",
                  }}
                >
                  {ev && (
                    <div
                      style={{
                        height: "100%",
                        padding: "2px 4px",
                        background: E.accentBg,
                        borderLeft: `2px solid ${E.accent}`,
                        borderRadius: 4,
                        lineHeight: 1.1,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: E.accent,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {new Date(ev.scheduledAt).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: E.muted,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginTop: 1,
                        }}
                      >
                        {ev.student.name.split(" ")[0]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* ───────────────── Card Skeleton ───────────────── */

function CardSkeleton({ label }: { label: string }) {
  return (
    <div
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 18,
        padding: "24px 22px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: E.muted,
        fontSize: 13,
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          border: `2px solid ${E.accent}33`,
          borderTopColor: E.accent,
          borderRadius: "50%",
          animation: "practix-emp-spin .9s linear infinite",
        }}
      />
      {label}
      <style>{`@keyframes practix-emp-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ───────────────── Publish Modal ───────────────── */

function PublishModal({
  form,
  formErrors,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  form: typeof EMPTY_FORM;
  formErrors: Partial<Record<keyof typeof EMPTY_FORM, string>>;
  submitting: boolean;
  onChange: (key: keyof typeof EMPTY_FORM, value: string) => void;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    borderRadius: 11,
    padding: "10px 14px",
    fontSize: 13.5,
    background: hasError ? "rgba(190,18,60,.06)" : "rgba(15,23,42,.04)",
    border: `1px solid ${hasError ? E.rose : "transparent"}`,
    color: E.text,
    outline: "none",
    fontFamily: "inherit",
    transition: "all .15s",
  });
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.08 * 12,
    textTransform: "uppercase",
    color: E.muted,
    marginBottom: 6,
  };
  const errStyle: React.CSSProperties = {
    fontSize: 11.5,
    color: E.rose,
    marginTop: 4,
    fontWeight: 600,
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(11,27,63,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 22,
          maxWidth: 540,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px -12px rgba(11,27,63,.4)",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "rgba(255,255,255,.95)",
            backdropFilter: "blur(8px)",
            borderBottom: `1px solid ${E.border}`,
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.08 * 12,
                textTransform: "uppercase",
                color: E.accent,
              }}
            >
              Nueva práctica
            </p>
            <h2
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: E.text,
                marginTop: 2,
                letterSpacing: -0.3,
              }}
            >
              Publica una vacante
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: E.muted,
            }}
          >
            <Icon name="x" size={16} color={E.muted} />
          </button>
        </div>
        <form
          onSubmit={onSubmit}
          noValidate
          style={{ padding: "20px 24px", display: "grid", gap: 14 }}
        >
          <div>
            <label htmlFor="emp-title" style={labelStyle}>
              Título *
            </label>
            <input
              id="emp-title"
              type="text"
              placeholder="Ej: Practicante Frontend Developer"
              value={form.title}
              onChange={(e) => onChange("title", e.target.value)}
              style={inputStyle(!!formErrors.title)}
            />
            {formErrors.title && <p style={errStyle}>{formErrors.title}</p>}
          </div>
          <div>
            <label htmlFor="emp-description" style={labelStyle}>
              Descripción *
            </label>
            <textarea
              id="emp-description"
              rows={4}
              placeholder="Describe el contexto del puesto, el equipo y el impacto."
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              style={{
                ...inputStyle(!!formErrors.description),
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
            {formErrors.description && (
              <p style={errStyle}>{formErrors.description}</p>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="emp-area" style={labelStyle}>
                Área
              </label>
              <select
                id="emp-area"
                value={form.area}
                onChange={(e) => onChange("area", e.target.value)}
                style={inputStyle(false)}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="emp-modality" style={labelStyle}>
                Modalidad
              </label>
              <select
                id="emp-modality"
                value={form.modality}
                onChange={(e) => onChange("modality", e.target.value)}
                style={inputStyle(false)}
              >
                {MODALITIES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
            }}
          >
            <div>
              <label htmlFor="emp-location" style={labelStyle}>
                Ubicación *
              </label>
              <input
                id="emp-location"
                type="text"
                placeholder="Santiago"
                value={form.location}
                onChange={(e) => onChange("location", e.target.value)}
                style={inputStyle(!!formErrors.location)}
              />
              {formErrors.location && (
                <p style={errStyle}>{formErrors.location}</p>
              )}
            </div>
            <div>
              <label htmlFor="emp-duration" style={labelStyle}>
                Duración *
              </label>
              <input
                id="emp-duration"
                type="text"
                placeholder="3 meses"
                value={form.duration}
                onChange={(e) => onChange("duration", e.target.value)}
                style={inputStyle(!!formErrors.duration)}
              />
              {formErrors.duration && (
                <p style={errStyle}>{formErrors.duration}</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="emp-skills" style={labelStyle}>
              Skills *
            </label>
            <input
              id="emp-skills"
              type="text"
              placeholder="React, TypeScript, Node.js"
              value={form.skills}
              onChange={(e) => onChange("skills", e.target.value)}
              style={inputStyle(!!formErrors.skills)}
            />
            <p style={{ fontSize: 11, color: E.subtle, marginTop: 4 }}>
              Separa con comas.
            </p>
            {formErrors.skills && <p style={errStyle}>{formErrors.skills}</p>}
          </div>
          <div>
            <label htmlFor="emp-resp" style={labelStyle}>
              Lo que harás
            </label>
            <textarea
              id="emp-resp"
              rows={5}
              placeholder={
                "Diseñar dashboards en Looker para 3 squads\nEscribir queries SQL sobre el data warehouse\nHacer análisis ad-hoc (A/B tests, cohortes)\nPresentar hallazgos semanales a PMs\nDocumentar metodologías en Notion"
              }
              value={form.responsibilities}
              onChange={(e) => onChange("responsibilities", e.target.value)}
              style={{
                ...inputStyle(false),
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
            <p
              style={{
                fontSize: 11,
                color: E.subtle,
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              Una tarea por línea. Aparece como lista numerada en el detalle.
              Opcional pero recomendado.
            </p>
          </div>
          <div>
            <label htmlFor="emp-req" style={labelStyle}>
              Requisitos *
            </label>
            <input
              id="emp-req"
              type="text"
              placeholder="Estudiante Ing. Informática, 4to año+"
              value={form.requirements}
              onChange={(e) => onChange("requirements", e.target.value)}
              style={inputStyle(!!formErrors.requirements)}
            />
            {formErrors.requirements && (
              <p style={errStyle}>{formErrors.requirements}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${E.accent}, ${E.accentHi})`,
              color: "#fff",
              border: "none",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: submitting ? "default" : "pointer",
              boxShadow: `0 6px 18px ${E.accent}45`,
              opacity: submitting ? 0.7 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {submitting ? "Publicando…" : "Publicar práctica"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ───────────────── Confirm Action Modal ─────────────────
   Modal único para confirmar finalizar o eliminar. El copy y el color cambian
   según el tipo de acción. */

function ConfirmActionModal({
  type,
  busy,
  internshipTitle,
  onCancel,
  onConfirm,
}: {
  type: "finalize" | "delete";
  busy: boolean;
  internshipTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = type === "delete";
  const accent = isDelete ? E.rose : E.green;
  const accentBg = isDelete ? E.roseBg : E.greenBg;
  const iconName = isDelete ? "x" : "check";
  const title = isDelete ? "Eliminar práctica" : "Finalizar práctica";
  const confirmLabel = isDelete ? "Eliminar" : "Finalizar";
  const busyLabel = isDelete ? "Eliminando…" : "Finalizando…";
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(11,27,63,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 22,
          maxWidth: 420,
          width: "100%",
          padding: "28px 28px 24px",
          boxShadow: "0 24px 64px -12px rgba(11,27,63,.4)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${accentBg}, ${accent}40)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <Icon name={iconName} size={26} color={accent} />
        </div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: -0.3,
            color: E.text,
            textAlign: "center",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 13,
            color: E.muted,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 1.55,
          }}
        >
          {isDelete ? (
            <>
              ¿Seguro querés eliminar{" "}
              <b style={{ color: E.text }}>
                {internshipTitle || "esta práctica"}
              </b>
              ? Se borrarán también todas las postulaciones asociadas. Esta
              acción no se puede deshacer.
            </>
          ) : (
            <>
              Vas a cerrar{" "}
              <b style={{ color: E.text }}>
                {internshipTitle || "esta práctica"}
              </b>{" "}
              para nuevos postulantes. Conservás los postulantes y mensajes
              históricos, pero ya no podrás reactivarla.
            </>
          )}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 11,
              background: "rgba(15,23,42,.05)",
              border: "none",
              color: E.text,
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 11,
              background: accent,
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 800,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
