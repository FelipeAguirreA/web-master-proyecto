"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { D } from "@/components/dashboard/tokens";
import { Welcome } from "@/components/dashboard/sections/Welcome";
import { SectionHead } from "@/components/dashboard/sections/SectionHead";
import {
  PracticaCard,
  type PracticaCardData,
} from "@/components/dashboard/sections/PracticaCard";
import {
  PipelineStrip,
  type PipelineColumn,
  type PipelineItem,
} from "@/components/dashboard/sections/PipelineStrip";
import {
  NextInterview,
  type InterviewData,
} from "@/components/dashboard/sections/NextInterview";
import {
  InboxPanel,
  type InboxMessage,
} from "@/components/dashboard/sections/InboxPanel";
import { CVPanel, type CVTip } from "@/components/dashboard/sections/CVPanel";
import {
  Activity,
  type ActivityItem,
} from "@/components/dashboard/sections/Activity";
import { ApplicationDetailModal } from "@/components/dashboard/sections/ApplicationDetailModal";
import {
  PracticaCardSkeleton,
  PipelineSkeleton,
} from "@/components/dashboard/sections/Skeletons";
import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";
import { useNotifications } from "@/hooks/useNotifications";
import { computeCvProgress, computeCompleteness } from "@/lib/cv-progress";

type ApiInternship = {
  id: string;
  title: string;
  description?: string | null;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  skills?: string[];
  company: { companyName: string; logo: string | null };
  matchScore?: number | null;
  createdAt?: string;
};

type ApiApplication = {
  id: string;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  pipelineStatus?: "PENDING" | "REVIEWING" | "INTERVIEW" | "REJECTED" | null;
  matchScore?: number | null;
  createdAt: string;
  internship: {
    id: string;
    title: string;
    description?: string | null;
    area?: string | null;
    location?: string | null;
    modality?: string | null;
    duration?: string | null;
    requirements?: string[] | null;
    skills?: string[] | null;
    company: { companyName: string; logo?: string | null };
  };
  interview?: {
    id: string;
    scheduledAt: string;
    durationMins: number;
    meetingLink: string | null;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  } | null;
};

type ApiUser = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  studentProfile?: {
    bio: string | null;
    university: string | null;
    career: string | null;
    semester: number | null;
    skills: string[];
    cvUrl: string | null;
  } | null;
};

