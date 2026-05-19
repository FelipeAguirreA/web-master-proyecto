"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Star, BellOff, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { supabaseRealtime } from "@/lib/client/supabase";
import { authenticateRealtime } from "@/lib/client/supabase-auth";
import InboxAvatar from "./InboxAvatar";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import InterviewMessageCard from "./InterviewMessageCard";
import { stageMeta } from "./pipelineStage";

type Sender = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string | null;
  content: string;
  type: "TEXT" | "INTERVIEW";
  createdAt: string;
  sender: Sender | null;
  // Key estable para React. Para mensajes optimistic empieza como `temp-...`
  // y se preserva cuando el POST devuelve el real (cuid distinto), evitando
  // que React desmonte+remonte el bubble = flicker visual.
  _localKey?: string;
};

type Meta = {
  id: string;
  companyId: string;
  studentId: string;
  company: {
    id: string;
    name: string;
    contactName: string;
    image: string | null;
  };
  student: { id: string; name: string; image: string | null };
  application: {
    pipelineStatus: string;
    internship: {
      id: string;
      title: string;
      company: { companyName: string };
    };
  };
};

type Props = {
  conversationId: string;
  userId: string;
  userRole: "COMPANY" | "STUDENT";
  isPinned: boolean;
  markedUnread: boolean;
  onTogglePin: () => void;
  onToggleUnread: () => void;
  onBack?: () => void;
  showBack: boolean;
};

