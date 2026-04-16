"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { supabaseRealtime } from "@/lib/supabase/realtime-client";
import MessageBubble from "./MessageBubble";
import InterviewMessageCard from "./InterviewMessageCard";
import MessageInput from "./MessageInput";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

type Sender = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "INTERVIEW";
  createdAt: string;
  sender: Sender;
};

type ConversationMeta = {
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
    internship: {
      id: string;
      title: string;
      company: { companyName: string };
    };
  };
};

type ChatWindowProps = {
  conversationId: string;
  showBackButton?: boolean;
  onBack?: () => void;
};

export default function ChatWindow({
  conversationId,
  showBackButton = false,
  onBack,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const userRole = (session?.user as { role?: string })?.role ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasPendingOptimistic = useRef(false);
  const prevMessageCount = useRef(0);

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const scrollToBottom = useCallback(
    (force = false) => {
      if (force || isNearBottom()) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [isNearBottom],
  );

  // Cargar metadata + mensajes iniciales
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [metaRes, msgsRes] = await Promise.all([
          fetch(`/api/chat/conversations/${conversationId}`),
          fetch(`/api/chat/conversations/${conversationId}/messages?limit=50`),
        ]);

        if (!metaRes.ok || !msgsRes.ok) return;

        const metaData = await metaRes.json();
        const msgsData = await msgsRes.json();

        if (!cancelled) {
          setMeta(metaData);
          setMessages(msgsData.messages ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Scroll solo cuando llegan mensajes nuevos — no en cada poll
  useEffect(() => {
    const isFirstLoad = prevMessageCount.current === 0 && messages.length > 0;
    const hasNewMessages = messages.length > prevMessageCount.current;

    if (isFirstLoad) {
      // Al cargar por primera vez: scroll forzado sin animación
      bottomRef.current?.scrollIntoView();
    } else if (hasNewMessages) {
      // Nuevo mensaje: scroll solo si ya estaba al fondo
      scrollToBottom();
    }

    prevMessageCount.current = messages.length;
  }, [messages, scrollToBottom]);

  const refetchMessages = useCallback(async () => {
    // No reemplazar si hay un optimista en vuelo — evita parpadeo
    if (hasPendingOptimistic.current) return;
    const res = await fetch(
      `/api/chat/conversations/${conversationId}/messages?limit=50`,
    );
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, [conversationId]);

  // Polling cada 3 segundos — garantiza que el receptor recibe mensajes
  // aunque Realtime falle por RLS u otras restricciones de Supabase
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      refetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, refetchMessages]);

  // Supabase Realtime — para recepción instantánea cuando funciona
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabaseRealtime
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
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
    // Optimistic update sincrónico — aparece al instante
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
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
    hasPendingOptimistic.current = true;
    setMessages((prev) => [...prev, optimisticMsg]);
    // Al enviar propio mensaje siempre scrollear al fondo
    setTimeout(() => scrollToBottom(true), 30);

    // Fire and forget — no bloquea el input
    fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
      .then((res) => {
        hasPendingOptimistic.current = false;
        if (res.ok) {
          refetchMessages();
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      })
      .catch(() => {
        hasPendingOptimistic.current = false;
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meta) return null;

  const isCompany = userRole === "COMPANY";
  const otherPerson = isCompany ? meta.student : meta.company;
  const hasMessages = messages.length > 0;
  const isStudentAndNoMessages = !isCompany && !hasMessages;

  return (
    <div className="flex flex-col h-full bg-[#f9f9ff]">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-0 bg-white border-b border-gray-100 shadow-sm flex-shrink-0"
        style={{ height: "64px" }}
      >
        {showBackButton && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0 self-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0 self-center">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
            {otherPerson.image ? (
              <img
                src={otherPerson.image}
                alt={otherPerson.name}
                className="w-full h-full object-cover"
              />
            ) : (
              otherPerson.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {isCompany
                ? otherPerson.name
                : `${meta.company.contactName} - ${meta.company.name}`}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {meta.application.internship.title}
            </p>
          </div>
        </div>

        {isCompany && (
          <Link
            href={`/dashboard/empresa/calendar`}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 self-center"
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendario
          </Link>
        )}
      </div>

      {/* Mensajes */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 text-center">
              {isCompany
                ? "Enviá el primer mensaje para iniciar la conversación."
                : "Cuando la empresa te contacte podrás responder aquí."}
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === "INTERVIEW") {
            return (
              <InterviewMessageCard
                key={msg.id}
                content={msg.content}
                createdAt={msg.createdAt}
                isMine={msg.senderId === userId}
              />
            );
          }

          return (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              isMine={msg.senderId === userId}
              senderName={msg.sender.name}
              senderImage={msg.sender.image}
              createdAt={msg.createdAt}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={isStudentAndNoMessages} />
    </div>
  );
}
