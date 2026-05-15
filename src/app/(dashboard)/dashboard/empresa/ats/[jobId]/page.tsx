"use client";

import { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { E } from "@/components/dashboard/palettes";
import { Icon } from "@/components/dashboard/Icon";
import { Avatar } from "@/components/dashboard/atoms/Avatar";
import { ScoreVis } from "@/components/dashboard/atoms/ScoreVis";

type PipelineStatus =
  | "PENDING"
  | "REVIEWING"
  | "INTERVIEW"
  | "ACCEPTED"
  | "REJECTED";

type StudentProfile = {
  university?: string;
  career?: string;
  cvUrl?: string | null;
};

type Candidate = {
  id: string;
  matchScore: number;
  atsScore: number | null;
  status: "PENDING" | "REVIEWED" | "ACCEPTED" | "REJECTED";
  pipelineStatus?: PipelineStatus | null;
  createdAt: string;
  student: {
    name: string;
    email: string;
    image?: string | null;
    studentProfile?: StudentProfile | null;
  };
};

type Internship = {
  id: string;
  title: string;
  area: string;
  skills: string[];
};

type StageDef = {
  key: PipelineStatus;
  label: string;
  color: string;
  bg: string;
};

const STAGES: StageDef[] = [
  {
    key: "PENDING",
    label: "Nuevos",
    color: E.subtle,
    bg: "rgba(15,23,42,.05)",
  },
  { key: "REVIEWING", label: "Revisión", color: E.blue, bg: E.blueBg },
  { key: "INTERVIEW", label: "Entrevista", color: E.purple, bg: E.purpleBg },
  { key: "ACCEPTED", label: "Aprobado", color: E.green, bg: E.greenBg },
];

const REJECTED_STAGE: StageDef = {
  key: "REJECTED",
  label: "Rechazados",
  color: E.rose,
  bg: E.roseBg,
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

function formatInStage(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} d`;
  const w = Math.floor(d / 7);
  return `${w} sem`;
}

function deriveStage(c: Candidate): PipelineStatus {
  if (c.pipelineStatus) return c.pipelineStatus;
  if (c.status === "PENDING") return "PENDING";
  if (c.status === "REVIEWED") return "REVIEWING";
  if (c.status === "ACCEPTED") return "ACCEPTED";
  return "REJECTED";
}

export default function ATSKanbanPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [internship, setInternship] = useState<Internship | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overStage, setOverStage] = useState<PipelineStatus | null>(null);
  const [query, setQuery] = useState("");
  const [minMatch, setMinMatch] = useState<number>(0);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [busy, setBusy] = useState<string | null>(null);
  // Locked mientras se inicia el chat (POST /conversations puede tardar 200-500ms)
  const [startingChat, setStartingChat] = useState<string | null>(null);

  // Inicia (o recupera) la conversación con el candidato y navega al inbox
  // con ese chat abierto. Solo posible si el candidato está en INTERVIEW —
  // regla del backend (chat.service.ts: INTERVIEW_REQUIRED).
  const startChat = useCallback(
    async (candidateId: string) => {
      setStartingChat(candidateId);
      try {
        const res = await fetchWithRefresh("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: candidateId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          alert(
            body.code === "PIPELINE_STATUS_REQUIRED"
              ? "El chat se habilita cuando el candidato pasa a Entrevista."
              : (body.error ?? "No se pudo iniciar la conversación."),
          );
          return;
        }
        const conv = await res.json();
        router.push(`/dashboard/empresa/inbox?c=${conv.id}`);
      } catch {
        alert("No se pudo iniciar la conversación. Reintenta.");
      } finally {
        setStartingChat(null);
      }
    },
    [router],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, candRes] = await Promise.all([
        fetchWithRefresh(`/api/internships/${jobId}`, { cache: "no-store" }),
        fetchWithRefresh(`/api/applications/internship/${jobId}`, {
          cache: "no-store",
        }),
      ]);
      if (intRes.ok) setInternship(await intRes.json());
      if (candRes.ok) {
        const data: Candidate[] = (await candRes.json()) ?? [];
        setCandidates(data);
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const moveStage = async (candidateId: string, nextStage: PipelineStatus) => {
    const prev = candidates.find((c) => c.id === candidateId);
    if (!prev || deriveStage(prev) === nextStage) return;

    setBusy(candidateId);
    setCandidates((cs) =>
      cs.map((c) =>
        c.id === candidateId ? { ...c, pipelineStatus: nextStage } : c,
      ),
    );

    try {
      const res = await fetchWithRefresh(`/api/ats/pipeline/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStage }),
      });
      if (!res.ok) {
        setCandidates((cs) =>
          cs.map((c) =>
            c.id === candidateId
              ? { ...c, pipelineStatus: prev.pipelineStatus }
              : c,
          ),
        );
      } else {
        const data = await res.json();
        if (data.application) {
          setCandidates((cs) =>
            cs.map((c) =>
              c.id === candidateId
                ? {
                    ...c,
                    pipelineStatus: data.application.pipelineStatus,
                    status: data.application.status,
                  }
                : c,
            ),
          );
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const bulkMove = async (stage: PipelineStatus) => {
    const ids = Array.from(selected);
    setSelected(new Set());
    await Promise.all(ids.map((id) => moveStage(id, stage)));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      // Filtro por Scoring ATS (no por matchScore semántico). Si el ATS aún
      // no se calculó (atsScore=null), sólo pasa cuando el umbral es 0 — sin
      // valor no podemos garantizar que cumpla el corte que pidió el admin.
      if (minMatch > 0 && (c.atsScore ?? -1) < minMatch) return false;
      if (!q) return true;
      if (c.student.name.toLowerCase().includes(q)) return true;
      if (c.student.studentProfile?.university?.toLowerCase().includes(q))
        return true;
      if (c.student.studentProfile?.career?.toLowerCase().includes(q))
        return true;
      return false;
    });
  }, [candidates, query, minMatch]);

  const byStage = useMemo(() => {
    const map: Record<PipelineStatus, Candidate[]> = {
      PENDING: [],
      REVIEWING: [],
      INTERVIEW: [],
      ACCEPTED: [],
      REJECTED: [],
    };
    for (const c of filtered) {
      const s = deriveStage(c);
      map[s].push(c);
    }
    return map;
  }, [filtered]);

  const totalActive = filtered.filter(
    (c) => deriveStage(c) !== "REJECTED",
  ).length;

  const funnel = useMemo(() => {
    const items = STAGES.map((s) => ({
      ...s,
      count: byStage[s.key].length,
    }));
    return items;
  }, [byStage]);

  const activeCandidate = activeId
    ? candidates.find((c) => c.id === activeId)
    : null;

  const bulkMode = selected.size > 0;

  return (
    <div
      style={{
        background: E.bg,
        minHeight: "100%",
        padding: "20px 24px 80px",
        fontFamily: "var(--font-onest), ui-sans-serif, system-ui",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <Header
        internship={internship}
        loading={loading}
        view={view}
        onChangeView={setView}
        totalActive={totalActive}
        totalRejected={byStage.REJECTED.length}
      />

      <FunnelSummary funnel={funnel} />

      <FilterBar
        query={query}
        onQuery={setQuery}
        minMatch={minMatch}
        onMinMatch={setMinMatch}
      />

      {loading ? (
        <Spinner />
      ) : view === "kanban" ? (
        <KanbanBoard
          byStage={byStage}
          rejected={byStage.REJECTED}
          overStage={overStage}
          onSetOver={setOverStage}
          onDrop={(id, stage) => {
            moveStage(id, stage);
            setOverStage(null);
          }}
          onOpenCandidate={setActiveId}
          onToggleSelect={toggleSelect}
          selected={selected}
          bulkMode={bulkMode}
          busy={busy}
        />
      ) : (
        <TableView
          candidates={filtered}
          selected={selected}
          onToggleSelect={toggleSelect}
          onOpenCandidate={setActiveId}
        />
      )}

      {activeCandidate && (
        <CandidateDrawer
          candidate={activeCandidate}
          onClose={() => setActiveId(null)}
          onMove={moveStage}
          onStartChat={startChat}
          busy={busy === activeCandidate.id}
          chatBusy={startingChat === activeCandidate.id}
        />
      )}

      {bulkMode && (
        <BulkBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
          onMove={bulkMove}
        />
      )}
    </div>
  );
}

/* ───────────────── Header ───────────────── */

function Header({
  internship,
  loading,
  view,
  onChangeView,
  totalActive,
  totalRejected,
}: {
  internship: Internship | null;
  loading: boolean;
  view: "kanban" | "table";
  onChangeView: (v: "kanban" | "table") => void;
  totalActive: number;
  totalRejected: number;
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
            fontSize: 11.5,
            color: E.subtle,
          }}
        >
          <Link
            href="/dashboard/empresa"
            style={{
              color: E.subtle,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Mis prácticas
          </Link>
          <Icon name="arr" size={11} color={E.subtle} />
          <span style={{ color: E.text, fontWeight: 700 }}>Pipeline</span>
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(1.25rem, 2vw, 1.55rem)",
              fontWeight: 800,
              color: E.text,
              letterSpacing: -0.8,
              lineHeight: 1.1,
            }}
          >
            {loading
              ? "Cargando…"
              : (internship?.title ?? "Práctica no encontrada")}
          </h1>
        </div>
        <p style={{ fontSize: 12, color: E.subtle, marginTop: 6 }}>
          {totalActive} activos · {totalRejected} rechazados
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            display: "flex",
            background: "rgba(15,23,42,.05)",
            borderRadius: 9,
            padding: 3,
          }}
        >
          {(
            [
              { k: "kanban", i: "grid", l: "Kanban" },
              { k: "table", i: "set", l: "Tabla" },
            ] as const
          ).map((v) => (
            <button
              key={v.k}
              type="button"
              onClick={() => onChangeView(v.k)}
              style={{
                padding: "6px 11px",
                background: view === v.k ? E.surface : "transparent",
                border: "none",
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 700,
                color: view === v.k ? E.text : E.muted,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow:
                  view === v.k ? "0 1px 2px rgba(15,23,42,.08)" : "none",
              }}
            >
              <Icon
                name={v.i}
                size={12}
                color={view === v.k ? E.text : E.muted}
              />
              {v.l}
            </button>
          ))}
        </div>
        {internship && (
          <Link
            href={`/dashboard/empresa/ats/${internship.id}/config`}
            style={{
              padding: "8px 13px",
              background: E.surface,
              border: `1px solid ${E.border}`,
              color: E.text,
              borderRadius: 9,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon name="set" size={13} color={E.text} />
            Scoring ATS
          </Link>
        )}
      </div>
    </header>
  );
}