function sameDayIso(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export default function ConversationView({
  conversationId,
  userId,
  userRole,
  isPinned,
  markedUnread,
  onTogglePin,
  onToggleUnread,
  onBack,
  showBack,
}: Props) {
  const { data: session } = useSession();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Polling cada 3s + Realtime para nuevos mensajes. NO guard del polling —
  // un boolean global era frágil (cualquier path que no resolvía la promise
  // lo dejaba pegado). En su lugar, el merge en refetchMessages conserva los
  // temp-* locales que aún están in-flight.
  const prevCount = useRef(0);
  const isCompany = userRole === "COMPANY";

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    // 300px ≈ 2-3 mensajes de altura típica. Generoso para que el
    // auto-scroll se sienta natural: si veo el área de "los últimos
    // mensajes", al llegar uno nuevo bajo.
    return el.scrollHeight - el.scrollTop - el.clientHeight < 300;
  }, []);

  const scrollToBottom = useCallback(
    (force = false) => {
      if (force || isNearBottom()) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [isNearBottom],
  );

  // InboxView re-monta este componente con key={conversationId}, por eso
  // alcanza con el fetch inicial — no hay que limpiar state al cambiar de
  // conversación (el componente arranca con state default).
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchWithRefresh(`/api/chat/conversations/${conversationId}`),
      fetchWithRefresh(
        `/api/chat/conversations/${conversationId}/messages?limit=50`,
      ),
    ])
      .then(async ([metaRes, msgsRes]) => {
        if (!metaRes.ok || !msgsRes.ok) return;
        const metaData = await metaRes.json();
        const msgsData = await msgsRes.json();
        if (cancelled) return;
        setMeta(metaData);
        setMessages(msgsData.messages ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    const isFirst = prevCount.current === 0 && messages.length > 0;
    const hasNew = messages.length > prevCount.current;
    if (isFirst) {
      bottomRef.current?.scrollIntoView();
    } else if (hasNew) {
      // Solo baja si el user ya estaba cerca del fondo. Si está leyendo
      // mensajes viejos, respeta su posición — comportamiento tipo Slack.
      scrollToBottom();
    }
    prevCount.current = messages.length;
  }, [messages, scrollToBottom]);

  const refetchMessages = useCallback(async () => {
    try {
      const res = await fetchWithRefresh(
        `/api/chat/conversations/${conversationId}/messages?limit=50`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const serverMsgs: Message[] = data.messages ?? [];
      setMessages((prev) => {
        // Preservar _localKey: si un mensaje del server matchea con uno local
        // que ya tenía _localKey (porque vino del optimistic), conservar la
        // key estable para que React no desmonte+remonte el bubble.
        const localKeyById = new Map<string, string>();
        for (const m of prev) {
          if (m._localKey && !m.id.startsWith("temp-")) {
            localKeyById.set(m.id, m._localKey);
          }
        }
        const merged = serverMsgs.map((s) => {
          const lk = localKeyById.get(s.id);
          return lk ? { ...s, _localKey: lk } : s;
        });
        // Conserva los optimistic temp-* todavía en vuelo (POST sin respuesta).
        const serverIds = new Set(serverMsgs.map((m) => m.id));
        const temps = prev.filter(
          (m) => m.id.startsWith("temp-") && !serverIds.has(m.id),
        );
        return [...merged, ...temps];
      });
    } catch {
      // Silent — el próximo tick reintenta
    }
  }, [conversationId]);

  // Polling cada 3s — fallback cuando Realtime no entrega el INSERT al otro
  // lado de la conversación. El guard hasPendingOptimistic evita pisar opt
  // mientras hay un POST en vuelo.
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(() => {
      refetchMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId, refetchMessages]);

  // Refetch inmediato cuando la pestaña vuelve al foco. Los navegadores pausan
  // setInterval en tabs en background, así que sin esto un receiver con la
  // pestaña detrás puede tardar minutos en ver mensajes nuevos al activarla.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refetchMessages();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refetchMessages]);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    let channelRef: ReturnType<typeof supabaseRealtime.channel> | null = null;

    // Auth JWT primero — RLS policy sobre `messages` exige que el JWT
    // contenga el sub del user, sino el SELECT (subyacente al INSERT push)
    // es rechazado. Sin auth no llegan mensajes en tiempo real.
    (async () => {
      const ok = await authenticateRealtime();
      if (!ok || cancelled) return;

      channelRef = supabaseRealtime
        .channel(`conversation:${conversationId}:${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const newMsg = payload.new as { conversationId: string };
            if (newMsg.conversationId !== conversationId) return;
            await refetchMessages();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channelRef) {
        channelRef.unsubscribe();
        supabaseRealtime.removeChannel(channelRef);
      }
    };
  }, [conversationId, refetchMessages]);

  const handleSend = (content: string) => {
    // Optimistic instantáneo + _localKey estable para evitar flicker:
    // - tempId es el `id` del mensaje optimistic
    // - _localKey = tempId también, pero se preserva cuando POST devuelve
    //   el real con un cuid distinto. React mantiene el mismo DOM element
    //   porque la key (=_localKey) no cambia.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: Message = {
      id: tempId,
      _localKey: tempId,
      conversationId,
      senderId: userId,
      content,
      type: "TEXT",
      createdAt: new Date().toISOString(),
      sender: {
        id: userId,
        name: session?.user?.name ?? "",
        image: (session?.user as { image?: string })?.image ?? null,
        role: userRole,
      },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 30);

    fetchWithRefresh(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
      .then(async (res) => {
        if (res.ok) {
          const real = (await res.json()) as Message;
          // Reemplazo el optimistic por el real PERO preservo _localKey =
          // tempId. La key React queda igual → sin flicker.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...real, _localKey: tempId } : m,
            ),
          );
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      })
      .catch(() => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FAFAF8]">
        <div className="w-8 h-8 border-[3px] border-[#FF6A3D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meta) return null;

  const otherPerson = isCompany ? meta.student : meta.company;
  const otherIsCompany = !isCompany;
  const headerName = isCompany
    ? otherPerson.name
    : `${meta.company.contactName} · ${meta.company.name}`;
  const headerSubtitle = meta.application.internship.title;
  const stage = stageMeta(meta.application.pipelineStatus);
  const hasMessages = messages.length > 0;
  const studentCantInitiate = !isCompany && !hasMessages;

  return (
    <section className="flex flex-col h-full bg-[#FAFAF8] min-h-0">
      {/* Header */}
      <header className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-[22px] py-2.5 sm:py-3.5 bg-white border-b border-[#E8E5DD] flex-shrink-0">
        {showBack && (
          <button
            onClick={onBack}
            aria-label="Volver"
            className="p-1.5 rounded-lg hover:bg-[#F5F4F1] text-[#4A4843] flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-shrink-0">
          <InboxAvatar
            name={otherPerson.name}
            image={otherPerson.image}
            isCompany={otherIsCompany}
            size={38}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14.5px] font-extrabold text-[#0A0909] truncate tracking-tight">
            {headerName}
          </h2>
          <div className="flex gap-1.5 items-center mt-0.5 flex-wrap">
            <span
              className="text-[10.5px] font-bold px-1.5 py-0.5 rounded tracking-wide"
              style={{
                color: stage.color,
                background: stage.bg,
              }} /* dynamic: runtime pipelineStatus hex from stageMeta */
            >
              {stage.label}
            </span>
            <span className="text-[11.5px] text-[#9B9891] truncate">
              {headerSubtitle}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={onTogglePin}
            aria-label={isPinned ? "Desanclar" : "Anclar"}
            title={isPinned ? "Desanclar" : "Anclar"}
            className={`w-9 h-9 sm:w-[34px] sm:h-[34px] rounded-lg border flex items-center justify-center transition-colors ${
              isPinned
                ? "bg-[#FFF0E4] border-[#FFD4B5]"
                : "bg-transparent border-[#E8E5DD] hover:bg-[#F5F4F1]"
            }`}
          >
            <Star
              className="w-3.5 h-3.5"
              fill={isPinned ? "#FF6A3D" : "transparent"}
              stroke={isPinned ? "#FF6A3D" : "#4A4843"}
            />
          </button>
          <button
            onClick={onToggleUnread}
            aria-label={
              markedUnread ? "Marcar como leído" : "Marcar como no leído"
            }
            title={markedUnread ? "Marcar como leído" : "Marcar como no leído"}
            className={`w-9 h-9 sm:w-[34px] sm:h-[34px] rounded-lg border flex items-center justify-center transition-colors ${
              markedUnread
                ? "bg-[#FFF0E4] border-[#FFD4B5]"
                : "bg-transparent border-[#E8E5DD] hover:bg-[#F5F4F1]"
            }`}
          >
            <BellOff
              className="w-3.5 h-3.5"
              stroke={markedUnread ? "#FF6A3D" : "#4A4843"}
            />
          </button>
          {isCompany ? (
            <Link
              href={`/dashboard/empresa/calendar`}
              aria-label="Calendario"
              className="inline-flex items-center gap-1 w-9 h-9 sm:w-auto sm:h-auto justify-center sm:px-3 sm:py-[7px] bg-white border border-[#E8E5DD] hover:bg-[#F5F4F1] text-[#0A0909] rounded-lg text-[11.5px] font-bold transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF6A3D]" />
              <span className="hidden sm:inline">Calendario</span>
            </Link>
          ) : (
            <Link
              href={`/practicas/${meta.application.internship.id}`}
              aria-label="Ver práctica"
              className="inline-flex items-center gap-1 w-9 h-9 sm:w-auto sm:h-auto justify-center sm:px-3 sm:py-[7px] bg-white border border-[#E8E5DD] hover:bg-[#F5F4F1] text-[#0A0909] rounded-lg text-[11.5px] font-bold transition-colors"
            >
              <span className="hidden sm:inline">Ver práctica</span>
              <ArrowRight
                className="w-3.5 h-3.5 sm:w-3 sm:h-3"
                strokeWidth={2.2}
              />
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[22px] py-6 flex flex-col gap-3.5 relative"
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(600px_circle_at_80%_0%,rgba(255,106,61,0.04),transparent_50%)]" />
        {messages.length === 0 ? (
          <div className="relative flex-1 flex items-center justify-center text-center px-6">
            <p className="text-[13px] text-[#6D6A63] leading-relaxed max-w-xs">
              {isCompany
                ? "Envía el primer mensaje para iniciar la conversación."
                : "Cuando la empresa te contacte podrás responder acá."}
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDateSep =
              !prev || !sameDayIso(prev.createdAt, m.createdAt);
            const isMine = m.senderId === userId;
            const prevSameSender =
              prev && prev.senderId === m.senderId && !showDateSep;
            const showAvatar = !isMine && !prevSameSender;
            // Key estable: _localKey si vino de un optimistic (preserva DOM
            // element entre temp→real), sino el id del server.
            const reactKey = m._localKey ?? m.id;

            if (m.type === "INTERVIEW") {
              return (
                <div key={reactKey} className="relative z-10">
                  <InterviewMessageCard
                    content={m.content}
                    createdAt={m.createdAt}
                    isMine={isMine}
                  />
                </div>
              );
            }

            return (
              <div key={reactKey} className="relative z-10">
                <MessageBubble
                  content={m.content}
                  isMine={isMine}
                  senderName={m.sender?.name ?? otherPerson.name}
                  senderImage={m.sender?.image ?? otherPerson.image}
                  senderIsCompany={!isMine && otherIsCompany}
                  createdAt={m.createdAt}
                  showAvatar={showAvatar}
                  showDateSep={showDateSep}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <Composer
        onSend={handleSend}
        disabled={studentCantInitiate}
        disabledHint={
          studentCantInitiate
            ? "Espera a que la empresa te contacte primero."
            : undefined
        }
        showTemplates={isCompany}
        placeholderName={otherPerson.name}
      />
    </section>
  );
}
