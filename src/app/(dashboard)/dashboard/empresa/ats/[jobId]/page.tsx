"use client";

import { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
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
  /** Tailwind text-color class for the stage dot / label */
  colorClass: string;
  /** Tailwind bg class for the stage dot */
  dotClass: string;
};

const STAGES: StageDef[] = [
  {
    key: "PENDING",
    label: "Nuevos",
    colorClass: "text-subtle",
    dotClass: "bg-subtle",
  },
  {
    key: "REVIEWING",
    label: "Revisión",
    colorClass: "text-blue",
    dotClass: "bg-blue",
  },
  {
    key: "INTERVIEW",
    label: "Entrevista",
    colorClass: "text-purple",
    dotClass: "bg-purple",
  },
  {
    key: "ACCEPTED",
    label: "Aprobado",
    colorClass: "text-green",
    dotClass: "bg-green",
  },
];

const REJECTED_STAGE: StageDef = {
  key: "REJECTED",
  label: "Rechazados",
  colorClass: "text-rose",
  dotClass: "bg-rose",
};

// avatar palette — hex justified: generative from name hash, no semantic token exists
const AVATAR_PALETTE: Array<[string, string]> = [
  ["#FFD4B8", "#FF9B6A"],
  ["#B8E6D4", "#3DBE85"],
  ["#D8C4FF", "#7C3AED"],
  ["#B8C9FF", "#2C5CFA"],
  ["#FFE6A8", "#D69E2E"],
  ["#FFD4B8", "#C74A1E"],
  ["#A8E0FF", "#0EA5E9"],
];

