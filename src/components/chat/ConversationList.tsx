"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import ConversationItem from "./ConversationItem";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

type Conversation = {
  id: string;
  companyId: string;
  studentId: string;
  company: { id: string; name: string; image: string | null };
  student: { id: string; name: string; image: string | null };
  internship: { id: string; title: string };
  lastMessage: {
    content: string;
    type: "TEXT" | "INTERVIEW";
    createdAt: string;
    senderId: string | null;
    isRead: boolean;
  } | null;
  unreadCount: number;
  hasPendingInterview: boolean;
  updatedAt: string;
};

type ConversationListProps = {
  activeConversationId: string | null;
  onSelect: (id: string) => void;
};

export default function ConversationList({
  activeConversationId,
  onSelect,
}: ConversationListProps) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(() => {
    fetchWithRefresh("/api/chat/conversations")
      .then((r) => r.json())
      .then((data) => setConversations(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-[3px] border-[#FF6A3D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#E8E5DD] bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A3D] to-[#C2410C] flex items-center justify-center shadow-sm">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-[15px] font-bold text-[#0A0909] tracking-tight">
            Mensajes
          </h2>
          {totalUnread > 0 && (
            <span className="ml-auto text-[10px] font-bold text-white bg-gradient-to-br from-[#FF6A3D] to-[#C2410C] px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
              {totalUnread} sin leer
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F4F1] flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-[#9B9891]" />
            </div>
            <p className="text-sm text-[#6D6A63] leading-relaxed">
              {userRole === "STUDENT"
                ? "Cuando una empresa te contacte, los mensajes aparecerán acá."
                : "Contactá candidatos desde el panel ATS para iniciar conversaciones."}
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isCompany = userRole === "COMPANY";
            const otherPerson = isCompany ? conv.student : conv.company;
            const otherIsCompany = !isCompany;

            return (
              <ConversationItem
                key={conv.id}
                id={conv.id}
                otherPersonName={otherPerson.name}
                otherPersonImage={otherPerson.image}
                internshipTitle={conv.internship.title}
                lastMessage={conv.lastMessage}
                unreadCount={conv.unreadCount}
                hasPendingInterview={isCompany && conv.hasPendingInterview}
                isActive={conv.id === activeConversationId}
                isCompany={otherIsCompany}
                onClick={() => onSelect(conv.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