/* ───────────────── Funnel Summary ───────────────── */

function FunnelSummary({
  funnel,
}: {
  funnel: Array<{
    key: PipelineStatus;
    label: string;
    color: string;
    count: number;
  }>;
}) {
  const pct = (n: number, total: number) =>
    total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <section
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 14,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {funnel.map((s, i) => (
        <Fragment key={s.key}>
          <div style={{ flex: "1 1 100px", minWidth: 90 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 3,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: s.color,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: E.subtle,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: s.count > 0 ? E.text : E.faint,
                  letterSpacing: -0.5,
                }}
              >
                {s.count}
              </span>
              {i > 0 && s.count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    color: E.subtle,
                    fontWeight: 700,
                  }}
                >
                  {pct(s.count, funnel[i - 1].count || 1)}%
                </span>
              )}
            </div>
          </div>
          {i < funnel.length - 1 && (
            <Icon name="arr" size={14} color={E.faint} />
          )}
        </Fragment>
      ))}
    </section>
  );
}

/* ───────────────── Filter Bar ───────────────── */

function FilterBar({
  query,
  onQuery,
  minMatch,
  onMinMatch,
}: {
  query: string;
  onQuery: (v: string) => void;
  minMatch: number;
  onMinMatch: (v: number) => void;
}) {
  return (
    <section
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "1 1 240px",
          maxWidth: 360,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
          }}
        >
          <Icon name="search" size={14} color={E.subtle} />
        </span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar por nombre, universidad o carrera…"
          style={{
            width: "100%",
            background: E.surface,
            border: `1px solid ${E.border}`,
            borderRadius: 9,
            padding: "8px 12px 8px 34px",
            fontSize: 12.5,
            color: E.text,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: E.surface,
          border: `1px solid ${E.border}`,
          borderRadius: 9,
          padding: "6px 10px",
        }}
      >
        <span style={{ fontSize: 11, color: E.muted, fontWeight: 700 }}>
          ATS ≥
        </span>
        <select
          value={minMatch}
          onChange={(e) => onMinMatch(Number(e.target.value))}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 11.5,
            fontWeight: 700,
            color: E.text,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <option value={0}>0%</option>
          <option value={50}>50%</option>
          <option value={70}>70%</option>
          <option value={80}>80%</option>
          <option value={90}>90%</option>
        </select>
      </div>
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, color: E.subtle, fontWeight: 600 }}>
          Tip: arrastrá tarjetas entre columnas para mover de etapa
        </span>
      </div>
    </section>
  );
}