function avatarColors(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
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
  const [startingChat, setStartingChat] = useState<string | null>(null);

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
    return STAGES.map((s) => ({
      ...s,
      count: byStage[s.key].length,
    }));
  }, [byStage]);

  const activeCandidate = activeId
    ? candidates.find((c) => c.id === activeId)
    : null;

  const bulkMode = selected.size > 0;

  return (
    <div className="bg-bg min-h-full px-4 sm:px-6 md:px-8 py-5 pb-20 flex flex-col gap-4 font-[var(--font-onest),ui-sans-serif,system-ui]">
      <ATSHeader
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

function ATSHeader({
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
    <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
      <div className="min-w-0 flex-1">
        <nav className="flex items-center gap-1.5 mb-1 text-[11.5px] text-subtle">
          <Link
            href="/dashboard/empresa"
            className="text-subtle font-semibold hover:text-text transition-colors no-underline"
          >
            Mis prácticas
          </Link>
          <Icon name="arr" size={11} color="currentColor" />
          <span className="text-text font-bold">Pipeline</span>
        </nav>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[clamp(1.25rem,2vw,1.55rem)] font-extrabold text-text tracking-[-0.8px] leading-[1.1]">
            {loading
              ? "Cargando…"
              : (internship?.title ?? "Práctica no encontrada")}
          </h1>
        </div>
        <p className="text-[12px] text-subtle mt-1.5">
          {totalActive} activos · {totalRejected} rechazados
        </p>
      </div>

      <div className="flex flex-row sm:flex-row items-center gap-2">
        {/* View toggle */}
        <div className="flex bg-black/5 rounded-[9px] p-[3px]">
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
              className={[
                "px-[11px] py-1.5 rounded-[7px] text-[11.5px] font-bold inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 transition-all",
                view === v.k
                  ? "bg-surface text-text shadow-[0_1px_2px_rgba(15,23,42,.08)]"
                  : "bg-transparent text-muted",
              ].join(" ")}
            >
              <Icon
                name={v.i}
                size={12}
                color={
                  view === v.k ? "var(--color-text)" : "var(--color-muted)"
                }
              />
              {v.l}
            </button>
          ))}
        </div>
        {internship && (
          <Link
            href={`/dashboard/empresa/ats/${internship.id}/config`}
            className="px-3 py-2 bg-surface border border-border text-text rounded-[9px] text-[12px] font-bold no-underline inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 hover:bg-bg transition-colors"
          >
            <Icon name="set" size={13} color="currentColor" />
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
    dotClass: string;
    count: number;
  }>;
}) {
  const pct = (n: number, total: number) =>
    total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <section className="bg-surface border border-border rounded-[14px] px-4 py-3 flex items-center gap-2 flex-wrap">
      {funnel.map((s, i) => (
        <Fragment key={s.key}>
          <div className="flex-[1_1_100px] min-w-[90px]">
            <div className="flex items-center gap-1.5 mb-[3px]">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dotClass}`}
              />
              <span className="text-[10px] font-extrabold text-subtle tracking-[0.3px] uppercase">
                {s.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-[18px] font-black tracking-[-0.5px] ${s.count > 0 ? "text-text" : "text-faint"}`}
              >
                {s.count}
              </span>
              {i > 0 && s.count > 0 && (
                <span className="text-[10px] text-subtle font-bold">
                  {pct(s.count, funnel[i - 1].count || 1)}%
                </span>
              )}
            </div>
          </div>
          {i < funnel.length - 1 && (
            <Icon name="arr" size={14} color="var(--color-faint)" />
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
    <section className="flex gap-2 flex-wrap items-center">
      <div className="relative flex-[1_1_240px] max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 flex pointer-events-none">
          <Icon name="search" size={14} color="var(--color-subtle)" />
        </span>
        <input
          id="ats-candidates-search"
          name="ats-candidates-search"
          type="search"
          role="searchbox"
          aria-label="Buscar candidatos"
          autoComplete="off"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar por nombre, universidad o carrera…"
          className="w-full bg-surface border border-border rounded-[9px] py-2 pl-9 pr-3 text-[12.5px] text-text font-[inherit] placeholder:text-muted focus:border-border-hi transition-colors"
        />
      </div>
      <div className="inline-flex items-center gap-1.5 bg-surface border border-border rounded-[9px] px-2.5 py-1.5">
        <span className="text-[11px] text-muted font-bold">ATS ≥</span>
        <select
          id="ats-min-match"
          name="ats-min-match"
          aria-label="Match mínimo"
          value={minMatch}
          onChange={(e) => onMinMatch(Number(e.target.value))}
          className="bg-transparent border-none text-[11.5px] font-bold text-text cursor-pointer font-[inherit]"
        >
          <option value={0}>0%</option>
          <option value={50}>50%</option>
          <option value={70}>70%</option>
          <option value={80}>80%</option>
          <option value={90}>90%</option>
        </select>
      </div>
      <div className="ml-auto hidden md:flex items-center gap-2">
        <span className="text-[11px] text-subtle font-semibold">
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
    <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0 md:items-stretch">
      <div className="flex flex-col md:flex-row md:overflow-x-auto gap-3 flex-1 pb-2">
        {STAGES.map((s) => (
          <KanbanColumn
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
      <KanbanColumn
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

function KanbanColumn({
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
      className={[
        "flex flex-col rounded-[14px] p-2.5 min-h-[300px] transition-colors",
        isOver ? "bg-accent-bg/70" : "bg-black/[0.025]",
        compact
          ? "w-full md:min-w-[200px] md:max-w-[240px] md:flex-[0_0_220px]"
          : "w-full md:min-w-[240px] md:max-w-[280px] md:flex-[0_0_260px]",
      ].join(" ")}
    >
      <header className="flex items-center justify-between px-1.5 pb-2.5 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${stage.dotClass}`}
          />
          <span className="text-[11.5px] font-extrabold text-text tracking-[-0.1px] uppercase truncate">
            {stage.label}
          </span>
          <span className="text-[11px] font-extrabold text-subtle bg-surface px-[7px] py-[1px] rounded-[9px] border border-border flex-shrink-0">
            {candidates.length}
          </span>
        </div>
      </header>
      <div className="flex flex-col gap-2 px-1 overflow-y-auto flex-1">
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
          <div className="text-center py-6 px-3 text-[11px] text-subtle border-[1.5px] border-dashed border-border rounded-[10px]">
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
  const ats = c.atsScore != null ? Math.round(c.atsScore) : null;

  // ATS score badge classes — three semantic tiers
  const badgeClass =
    ats == null
      ? "bg-black/5 text-subtle"
      : ats >= 80
        ? "bg-green-bg text-green"
        : ats >= 50
          ? "bg-amber-bg text-amber"
          : "bg-rose-bg text-rose";

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
      className={[
        "relative bg-surface rounded-[11px] transition-all",
        dense ? "px-[11px] py-2.5" : "px-[13px] py-3",
        selected
          ? "border border-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_19%,transparent)]"
          : "border border-border shadow-[0_1px_2px_rgba(15,23,42,.03)]",
        bulkMode ? "cursor-pointer" : "cursor-grab",
        busy ? "opacity-60" : "",
      ].join(" ")}
    >
      {isTop && stage.key !== "REJECTED" && (
        <span className="absolute -top-px right-2 text-[9px] font-black text-white bg-accent px-[7px] py-[2px] rounded-b-[5px] tracking-[0.5px]">
          TOP
        </span>
      )}

      <header className="flex items-center gap-2.5 mb-2">
        {bulkMode && (
          <span
            className={[
              "w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0 border-[1.6px]",
              selected
                ? "border-accent bg-accent"
                : "border-faint bg-transparent",
            ].join(" ")}
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
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-extrabold text-text truncate">
            {c.student.name}
          </div>
          <div className="text-[10.5px] text-subtle truncate mt-[1px]">
            {prof?.university ?? "—"}
            {prof?.career && ` · ${prof.career}`}
          </div>
        </div>
        <span
          className={`inline-flex items-center px-[7px] py-[2px] rounded-[6px] text-[11px] font-black tracking-[-0.2px] flex-shrink-0 ${badgeClass}`}
        >
          {ats != null ? `${ats}%` : "—"}
        </span>
      </header>

      <footer className="flex items-center justify-between text-[10.5px] text-subtle gap-1.5">
        <span className="inline-flex items-center gap-[3px] min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
          <Icon name="cal" size={11} color="currentColor" />
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
  const ats =
    candidate.atsScore != null ? Math.round(candidate.atsScore) : null;
  const hint =
    ats == null
      ? "Sin calcular · usá Recalcular desde Scoring ATS."
      : ats >= 70
        ? "Cumple bien los filtros configurados."
        : ats >= 40
          ? "Cumple parcialmente — revisar."
          : "Pocos filtros cumplidos.";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[rgba(11,27,63,.5)] z-[60]"
      />
      {/* Drawer panel — right side panel on all sizes */}
      <aside className="fixed top-0 right-0 bottom-0 w-[min(480px,95vw)] bg-surface z-[61] shadow-[-20px_0_40px_rgba(11,27,63,.18)] flex flex-col">
        {/* Header */}
        <header className="px-[22px] py-[18px] border-b border-border flex items-center gap-3">
          <Avatar
            size={48}
            ini={ini}
            c1={c1}
            c2={c2}
            src={candidate.student.image}
            alt={candidate.student.name}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-extrabold text-text tracking-[-0.4px]">
              {candidate.student.name}
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              {prof?.university ?? "—"}
              {prof?.career && ` · ${prof.career}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-black/5 border-none cursor-pointer w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-black/10 transition-colors"
          >
            <Icon name="x" size={15} color="var(--color-muted)" />
          </button>
        </header>

        {/* Stage mover */}
        <div className="px-[22px] py-[14px] border-b border-border bg-black/[0.02]">
          <div className="text-[10.5px] font-extrabold text-subtle tracking-[0.4px] uppercase mb-1.5">
            Mover a etapa
          </div>
          <div className="flex gap-1 flex-wrap">
            {allStages.map((s) => {
              const active = s.key === currentStage;
              const isRejected = s.key === "REJECTED";
              return (
                <button
                  key={`${s.key}-${s.label}`}
                  type="button"
                  disabled={busy || active}
                  onClick={() => onMove(candidate.id, s.key)}
                  className={[
                    "px-2.5 py-1 rounded-[7px] text-[11px] font-bold border transition-all",
                    active
                      ? `${s.dotClass} text-white border-transparent`
                      : isRejected
                        ? "bg-transparent text-rose border-border"
                        : "bg-transparent text-muted border-border",
                    busy || active
                      ? "cursor-default"
                      : "cursor-pointer hover:border-border-hi",
                    busy ? "opacity-60" : "",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">
          {/* Match semantic score */}
          <div className="grid grid-cols-[auto_1fr] gap-3.5 items-center mb-[18px]">
            <ScoreVis score={match} style="ring" size={72} label={false} />
            <div>
              <div className="text-[10.5px] font-bold text-subtle uppercase tracking-[0.4px] mb-[3px]">
                Match con la práctica
              </div>
              <div className="text-[24px] font-black text-text tracking-[-0.8px] leading-none">
                {match}
                <span className="text-[13px] font-bold text-muted ml-1">
                  /100
                </span>
              </div>
              <div className="text-[11px] text-subtle font-bold mt-1">
                Postuló hace {formatInStage(candidate.createdAt)}
              </div>
            </div>
          </div>

          {/* ATS score */}
          <div className="grid grid-cols-[auto_1fr] gap-3.5 items-center mb-[18px]">
            <ScoreVis score={ats ?? 0} style="ring" size={72} label={false} />
            <div>
              <div className="text-[10.5px] font-bold text-subtle uppercase tracking-[0.4px] mb-[3px]">
                Scoring ATS
              </div>
              <div className="text-[24px] font-black text-text tracking-[-0.8px] leading-none">
                {ats ?? "—"}
                <span className="text-[13px] font-bold text-muted ml-1">
                  /100
                </span>
              </div>
              <div className="text-[11px] text-subtle font-bold mt-1">
                {hint}
              </div>
            </div>
          </div>

          {/* Contact */}
          <section className="mb-[18px]">
            <h3 className="text-[11px] font-extrabold text-subtle tracking-[0.4px] uppercase mb-2">
              Contacto
            </h3>
            <div className="flex flex-col gap-1.5 text-[12.5px]">
              <div className="flex justify-between px-[11px] py-2 bg-black/[0.03] rounded-[8px]">
                <span className="text-subtle">Correo</span>
                <a
                  href={`mailto:${candidate.student.email}`}
                  className="text-text font-semibold no-underline hover:underline"
                >
                  {candidate.student.email}
                </a>
              </div>
            </div>
          </section>

          {/* CV */}
          {prof?.cvUrl && (
            <section className="mb-[18px]">
              <h3 className="text-[11px] font-extrabold text-subtle tracking-[0.4px] uppercase mb-2">
                Archivos
              </h3>
              <a
                href={prof.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-[11px] bg-surface border border-border rounded-[10px] no-underline hover:border-border-hi transition-colors"
              >
                <span className="w-[34px] h-[42px] rounded-[5px] bg-accent-bg border border-accent-bdr flex items-center justify-center text-[9px] font-black text-accent tracking-[0.5px] flex-shrink-0">
                  CV
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-text">
                    CV del candidato
                  </div>
                  <div className="text-[10.5px] text-subtle mt-[1px]">
                    Abrir en pestaña nueva
                  </div>
                </div>
              </a>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <footer className="px-[22px] py-[14px] border-t border-border flex gap-2 flex-wrap">
          {/* Chat — only enabled in INTERVIEW (backend rule) */}
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
                className={[
                  "px-3.5 py-[11px] rounded-[10px] text-[13px] font-bold inline-flex items-center gap-1.5 transition-all min-h-[44px]",
                  canChat
                    ? "bg-surface border border-border text-text hover:bg-bg cursor-pointer"
                    : "bg-black/[0.04] border border-transparent text-subtle cursor-not-allowed",
                  chatBusy ? "opacity-60" : "",
                ].join(" ")}
              >
                <Icon
                  name="chat"
                  size={14}
                  color={canChat ? "var(--color-text)" : "var(--color-subtle)"}
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
              className={[
                "flex-1 py-[11px] bg-gradient-to-br from-accent to-accent-hi text-white border-none rounded-[10px] text-[13px] font-extrabold min-h-[44px]",
                busy
                  ? "opacity-60 cursor-default"
                  : "cursor-pointer hover:opacity-90 transition-opacity",
              ].join(" ")}
            >
              Avanzar etapa
            </button>
          )}
          <button
            type="button"
            disabled={busy || currentStage === "REJECTED"}
            onClick={() => onMove(candidate.id, "REJECTED")}
            className={[
              "px-3.5 py-[11px] bg-surface border border-border text-rose rounded-[10px] text-[13px] font-bold min-h-[44px]",
              busy || currentStage === "REJECTED"
                ? "cursor-default opacity-60"
                : "cursor-pointer hover:bg-rose-bg transition-colors",
            ].join(" ")}
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-dark text-white px-3 py-2.5 pl-[18px] rounded-[14px] flex items-center gap-2.5 z-50 shadow-[0_20px_50px_rgba(11,27,63,.4)] flex-wrap">
      <span className="text-[13px] font-extrabold">
        {count} {count === 1 ? "seleccionado" : "seleccionados"}
      </span>
      <span className="w-px h-5 bg-white/15" />
      {STAGES.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onMove(s.key)}
          className="px-3 py-[7px] bg-white/[0.08] border border-white/[0.14] text-white rounded-[8px] text-[12px] font-bold cursor-pointer hover:bg-white/15 transition-colors min-h-[44px] sm:min-h-0"
        >
          {s.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onMove("REJECTED")}
        className="px-3 py-[7px] bg-rose/20 border border-rose/40 text-white rounded-[8px] text-[12px] font-bold cursor-pointer inline-flex items-center gap-1.5 hover:bg-rose/30 transition-colors min-h-[44px] sm:min-h-0"
      >
        <Icon name="x" size={12} color="#fff" />
        Descartar
      </button>
      <span className="w-px h-5 bg-white/15" />
      <button
        type="button"
        onClick={onClear}
        className="px-2.5 py-[7px] bg-transparent border-none text-white/60 text-[12px] font-bold cursor-pointer hover:text-white transition-colors"
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
    <div className="bg-surface border border-border rounded-[14px] overflow-x-auto">
      <table className="w-full border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-black/[0.03] border-b border-border">
            {["", "Postulante", "Etapa", "Score ATS", "Postuló"].map((h, i) => (
              <th
                key={i}
                className="text-left px-3.5 py-2.5 text-[10.5px] font-extrabold text-subtle tracking-[0.4px] uppercase"
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
            const ats = c.atsScore != null ? Math.round(c.atsScore) : null;
            const scoreClass =
              ats == null
                ? "text-subtle"
                : ats >= 80
                  ? "text-green"
                  : ats >= 50
                    ? "text-amber"
                    : "text-rose";
            const [c1, c2] = avatarColors(c.student.name);
            const ini = initialsFor(c.student.name);
            const prof = c.student.studentProfile;
            const isSel = selected.has(c.id);
            return (
              <tr
                key={c.id}
                onClick={() => onOpenCandidate(c.id)}
                className="border-b border-border cursor-pointer hover:bg-black/[0.025] transition-colors"
              >
                <td
                  className="px-3.5 py-2.5 w-[30px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(c.id);
                  }}
                >
                  <span
                    className={[
                      "inline-flex w-4 h-4 rounded-[4px] border-[1.6px] items-center justify-center",
                      isSel
                        ? "border-accent bg-accent"
                        : "border-faint bg-transparent",
                    ].join(" ")}
                  >
                    {isSel && <Icon name="check" size={10} color="#fff" />}
                  </span>
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      size={30}
                      ini={ini}
                      c1={c1}
                      c2={c2}
                      src={c.student.image}
                      alt={c.student.name}
                    />
                    <div>
                      <div className="text-[12.5px] font-bold text-text">
                        {c.student.name}
                      </div>
                      <div className="text-[10.5px] text-subtle">
                        {prof?.university ?? "—"}
                        {prof?.career && ` · ${prof.career}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3.5 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold ${stage.colorClass}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${stage.dotClass}`}
                    />
                    {stage.label}
                  </span>
                </td>
                <td className="px-3.5 py-2.5">
                  <span
                    className={`text-[13px] font-black tracking-[-0.3px] ${scoreClass}`}
                  >
                    {ats != null ? `${ats}%` : "—"}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-[11.5px] text-muted">
                  hace {formatInStage(c.createdAt)}
                </td>
              </tr>
            );
          })}
          {candidates.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-3.5 py-8 text-center text-[12px] text-subtle"
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
    <div className="flex items-center justify-center gap-2.5 py-10 text-muted text-[13px]">
      <span
        className="w-[18px] h-[18px] rounded-full border-2 border-accent/20 border-t-accent"
        style={{ animation: "ats-spin .9s linear infinite" }}
      />
      Cargando pipeline…
    </div>
  );
}
