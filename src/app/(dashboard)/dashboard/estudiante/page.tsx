"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { Welcome } from "@/components/dashboard/sections/Welcome";
import { SectionHead } from "@/components/dashboard/sections/SectionHead";
import { PracticaCard } from "@/components/dashboard/sections/PracticaCard";
import { PipelineStrip } from "@/components/dashboard/sections/PipelineStrip";
import {
  NextInterview,
  type InterviewData,
} from "@/components/dashboard/sections/NextInterview";
import {
  InboxPanel,
  type InboxMessage,
} from "@/components/dashboard/sections/InboxPanel";
import { CVPanel, type CVTip } from "@/components/dashboard/sections/CVPanel";
import { Activity } from "@/components/dashboard/sections/Activity";
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
import {
  toPracticaCard,
  buildPipeline,
  notifToActivity,
  relativeTime,
} from "./utils";

// ─── API Types ────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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

  // ─── Derived state ──────────────────────────────────────────────────────────

  const hasCv = Boolean(user?.studentProfile?.cvUrl);

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

  // Próxima entrevista: SCHEDULED en el futuro ordenadas por scheduledAt asc.
  // Si ninguna futura, cae a la más reciente en pipelineStatus INTERVIEW.
  const interviewApp = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- intencional: recalcula con la hora actual en cada render para que las entrevistas que pasaron del momento se filtren correctamente sin esperar un poll.
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

  const cvPct = computeCvProgress(user);
  const cvTips: CVTip[] = useMemo(() => {
    const items = computeCompleteness(user);
    const sorted = [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-[18px] sm:px-7 sm:py-6 max-w-[1280px] mx-auto w-full">
      <Welcome
        firstName={firstName}
        highMatches={highMatches}
        topMatchCompany={topMatch?.company.companyName ?? null}
        topMatchScore={
          topMatch?.matchScore ? Math.round(topMatch.matchScore) : null
        }
        daysLeft={null}
        cvPct={cvPct}
        hasCv={hasCv}
        applicationsCount={applicationsCount}
        interviewsCount={interviewsCount}
      />

      {/* Main grid: content izq + rail der */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-7 min-w-0">
          {/* Recomendadas */}
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
                      : "Sube tu CV para empezar a recibir recomendaciones"
              }
              action={{ label: "Ver todas", href: "/practicas" }}
            />
            {recsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[0, 1, 2, 3].map((i) => (
                  <PracticaCardSkeleton key={i} />
                ))}
              </div>
            ) : recsError ? (
              <div className="bg-surface border border-rose/20 rounded-[16px] p-6 text-center text-rose text-[13px] leading-[1.6]">
                <p className="font-bold mb-1">
                  No pudimos cargar recomendaciones
                </p>
                <p className="text-muted font-medium">{recsError}</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="bg-surface border border-dashed border-border rounded-[16px] p-8 text-center text-muted text-[13px] leading-[1.6]">
                {hasCv ? (
                  <>
                    <p className="text-text font-semibold mb-1.5">
                      Sin matches por ahora
                    </p>
                    Tu CV ya está procesado. Esto puede ser porque hay pocas
                    prácticas activas, o porque las que hay todavía no se
                    indexaron. Probá{" "}
                    <Link href="/practicas" className="text-accent font-bold">
                      ver todas las prácticas
                    </Link>{" "}
                    o actualizar tu CV en{" "}
                    <Link href="/perfil" className="text-accent font-bold">
                      tu perfil
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    <p className="text-text font-semibold mb-1.5">
                      Aún no subís tu CV
                    </p>
                    Cuando lo subas, vas a ver acá las prácticas que mejor
                    calzan con tu perfil.{" "}
                    <a href="/perfil" className="text-accent font-bold">
                      Ir al perfil
                    </a>
                  </>
                )}
              </div>
            ) : (
              <>
                {featured && (
                  <div className="mb-3.5">
                    <PracticaCard p={featured} featured />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {rest.map((p) => (
                    <PracticaCard key={p.id} p={p} />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Guardadas */}
          {savedCards.length > 0 && (
            <section>
              <SectionHead
                title="Mis guardadas"
                sub={`${savedInternships.length} práctica${savedInternships.length === 1 ? "" : "s"} que marcaste para revisar después`}
                action={{ label: "Ver todas", href: "/practicas/guardadas" }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {savedCards.map((p) => (
                  <PracticaCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          )}

          {/* Pipeline */}
          {appsLoading ? (
            <PipelineSkeleton />
          ) : (
            <PipelineStrip
              columns={pipeline}
              onItemClick={(id) => setSelectedAppId(id)}
            />
          )}
        </div>

        {/* Right rail — sticky en desktop, fluido en mobile */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <NextInterview interview={interview} />
          <InboxPanel
            messages={inboxMessages}
            inboxHref="/dashboard/estudiante/inbox"
          />
          <CVPanel cvPct={cvPct} tips={cvTips} />
          <Activity items={activityItems} />
        </aside>
      </div>

      {/* Modal de detalle de postulación */}
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