/* ───────────────── Kanban Board ───────────────── */

function KanbanBoard({
  byStage,
  rejected,
  overStage,
  onSetOver,
  onDrop,
  onOpenCandidate,
  onToggleSelect,
  selected,
  bulkMode,
  busy,
}: {
  byStage: Record<PipelineStatus, Candidate[]>;
  rejected: Candidate[];
  overStage: PipelineStatus | null;
  onSetOver: (s: PipelineStatus | null) => void;
  onDrop: (candidateId: string, stage: PipelineStatus) => void;
  onOpenCandidate: (id: string) => void;
  onToggleSelect: (id: string) => void;
  selected: Set<string>;
  bulkMode: boolean;
  busy: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flex: 1,
        minHeight: 0,
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          flex: 1,
          paddingBottom: 8,
        }}
      >
        {STAGES.map((s) => (
          <Column
            key={s.key}
            stage={s}
            candidates={byStage[s.key]}
            isOver={overStage === s.key}
            onSetOver={onSetOver}
            onDrop={onDrop}
            onOpenCandidate={onOpenCandidate}
            onToggleSelect={onToggleSelect}
            selected={selected}
            bulkMode={bulkMode}
            busy={busy}
          />
        ))}
      </div>
      <Column
        stage={REJECTED_STAGE}
        candidates={rejected}
        isOver={overStage === "REJECTED"}
        onSetOver={onSetOver}
        onDrop={onDrop}
        onOpenCandidate={onOpenCandidate}
        onToggleSelect={onToggleSelect}
        selected={selected}
        bulkMode={bulkMode}
        busy={busy}
        compact
      />
    </div>
  );
}

