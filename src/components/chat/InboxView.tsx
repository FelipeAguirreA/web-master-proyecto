"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import ConversationListPanel from "./ConversationListPanel";
import ConversationView from "./ConversationView";
import type { ConversationListItem } from "./ConversationItem";

type RawConversation = {
  id: string;
  companyId: string;
  studentId: string;
  company: { id: string; name: string; image: string | null };
  student: { id: string; name: string; image: string | null };
  internship: { id: string; title: string };
  applicationId: string;
  pipelineStatus: string;
  isPinned: boolean;
  markedUnread: boolean;
  lastMessage: {
    content: string;
    type: "TEXT" | "INTERVIEW";
    createdAt: string;
    senderId: string | null;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

type Props = {
  role: "COMPANY" | "STUDENT";
};

function toListItem(
  c: RawConversation,
  viewerRole: "COMPANY" | "STUDENT",
): ConversationListItem {
  const isViewerCompany = viewerRole === "COMPANY";
  const other = isViewerCompany ? c.student : c.company;
  return {
    id: c.id,
    otherName: other.name,
    otherImage: other.image,
    otherIsCompany: !isViewerCompany,
    internshipTitle: c.internship.title,
    pipelineStatus: c.pipelineStatus,
    isPinned: c.isPinned,
    markedUnread: c.markedUnread,
    lastMessage: c.lastMessage,
    unreadCount: c.unreadCount,
  };
}

export default function InboxView({ role }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const searchParams = useSearchParams();
  // Deep-link desde el ATS: /dashboard/empresa/inbox?c={conversationId}
  // abre directamente esa conversación al cargar la página.
  const initialConvId = searchParams.get("c");

  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(initialConvId);

  // Race-condition fix: mientras hay un PATCH en vuelo para un id, el polling
  // no debe pisar el estado optimista local. Sin esto, un fetchList que
  // dispara entre el setItems y el PATCH-response trae el estado VIEJO de la
  // DB y revierte el toggle visualmente por unos segundos.
  const pendingMutations = useRef<Set<string>>(new Set());

  const fetchList = useCallback(() => {
    fetchWithRefresh("/api/chat/conversations")
      .then((r) => r.json())
      .then((data: RawConversation[]) => {
        const fresh = (data ?? []).map((c) => toListItem(c, role));
        const pending = pendingMutations.current;
        if (pending.size === 0) {
          setItems(fresh);
          return;
        }
        // Para ids con mutation en vuelo, conservamos el optimista local
        setItems((prev) => {
          const prevById = new Map(prev.map((c) => [c.id, c]));
          return fresh.map((f) =>
            pending.has(f.id) ? (prevById.get(f.id) ?? f) : f,
          );
        });
      })
      .catch((err) =>
        Sentry.captureException(err, {
          tags: { component: "InboxView" },
        }),
      )
      .finally(() => setLoading(false));
  }, [role]);

  useEffect(() => {
    fetchList();
    const i = setInterval(fetchList, 5000);
    return () => clearInterval(i);
  }, [fetchList]);

  // Wrapper para PATCH optimistas: marca el id como mutating mientras el
  // request está en vuelo, así el polling no pisa el estado local.
  const mutate = useCallback(
    async (id: string, url: string, onError?: () => void) => {
      pendingMutations.current.add(id);
      try {
        const res = await fetchWithRefresh(url, { method: "PATCH" });
        if (!res.ok) onError?.();
      } catch {
        onError?.();
      } finally {
        pendingMutations.current.delete(id);
      }
    },
    [],
  );

  const handleSelect = (id: string) => {
    setActiveId(id);
    // Optimista: la conversación abierta deja de estar marcada-no-leída
    setItems((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, markedUnread: false, unreadCount: 0 } : c,
      ),
    );
    // El endpoint /read ya limpia el markedUnread del rol
    mutate(id, `/api/chat/conversations/${id}/read`);
  };

  const togglePin = (id: string) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c)),
    );
    mutate(id, `/api/chat/conversations/${id}/pin`, fetchList);
  };

  const toggleUnread = (id: string) => {
    setItems((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, markedUnread: !c.markedUnread } : c,
      ),
    );
    mutate(id, `/api/chat/conversations/${id}/unread`, fetchList);
  };

  const activeItem = activeId ? items.find((c) => c.id === activeId) : null;
  const emptyHint =
    role === "STUDENT"
      ? "Cuando una empresa te contacte, los mensajes van a aparecer acá."
      : "Contacta a candidatos desde el panel ATS para iniciar conversaciones.";

  return (
    <div className="h-[calc(100dvh-80px)] md:h-[calc(100vh-96px)] bg-[#FAFAF8]">
      <div className="h-full grid md:grid-cols-[320px_1fr] grid-cols-1 border-t border-[#E8E5DD]">
        {/* List */}
        <aside
          className={`bg-white border-r border-[#E8E5DD] min-h-0 ${
            activeId ? "hidden md:block" : "block"
          }`}
        >
          <ConversationListPanel
            conversations={items}
            activeId={activeId}
            onSelect={handleSelect}
            loading={loading}
            emptyHint={emptyHint}
            userId={userId}
          />
        </aside>

        {/* Conversation */}
        <main className={`min-h-0 ${activeId ? "block" : "hidden md:block"}`}>
          {activeId && activeItem ? (
            <ConversationView
              key={activeId}
              conversationId={activeId}
              userId={userId}
              userRole={role}
              isPinned={activeItem.isPinned}
              markedUnread={activeItem.markedUnread}
              onTogglePin={() => togglePin(activeId)}
              onToggleUnread={() => toggleUnread(activeId)}
              showBack
              onBack={() => setActiveId(null)}
            />
          ) : (
            <EmptyState role={role} />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ role }: { role: "COMPANY" | "STUDENT" }) {
  return (
    <div className="h-full flex items-center justify-center relative bg-[#FAFAF8]">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(500px_circle_at_50%_30%,rgba(255,106,61,0.08),transparent_60%)]" />
      <div className="relative text-center max-w-sm px-6">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-white border border-[#E8E5DD] items-center justify-center mb-5 shadow-sm">
          <MessageSquare className="w-7 h-7 text-[#FF6A3D]" strokeWidth={1.8} />
        </div>
        <p className="text-[15px] font-bold text-[#0A0909] tracking-tight mb-1.5">
          {role === "STUDENT"
            ? "Tu bandeja está esperando"
            : "Selecciona una conversación"}
        </p>
        <p className="text-[13px] text-[#6D6A63] leading-relaxed">
          {role === "STUDENT"
            ? "Cuando una empresa te contacte, vas a poder responder desde acá."
            : "Elige un candidato de la lista para ver el hilo y responder."}
        </p>
      </div>
    </div>
  );
}
