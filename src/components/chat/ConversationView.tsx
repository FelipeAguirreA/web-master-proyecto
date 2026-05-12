"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Star, BellOff, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { supabaseRealtime } from "@/lib/client/supabase";
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
    const channel = supabaseRealtime
      .channel(`conversation:${conversationId}`)
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
    return () => {
      supabaseRealtime.removeChannel(channel);
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
      <header className="flex items-center gap-3 px-[22px] py-3.5 bg-white border-b border-[#E8E5DD] flex-shrink-0">
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
            size={42}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[14.5px] font-extrabold text-[#0A0909] truncate tracking-tight">
              {headerName}
            </h2>
          </div>
          <div className="flex gap-2 items-center mt-0.5">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded tracking-wide"
              style={{ color: stage.color, background: stage.bg }}
            >
              {stage.label}
            </span>
            <span className="text-[11.5px] text-[#9B9891] truncate">
              {headerSubtitle}
            </span>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onTogglePin}
            title={isPinned ? "Desanclar" : "Anclar"}
            className={`w-[34px] h-[34px] rounded-lg border flex items-center justify-center transition-colors ${
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
            title={markedUnread ? "Marcar como leído" : "Marcar como no leído"}
            className={`w-[34px] h-[34px] rounded-lg border flex items-center justify-center transition-colors ${
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
              className="inline-flex items-center gap-1 px-3 py-[7px] bg-white border border-[#E8E5DD] hover:bg-[#F5F4F1] text-[#0A0909] rounded-lg text-[11.5px] font-bold transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#FF6A3D]" />
              Calendario
            </Link>
          ) : (
            <Link
              href={`/practicas/${meta.application.internship.id}`}
              className="inline-flex items-center gap-1 px-3 py-[7px] bg-white border border-[#E8E5DD] hover:bg-[#F5F4F1] text-[#0A0909] rounded-lg text-[11.5px] font-bold transition-colors"
            >
              Ver práctica
              <ArrowRight className="w-3 h-3" strokeWidth={2.2} />
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-[22px] py-6 flex flex-col gap-3.5 relative"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(600px circle at 80% 0%, rgba(255,106,61,0.04), transparent 50%)",
          }}
        />
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