function Column({
  stage,
  candidates,
  isOver,
  onSetOver,
  onDrop,
  onOpenCandidate,
  onToggleSelect,
  selected,
  bulkMode,
  busy,
  compact = false,
}: {
  stage: StageDef;
  candidates: Candidate[];
  isOver: boolean;
  onSetOver: (s: PipelineStatus | null) => void;
  onDrop: (candidateId: string, stage: PipelineStatus) => void;
  onOpenCandidate: (id: string) => void;
  onToggleSelect: (id: string) => void;
  selected: Set<string>;
  bulkMode: boolean;
  busy: string | null;
  compact?: boolean;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onSetOver(stage.key);
      }}
      onDragLeave={() => onSetOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id, stage.key);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: compact ? 200 : 240,
        flex: compact ? "0 0 220px" : "0 0 260px",
        maxWidth: compact ? 240 : 280,
        background: isOver ? `${E.accentBg}AA` : "rgba(15,23,42,.025)",
        borderRadius: 14,
        padding: "10px 8px",
        transition: "background .15s",
        minHeight: 300,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 6px 10px",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: stage.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: E.text,
              letterSpacing: -0.1,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {stage.label}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: E.subtle,
              background: E.surface,
              padding: "1px 7px",
              borderRadius: 9,
              border: `1px solid ${E.border}`,
              flexShrink: 0,
            }}
          >
            {candidates.length}
          </span>
        </div>
      </header>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "0 4px",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {candidates.map((c) => (
          <CandCard
            key={c.id}
            c={c}
            stage={stage}
            selected={selected.has(c.id)}
            onToggleSelect={onToggleSelect}
            onOpen={onOpenCandidate}
            bulkMode={bulkMode}
            dense={compact}
            busy={busy === c.id}
          />
        ))}
        {candidates.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "24px 12px",
              fontSize: 11,
              color: E.subtle,
              border: `1.5px dashed ${E.border}`,
              borderRadius: 10,
            }}
          >
            Arrastrá postulantes aquí
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Candidate Card ───────────────── */

