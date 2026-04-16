"use client";

import { AlertTriangle } from "lucide-react";

type ConversationItemProps = {
  id: string;
  otherPersonName: string;
  otherPersonImage: string | null;
  internshipTitle: string;
  lastMessage: {
    content: string;
    type: "TEXT" | "INTERVIEW";
    createdAt: string;
  } | null;
  unreadCount: number;
  hasPendingInterview: boolean;
  isActive: boolean;
  onClick: () => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function ConversationItem({
  otherPersonName,
  otherPersonImage,
  internshipTitle,
  lastMessage,
  unreadCount,
  hasPendingInterview,
  isActive,
  onClick,
}: ConversationItemProps) {
  const preview = lastMessage
    ? lastMessage.type === "INTERVIEW"
      ? "📅 Cita de entrevista"
      : lastMessage.content.slice(0, 60)
    : "Sin mensajes aún";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 transition-colors border-b border-gray-50 ${
        isActive ? "bg-brand-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden">
          {otherPersonImage ? (
            <img
              src={otherPersonImage}
              alt={otherPersonName}
              className="w-full h-full object-cover"
            />
          ) : (
            otherPersonName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-sm font-bold truncate ${
                  unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                }`}
              >
                {otherPersonName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {internshipTitle}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {lastMessage && (
                <span className="text-[11px] text-gray-400">
                  {timeAgo(lastMessage.createdAt)}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 truncate mt-0.5">{preview}</p>

          {hasPendingInterview && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span className="text-[11px] text-amber-600 font-medium">
                Tenés una cita sin enviar
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