type ApiConversation = {
  id: string;
  company: {
    id: string;
    name: string;
    contactName: string;
    image: string | null;
  };
  internship: { id: string; title: string };
  lastMessage: {
    content: string;
    type: string;
    createdAt: string;
    isRead: boolean;
    senderId: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "hace un rato";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "hace un instante";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

function toPracticaCard(it: ApiInternship): PracticaCardData {
  const co = it.company.companyName;
  const color = companyColor(co);
  const score = Math.round(it.matchScore ?? 0);
  const top =
    score >= 95
      ? "Top 5%"
      : score >= 90
        ? "Top 10%"
        : score >= 80
          ? "Top 20%"
          : null;
  const mode = `${MODALITY_LABEL[it.modality] ?? it.modality} · ${it.location}`;
  const isNew = it.createdAt
    ? Date.now() - new Date(it.createdAt).getTime() < 7 * 24 * 3600 * 1000
    : false;
  return {
    id: it.id,
    co,
    logo: companyInitials(co),
    logoUrl: it.company.logo ?? null,
    logoBg: color.bg,
    logoFg: color.fg,
    title: it.title,
    description: it.description ?? null,
    mode,
    salary: null,
    dur: it.duration,
    score,
    top,
    tags: (it.skills ?? []).slice(0, 4),
    deadline: null,
    applicants: null,
    isNew,
    ai: null,
  };
}

function applicationToPipelineItem(a: ApiApplication): PipelineItem {
  const co = a.internship.company.companyName;
  const color = companyColor(co);
  return {
    id: a.id,
    co,
    logo: companyInitials(co),
    logoUrl: a.internship.company.logo ?? null,
    logoBg: color.bg,
    logoFg: color.fg,
    title: a.internship.title,
    ago: relativeTime(a.createdAt),
  };
}

function stageFor(a: ApiApplication): PipelineColumn["stage"] | "Rechazada" {
  if (a.status === "ACCEPTED") return "Oferta";
  if (a.status === "REJECTED") return "Rechazada";
  if (a.pipelineStatus === "INTERVIEW") return "Entrevista";
  if (a.pipelineStatus === "REVIEWING" || a.status === "REVIEWED")
    return "En revisión";
  return "Postulé";
}

function buildPipeline(apps: ApiApplication[]): PipelineColumn[] {
  const stages: PipelineColumn["stage"][] = [
    "Postulé",
    "En revisión",
    "Entrevista",
    "Oferta",
  ];
  const grouped: Record<string, ApiApplication[]> = {
    Postulé: [],
    "En revisión": [],
    Entrevista: [],
    Oferta: [],
  };
  for (const a of apps) {
    const s = stageFor(a);
    if (s !== "Rechazada") grouped[s].push(a);
  }
  return stages.map((stage) => ({
    stage,
    count: grouped[stage].length,
    items: grouped[stage].map(applicationToPipelineItem),
  }));
}

function notifToActivity(n: {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
}): ActivityItem {
  let icon = "✓";
  let color: string = D.green;
  let bg: string = D.greenBg;
  if (n.type === "APPLICATION_ACCEPTED") {
    icon = "★";
    color = D.accent;
    bg = D.accentBg;
  } else if (n.type === "APPLICATION_REJECTED") {
    icon = "✗";
    color = D.rose;
    bg = D.roseBg;
  } else if (n.type === "APPLICATION_REVIEWED") {
    icon = "✓";
    color = D.blue;
    bg = D.blueBg;
  }
  return {
    id: n.id,
    icon,
    color,
    bg,
    text: (
      <span>
        <b>{n.title}</b> · {n.body}
      </span>
    ),
    when: relativeTime(n.createdAt),
  };
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const { notifications } = useNotifications();

  const [recs, setRecs] = useState<ApiInternship[]>([]);
  const [apps, setApps] = useState<ApiApplication[]>([]);
  const [savedInternships, setSavedInternships] = useState<ApiInternship[]>([]);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [recsLoading, setRecsLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(true);
  const [recsError, setRecsError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setRecsLoading(true);
    setAppsLoading(true);
    setRecsError(null);
    const init: RequestInit = { cache: "no-store" };
    fetchWithRefresh("/api/matching/recommendations", init)
      .then(async (r) => {
        if (r.ok) return (await r.json()) as ApiInternship[];
        if (r.status === 429) {
          setRecsError("Demasiadas solicitudes. Esperá un momento y refrescá.");
        } else {
          setRecsError("No pudimos cargar tus recomendaciones.");
        }
        return [];
      })
      .then((d) => setRecs(d ?? []))
      .catch(() => {
        setRecs([]);
        setRecsError("No pudimos conectar con el servidor.");
      })
      .finally(() => setRecsLoading(false));
    fetchWithRefresh("/api/applications/my", init)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setApps(d ?? []))
      .catch(() => setApps([]))
      .finally(() => setAppsLoading(false));
    fetchWithRefresh("/api/users/me", init)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d))
      .catch(() => setUser(null));
    fetchWithRefresh("/api/chat/conversations", init)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ApiConversation[]) => setConversations(d ?? []))
      .catch(() => setConversations([]));
    fetchWithRefresh("/api/internships/saved", init)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ApiInternship[]) => setSavedInternships(d ?? []))
      .catch(() => setSavedInternships([]));
  }, [session]);

  const savedCards = useMemo(
    () => savedInternships.slice(0, 6).map(toPracticaCard),
    [savedInternships],
  );

  const cards = useMemo(() => recs.slice(0, 6).map(toPracticaCard), [recs]);
  const featured = cards[0] ?? null;
  const rest = cards.slice(1);
  const pipeline = useMemo(() => buildPipeline(apps), [apps]);

  const highMatches = useMemo(
    () => recs.filter((r) => (r.matchScore ?? 0) >= 90).length,
    [recs],
  );
  const topMatch = useMemo(() => {
    if (recs.length === 0) return null;
    const top = [...recs].sort(
      (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0),
    )[0];
    return top.matchScore && top.matchScore > 0 ? top : null;
  }, [recs]);

  // Próxima entrevista: apps con Interview SCHEDULED EN EL FUTURO, ordenadas
  // por scheduledAt asc. Si ninguna futura, cae a la app más reciente en
  // pipelineStatus INTERVIEW. Filtrar por "futura" es necesario porque hay
  // Interviews SCHEDULED viejas que nunca se marcan COMPLETED y se gana al
  // sort, mostrando entrevistas pasadas como "próximas".
  const interviewApp = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const futures = apps
      .filter(
        (a) =>
          a.interview &&
          a.interview.status === "SCHEDULED" &&
          new Date(a.interview.scheduledAt).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.interview!.scheduledAt).getTime() -
          new Date(b.interview!.scheduledAt).getTime(),
      );
    if (futures.length > 0) return futures[0];
    return apps.find((a) => a.pipelineStatus === "INTERVIEW") ?? null;
  }, [apps]);

  const interview: InterviewData | null = interviewApp
    ? (() => {
        const co = interviewApp.internship.company.companyName;
        const color = companyColor(co);
        const iv = interviewApp.interview;
        const whenLabel = iv
          ? new Date(iv.scheduledAt)
              .toLocaleDateString("es-CL", {
                weekday: "short",
                day: "2-digit",
                month: "short",
              })
              .toUpperCase()
          : "POR AGENDAR";
        const timeLabel = iv
          ? new Date(iv.scheduledAt).toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            }) + (iv.durationMins ? ` · ${iv.durationMins} min` : "")
          : null;
        const channelLabel = iv?.meetingLink ? "Videollamada" : null;
        return {
          applicationId: interviewApp.id,
          internshipId: interviewApp.internship.id,
          co,
          logo: companyInitials(co),
          logoUrl: interviewApp.internship.company.logo ?? null,
          logoBg: color.bg,
          logoFg: color.fg,
          role: interviewApp.internship.title,
          duration: interviewApp.internship.duration ?? null,
          whenLabel,
          timeLabel,
          channelLabel,
          meetingLink: iv?.meetingLink ?? null,
        };
      })()
    : null;

  const inboxMessages: InboxMessage[] = useMemo(() => {
    return conversations.slice(0, 4).map((c) => {
      const color = companyColor(c.company.name);
      return {
        id: c.id,
        co: c.company.name,
        logo: companyInitials(c.company.name),
        logoUrl: c.company.image ?? null,
        logoBg: color.bg,
        logoFg: color.fg,
        sender: c.company.contactName || null,
        preview: c.lastMessage
          ? c.lastMessage.type === "INTERVIEW"
            ? "📅 Entrevista propuesta"
            : c.lastMessage.content
          : "Conversación iniciada",
        when: relativeTime(c.lastMessage?.createdAt ?? c.updatedAt),
        unread: c.unreadCount > 0,
      };
    });
  }, [conversations]);

  // Mismo cálculo que /perfil (CompletenessCard) — fuente única en cv-progress.ts.
  const cvPct = computeCvProgress(user);
  // Tips priorizados: pendientes primero, luego done. Top 4 por puntos.
  const cvTips: CVTip[] = useMemo(() => {
    const items = computeCompleteness(user);
    const sorted = [...items].sort((a, b) => {
      // pendientes (done=false) primero
      if (a.done !== b.done) return a.done ? 1 : -1;
      // dentro del mismo grupo, mayor pts primero
      return b.pts - a.pts;
    });
    return sorted.slice(0, 4).map((it) => ({
      title: it.title,
      body: it.body ?? "",
      pts: `+${it.pts}`,
      done: it.done,
    }));
  }, [user]);

  const activityItems = notifications.slice(0, 6).map(notifToActivity);

  const firstName = session?.user?.name?.split(" ")[0] ?? "estudiante";
  const applicationsCount = apps.filter((a) => a.status !== "REJECTED").length;
  const interviewsCount = apps.filter(
    (a) => a.pipelineStatus === "INTERVIEW",
  ).length;

  return (
    <div
      style={{
        padding: "24px 28px",
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
      }}
      className="practix-student-root"
    >
      <Welcome
        firstName={firstName}
        highMatches={highMatches}
        topMatchCompany={topMatch?.company.companyName ?? null}
        topMatchScore={
          topMatch?.matchScore ? Math.round(topMatch.matchScore) : null
        }
        daysLeft={null}
        cvPct={cvPct}
        applicationsCount={applicationsCount}
        interviewsCount={interviewsCount}
      />

      <div
        className="practix-student-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            minWidth: 0,
          }}
        >
          <section>
            <SectionHead
              title="Recomendadas para ti"
              sub={
                recsLoading
                  ? "Buscando matches para tu perfil…"
                  : cards.length > 0
                    ? `${recs.length} prácticas activas · ordenadas por match`
                    : hasCv
                      ? "Aún no encontramos matches. Probá actualizar tu CV o esperá a que se publiquen nuevas."
                      : "Subí tu CV para empezar a recibir recomendaciones"
              }
              action={{ label: "Ver todas", href: "/practicas" }}
            />
            {recsLoading ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,1fr)",
                  gap: 14,
                }}
                className="practix-recs-grid"
              >
                {[0, 1, 2, 3].map((i) => (
                  <PracticaCardSkeleton key={i} />
                ))}
              </div>
            ) : recsError ? (
              <div
                style={{
                  background: D.surface,
                  border: `1px solid ${D.rose}25`,
                  borderRadius: 16,
                  padding: 24,
                  textAlign: "center",
                  color: D.rose,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <p style={{ fontWeight: 700, marginBottom: 4 }}>
                  No pudimos cargar recomendaciones
                </p>
                <p style={{ color: D.muted, fontWeight: 500 }}>{recsError}</p>
              </div>
            ) : cards.length === 0 ? (
              <div
                style={{
                  background: D.surface,
                  border: `1px dashed ${D.border}`,
                  borderRadius: 16,
                  padding: 32,
                  textAlign: "center",
                  color: D.muted,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {hasCv ? (
                  <>
                    <p
                      style={{
                        color: D.text,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      Sin matches por ahora
                    </p>
                    Tu CV ya está procesado. Esto puede ser porque hay pocas
                    prácticas activas, o porque las que hay todavía no se
                    indexaron. Probá{" "}
                    <Link
                      href="/practicas"
                      style={{ color: D.accent, fontWeight: 700 }}
                    >
                      ver todas las prácticas
                    </Link>{" "}
                    o actualizar tu CV en{" "}
                    <Link
                      href="/perfil"
                      style={{ color: D.accent, fontWeight: 700 }}
                    >
                      tu perfil
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        color: D.text,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      Aún no subís tu CV
                    </p>
                    Cuando lo subas, vas a ver acá las prácticas que mejor
                    calzan con tu perfil.{" "}
                    <a
                      href="/perfil"
                      style={{ color: D.accent, fontWeight: 700 }}
                    >
                      Ir al perfil
                    </a>
                  </>
                )}
              </div>
            ) : (
              <>
                {featured && (
                  <div style={{ marginBottom: 14 }}>
                    <PracticaCard p={featured} featured />
                  </div>
                )}
                <div
                  className="practix-recs-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,1fr)",
                    gap: 14,
                  }}
                >
                  {rest.map((p) => (
                    <PracticaCard key={p.id} p={p} />
                  ))}
                </div>
              </>
            )}
          </section>

          {savedCards.length > 0 && (
            <section>
              <SectionHead
                title="Mis guardadas"
                sub={`${savedInternships.length} práctica${savedInternships.length === 1 ? "" : "s"} que marcaste para revisar después`}
                action={{ label: "Ver todas", href: "/practicas/guardadas" }}
              />
              <div
                className="practix-recs-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,1fr)",
                  gap: 14,
                }}
              >
                {savedCards.map((p) => (
                  <PracticaCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          )}

          {appsLoading ? (
            <PipelineSkeleton />
          ) : (
            <PipelineStrip
              columns={pipeline}
              onItemClick={(id) => setSelectedAppId(id)}
            />
          )}
        </div>

        <aside
          className="practix-student-rail"
          style={{
            position: "sticky",
            top: 80,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <NextInterview interview={interview} />
          <InboxPanel
            messages={inboxMessages}
            inboxHref="/dashboard/estudiante/inbox"
          />
          <CVPanel cvPct={cvPct} tips={cvTips} />
          <Activity items={activityItems} />
        </aside>
      </div>

      <style>{`
        @media (max-width:900px) {
          .practix-student-grid { grid-template-columns: 1fr !important; }
          .practix-student-rail { position: static !important; }
          .practix-recs-grid { grid-template-columns: 1fr !important; }
          .practix-student-root { padding: 18px 16px !important; }
        }
      `}</style>

      {selectedAppId &&
        (() => {
          const selected = apps.find((a) => a.id === selectedAppId);
          if (!selected) return null;
          return (
            <ApplicationDetailModal
              application={selected}
              onClose={() => setSelectedAppId(null)}
            />
          );
        })()}
    </div>
  );
}