function CandCard({
  c,
  stage,
  selected,
  onToggleSelect,
  onOpen,
  bulkMode,
  dense,
  busy,
}: {
  c: Candidate;
  stage: StageDef;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  bulkMode: boolean;
  dense: boolean;
  busy: boolean;
}) {
  // Badge de las cards: mostramos el Scoring ATS (no el matchScore semántico
  // del CV). Tres tramos visibles (verde / ámbar / rojo) + gris sólo cuando
  // todavía no se calculó. Sin un tramo "gris a medias" — todo score con
  // valor tiene color para que se distinga de un vistazo.
  const ats = c.atsScore != null ? Math.round(c.atsScore) : null;
  const matchC =
    ats == null ? E.subtle : ats >= 80 ? E.green : ats >= 50 ? E.amber : E.rose;
  const matchBg =
    ats == null
      ? "rgba(15,23,42,.05)"
      : ats >= 80
        ? E.greenBg
        : ats >= 50
          ? E.amberBg
          : E.roseBg;
  const [c1, c2] = avatarColors(c.student.name);
  const ini = initialsFor(c.student.name);
  const prof = c.student.studentProfile;
  const isTop = ats != null && ats >= 90;

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", c.id);
      }}
      onClick={() => {
        if (bulkMode) onToggleSelect(c.id);
        else onOpen(c.id);
      }}
      style={{
        background: E.surface,
        border: `1px solid ${selected ? E.accent : E.border}`,
        borderRadius: 11,
        padding: dense ? "10px 11px" : "12px 13px",
        cursor: bulkMode ? "pointer" : "grab",
        boxShadow: selected
          ? `0 0 0 3px ${E.accent}30`
          : "0 1px 2px rgba(15,23,42,.03)",
        transition: "all .15s",
        position: "relative",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {isTop && stage.key !== "REJECTED" && (
        <span
          style={{
            position: "absolute",
            top: -1,
            right: 8,
            fontSize: 9,
            fontWeight: 900,
            color: "#fff",
            background: E.accent,
            padding: "2px 7px",
            borderRadius: "0 0 5px 5px",
            letterSpacing: 0.5,
          }}
        >
          TOP
        </span>
      )}

      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 8,
        }}
      >
        {bulkMode && (
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: `1.6px solid ${selected ? E.accent : E.faint}`,
              background: selected ? E.accent : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {selected && <Icon name="check" size={10} color="#fff" />}
          </span>
        )}
        <Avatar
          size={32}
          ini={ini}
          c1={c1}
          c2={c2}
          src={c.student.image}
          alt={c.student.name}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 800,
              color: E.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {c.student.name}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: E.subtle,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginTop: 1,
            }}
          >
            {prof?.university ?? "—"}
            {prof?.career && ` · ${prof.career}`}
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 7px",
            borderRadius: 6,
            background: matchBg,
            color: matchC,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: -0.2,
            flexShrink: 0,
          }}
        >
          {ats != null ? `${ats}%` : "—"}
        </span>
      </header>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10.5,
          color: E.subtle,
          gap: 6,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            minWidth: 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          <Icon name="cal" size={11} color={E.subtle} />
          hace {formatInStage(c.createdAt)}
        </span>
      </footer>
    </article>
  );
}

