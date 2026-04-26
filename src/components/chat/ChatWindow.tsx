"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { supabaseRealtime } from "@/lib/supabase/realtime-client";
import MessageBubble from "./MessageBubble";
import InterviewMessageCard from "./InterviewMessageCard";
import MessageInput from "./MessageInput";
import { ArrowLeft, Calendar, MessageSquare, Building2 } from "lucide-react";
import Link from "next/link";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

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

function avatarGradient(name: string): string {
  const gradients = [
    "from-[#FF6A3D] to-[#C2410C]",
    "from-[#F59E0B] to-[#B45309]",
    "from-[#10B981] to-[#047857]",
    "from-[#3B82F6] to-[#1D4ED8]",
    "from-[#8B5CF6] to-[#6D28D9]",
    "from-[#0A0909] to-[#2a2722]",
    "from-[#F97316] to-[#9A3412]",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return gradients[hash % gradients.length];
}

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
  const [imgBroken, setImgBroken] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [metaRes, msgsRes] = await Promise.all([
          fetchWithRefresh(`/api/chat/conversations/${conversationId}`),
          fetchWithRefresh(
            `/api/chat/conversations/${conversationId}/messages?limit=50`,
          ),
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

  useEffect(() => {
    const isFirstLoad = prevMessageCount.current === 0 && messages.length > 0;
    const hasNewMessages = messages.length > prevMessageCount.current;

    if (isFirstLoad) {
      bottomRef.current?.scrollIntoView();
    } else if (hasNewMessages) {
      scrollToBottom();
    }

    prevMessageCount.current = messages.length;
  }, [messages, scrollToBottom]);

  const refetchMessages = useCallback(async () => {
    if (hasPendingOptimistic.current) return;
    const res = await fetchWithRefresh(
      `/api/chat/conversations/${conversationId}/messages?limit=50`,
    );
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      refetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, refetchMessages]);

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
    setTimeout(() => scrollToBottom(true), 30);

    fetchWithRefresh(`/api/chat/conversations/${conversationId}/messages`, {
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
      <div className="flex-1 flex items-center justify-center bg-[#FAFAF8]">
        <div className="w-8 h-8 border-4 border-[#FF6A3D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meta) return null;

  const isCompany = userRole === "COMPANY";
  const otherPerson = isCompany ? meta.student : meta.company;
  const otherIsCompany = !isCompany;
  const headerName = isCompany
    ? otherPerson.name
    : `${meta.company.contactName} · ${meta.company.name}`;
  const hasMessages = messages.length > 0;
  const isStudentAndNoMessages = !isCompany && !hasMessages;
  const showImage = otherPerson.image && !imgBroken;
  const headerFallbackGradient = otherIsCompany
    ? "from-[#2a2722] to-[#0A0909]"
    : avatarGradient(otherPerson.name);

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8] relative">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(600px circle at 80% 0%, rgba(255,106,61,0.04), transparent 50%), radial-gradient(500px circle at 20% 100%, rgba(194,65,12,0.03), transparent 50%)",
        }}
      />

      <div className="relative flex items-center gap-3 px-5 bg-white/70 backdrop-blur-md border-b border-[#E8E5DD] flex-shrink-0 h-16 z-10">
        {showBackButton && (
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-[#F5F4F1] transition-colors text-[#4A4843] flex-shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden text-white shadow-sm bg-gradient-to-br ${headerFallbackGradient}`}
          >
            {showImage ? (
              <img
                src={otherPerson.image!}
                alt={otherPerson.name}
                onError={() => setImgBroken(true)}
                className="w-full h-full object-cover"
              />
            ) : otherIsCompany ? (
              <Building2 className="w-5 h-5" strokeWidth={2.2} />
            ) : (
              otherPerson.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0A0909] truncate tracking-tight">
              {headerName}
            </p>
            <p className="text-[11px] text-[#9B9891] truncate mt-0.5 uppercase tracking-wide font-medium">
              {meta.application.internship.title}
            </p>
          </div>
        </div>

        {isCompany && (
          <Link
            href={`/dashboard/empresa/calendar`}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0A0909] bg-white hover:bg-[#F5F4F1] px-3.5 py-2 rounded-xl transition-all flex-shrink-0 border border-[#E8E5DD] shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-[#FF6A3D]" />
            Calendario
          </Link>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-1 z-10"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E5DD] flex items-center justify-center mb-4 shadow-sm">
              <MessageSquare className="w-6 h-6 text-[#9B9891]" />
            </div>
            <p className="text-sm text-[#6D6A63] leading-relaxed max-w-xs">
              {isCompany
                ? "Enviá el primer mensaje para iniciar la conversación."
                : "Cuando la empresa te contacte podrás responder acá."}
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

      <div className="relative z-10">
        <MessageInput onSend={handleSend} disabled={isStudentAndNoMessages} />
      </div>
    </div>
  );
}
