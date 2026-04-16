"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import ConversationItem from "./ConversationItem";

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
    senderId: string;
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
    fetch("/api/chat/conversations")
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
        <div className="w-6 h-6 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-600" />
          <h2 className="text-base font-extrabold text-gray-900">Mensajes</h2>
          {totalUnread > 0 && (
            <span className="ml-auto text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
              {totalUnread} sin leer
            </span>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <p className="text-sm text-gray-400">
              {userRole === "STUDENT"
                ? "Cuando una empresa te contacte, los mensajes aparecerán aquí."
                : "Contactá candidatos desde el panel ATS para iniciar conversaciones."}
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isCompany = userRole === "COMPANY";
            const otherPerson = isCompany ? conv.student : conv.company;

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
                onClick={() => onSelect(conv.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