/* ───────────────── Drawer (Candidate Quick View) ───────────────── */

function CandidateDrawer({
  candidate,
  onClose,
  onMove,
  onStartChat,
  busy,
  chatBusy,
}: {
  candidate: Candidate;
  onClose: () => void;
  onMove: (id: string, stage: PipelineStatus) => void;
  onStartChat: (id: string) => void;
  busy: boolean;
  chatBusy: boolean;
}) {
  const [c1, c2] = avatarColors(candidate.student.name);
  const ini = initialsFor(candidate.student.name);
  const prof = candidate.student.studentProfile;
  const match = Math.round(candidate.matchScore ?? 0);
  const currentStage = deriveStage(candidate);
  const allStages = [...STAGES, REJECTED_STAGE];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(11,27,63,.5)",
          zIndex: 60,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 95vw)",
          background: E.surface,
          zIndex: 61,
          boxShadow: "-20px 0 40px rgba(11,27,63,.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "18px 22px",
            borderBottom: `1px solid ${E.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Avatar
            size={48}
            ini={ini}
            c1={c1}
            c2={c2}
            src={candidate.student.image}
            alt={candidate.student.name}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: E.text,
                letterSpacing: -0.4,
              }}
            >
              {candidate.student.name}
            </h2>
            <p style={{ fontSize: 12, color: E.muted, marginTop: 2 }}>
              {prof?.university ?? "—"}
              {prof?.career && ` · ${prof.career}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(15,23,42,.05)",
              border: "none",
              cursor: "pointer",
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={15} color={E.muted} />
          </button>
        </header>

        <div
          style={{
            padding: "14px 22px",
            borderBottom: `1px solid ${E.border}`,
            background: "rgba(15,23,42,.02)",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: E.subtle,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              marginBottom: 7,
            }}
          >
            Mover a etapa
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {allStages.map((s) => {
              const active = s.key === currentStage;
              const isRejected = s.key === "REJECTED";
              return (
                <button
                  key={`${s.key}-${s.label}`}
                  type="button"
                  disabled={busy || active}
                  onClick={() => onMove(candidate.id, s.key)}
                  style={{
                    padding: "5px 10px",
                    background: active ? s.color : "transparent",
                    border: `1px solid ${active ? s.color : E.border}`,
                    color: active ? "#fff" : isRejected ? E.rose : E.muted,
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: busy || active ? "default" : "pointer",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 14,
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <ScoreVis score={match} style="ring" size={72} label={false} />
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: E.subtle,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 3,
                }}
              >
                Match con la práctica
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: E.text,
                  letterSpacing: -0.8,
                  lineHeight: 1,
                }}
              >
                {match}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: E.muted,
                    marginLeft: 4,
                  }}
                >
                  /100
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: E.subtle,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Postuló hace {formatInStage(candidate.createdAt)}
              </div>
            </div>
          </div>

          {/* Scoring ATS — score según los pesos configurados en
              /ats/[jobId]/config. Mismo formato visual que el Match con IA. */}
          {(() => {
            const ats =
              candidate.atsScore != null
                ? Math.round(candidate.atsScore)
                : null;
            const hint =
              ats == null
                ? "Sin calcular · usá Recalcular desde Scoring ATS."
                : ats >= 70
                  ? "Cumple bien los filtros configurados."
                  : ats >= 40
                    ? "Cumple parcialmente — revisar."
                    : "Pocos filtros cumplidos.";
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 14,
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <ScoreVis
                  score={ats ?? 0}
                  style="ring"
                  size={72}
                  label={false}
                />
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: E.subtle,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      marginBottom: 3,
                    }}
                  >
                    Scoring ATS
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: E.text,
                      letterSpacing: -0.8,
                      lineHeight: 1,
                    }}
                  >
                    {ats ?? "—"}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: E.muted,
                        marginLeft: 4,
                      }}
                    >
                      /100
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: E.subtle,
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {hint}
                  </div>
                </div>
              </div>
            );
          })()}

          <section style={{ marginBottom: 18 }}>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: E.subtle,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Contacto
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 12.5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 11px",
                  background: "rgba(15,23,42,.03)",
                  borderRadius: 8,
                }}
              >
                <span style={{ color: E.subtle }}>Correo</span>
                <a
                  href={`mailto:${candidate.student.email}`}
                  style={{
                    color: E.text,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {candidate.student.email}
                </a>
              </div>
            </div>
          </section>

          {prof?.cvUrl && (
            <section style={{ marginBottom: 18 }}>
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: E.subtle,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Archivos
              </h3>
              <a
                href={prof.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "11px 12px",
                  background: E.surface,
                  border: `1px solid ${E.border}`,
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 42,
                    borderRadius: 5,
                    background: `linear-gradient(180deg, ${E.accentBg}, ${E.surface})`,
                    border: `1px solid ${E.accentBdr}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 900,
                    color: E.accent,
                    letterSpacing: 0.5,
                    flexShrink: 0,
                  }}
                >
                  CV
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: E.text,
                    }}
                  >
                    CV del candidato
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: E.subtle,
                      marginTop: 1,
                    }}
                  >
                    Abrir en pestaña nueva
                  </div>
                </div>
              </a>
            </section>
          )}
        </div>

        <footer
          style={{
            padding: "14px 22px",
            borderTop: `1px solid ${E.border}`,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Chat — habilitado solo en INTERVIEW (regla backend). */}
          {(() => {
            const canChat = currentStage === "INTERVIEW";
            const tooltip = canChat
              ? "Iniciar conversación con el candidato"
              : "Disponible cuando el candidato pase a Entrevista";
            return (
              <button
                type="button"
                disabled={!canChat || chatBusy}
                onClick={() => onStartChat(candidate.id)}
                title={tooltip}
                style={{
                  padding: "11px 14px",
                  background: canChat ? E.surface : "rgba(15,23,42,.04)",
                  border: `1px solid ${canChat ? E.border : "transparent"}`,
                  color: canChat ? E.text : E.subtle,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !canChat || chatBusy ? "not-allowed" : "pointer",
                  opacity: chatBusy ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon
                  name="chat"
                  size={14}
                  color={canChat ? E.text : E.subtle}
                />
                {chatBusy ? "Abriendo…" : "Mensajear"}
              </button>
            );
          })()}
          {currentStage !== "REJECTED" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const idx = STAGES.findIndex((s) => s.key === currentStage);
                const next = STAGES[idx + 1];
                if (next) onMove(candidate.id, next.key);
              }}
              style={{
                flex: 1,
                padding: "11px",
                background: `linear-gradient(135deg, ${E.accent}, ${E.accentHi})`,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              Avanzar etapa
            </button>
          )}
          <button
            type="button"
            disabled={busy || currentStage === "REJECTED"}
            onClick={() => onMove(candidate.id, "REJECTED")}
            style={{
              padding: "11px 14px",
              background: E.surface,
              border: `1px solid ${E.border}`,
              color: E.rose,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor:
                busy || currentStage === "REJECTED" ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Descartar
          </button>
        </footer>
      </aside>
    </>
  );
}

/* ───────────────── Bulk Bar ───────────────── */

function BulkBar({
  count,
  onClear,
  onMove,
}: {
  count: number;
  onClear: () => void;
  onMove: (stage: PipelineStatus) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: E.dark,
        color: "#fff",
        padding: "10px 12px 10px 18px",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        gap: 10,
        zIndex: 50,
        boxShadow: "0 20px 50px rgba(11,27,63,.4)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 800 }}>
        {count} {count === 1 ? "seleccionado" : "seleccionados"}
      </span>
      <span
        style={{
          width: 1,
          height: 20,
          background: "rgba(255,255,255,.15)",
        }}
      />
      {STAGES.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onMove(s.key)}
          style={{
            padding: "7px 12px",
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.14)",
            color: "#fff",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {s.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onMove("REJECTED")}
        style={{
          padding: "7px 12px",
          background: "rgba(190,18,60,.2)",
          border: "1px solid rgba(190,18,60,.4)",
          color: "#fff",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Icon name="x" size={12} color="#fff" />
        Descartar
      </button>
      <span
        style={{
          width: 1,
          height: 20,
          background: "rgba(255,255,255,.15)",
        }}
      />
      <button
        type="button"
        onClick={onClear}
        style={{
          padding: "7px 10px",
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,.6)",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Cancelar
      </button>
    </div>
  );
}

/* ───────────────── Table View ───────────────── */

function TableView({
  candidates,
  selected,
  onToggleSelect,
  onOpenCandidate,
}: {
  candidates: Candidate[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenCandidate: (id: string) => void;
}) {
  return (
    <div
      style={{
        background: E.surface,
        border: `1px solid ${E.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              background: "rgba(15,23,42,.03)",
              borderBottom: `1px solid ${E.border}`,
            }}
          >
            {["", "Postulante", "Etapa", "Match", "Postuló"].map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: E.subtle,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const stage = [...STAGES, REJECTED_STAGE].find(
              (s) => s.key === deriveStage(c),
            )!;
            // Columna "Score" de la tabla: igual que las cards del board,
            // pintamos el Scoring ATS (no el matchScore semántico). Tramos
            // alineados con la card (verde ≥80, ámbar ≥50, rojo el resto).
            const ats = c.atsScore != null ? Math.round(c.atsScore) : null;
            const matchC =
              ats == null
                ? E.subtle
                : ats >= 80
                  ? E.green
                  : ats >= 50
                    ? E.amber
                    : E.rose;
            const [c1, c2] = avatarColors(c.student.name);
            const ini = initialsFor(c.student.name);
            const prof = c.student.studentProfile;
            const isSel = selected.has(c.id);
            return (
              <tr
                key={c.id}
                onClick={() => onOpenCandidate(c.id)}
                style={{
                  borderBottom: `1px solid ${E.border}`,
                  cursor: "pointer",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(15,23,42,.025)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td
                  style={{ padding: "10px 14px", width: 30 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(c.id);
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.6px solid ${isSel ? E.accent : E.faint}`,
                      background: isSel ? E.accent : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSel && <Icon name="check" size={10} color="#fff" />}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <Avatar
                      size={30}
                      ini={ini}
                      c1={c1}
                      c2={c2}
                      src={c.student.image}
                      alt={c.student.name}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: E.text,
                        }}
                      >
                        {c.student.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: E.subtle }}>
                        {prof?.university ?? "—"}
                        {prof?.career && ` · ${prof.career}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: stage.color,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: stage.color,
                      }}
                    />
                    {stage.label}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: matchC,
                      letterSpacing: -0.3,
                    }}
                  >
                    {ats != null ? `${ats}%` : "—"}
                  </span>
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 11.5,
                    color: E.muted,
                  }}
                >
                  hace {formatInStage(c.createdAt)}
                </td>
              </tr>
            );
          })}
          {candidates.length === 0 && (
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: "32px 14px",
                  textAlign: "center",
                  fontSize: 12,
                  color: E.subtle,
                }}
              >
                Sin postulantes que coincidan con los filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────── Spinner ───────────────── */

function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        color: E.muted,
        fontSize: 13,
        gap: 10,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          border: `2px solid ${E.accent}33`,
          borderTopColor: E.accent,
          borderRadius: "50%",
          animation: "ats-spin .9s linear infinite",
        }}
      />
      Cargando pipeline…
      <style>{`@keyframes ats-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
