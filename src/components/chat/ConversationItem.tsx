"use client";

import { useState } from "react";
import { AlertTriangle, CalendarDays, Building2 } from "lucide-react";

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
  isCompany?: boolean;
  onClick: () => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

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

export default function ConversationItem({
  otherPersonName,
  otherPersonImage,
  internshipTitle,
  lastMessage,
  unreadCount,
  hasPendingInterview,
  isActive,
  isCompany = false,
  onClick,
}: ConversationItemProps) {
  const [imgBroken, setImgBroken] = useState(false);
  const preview = lastMessage
    ? lastMessage.type === "INTERVIEW"
      ? "Cita de entrevista"
      : lastMessage.content.slice(0, 60)
    : "Sin mensajes aún";
  const isInterviewMsg = lastMessage?.type === "INTERVIEW";
  const showImage = otherPersonImage && !imgBroken;
  const fallbackGradient = isCompany
    ? "from-[#2a2722] to-[#0A0909]"
    : avatarGradient(otherPersonName);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 transition-all border-b border-[#F0EDE4] group relative ${
        isActive
          ? "bg-gradient-to-r from-[#FFF4EE] to-transparent"
          : "hover:bg-[#F5F4F1]/60"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-[#FF6A3D] to-[#C2410C]" />
      )}

      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden text-white shadow-sm bg-gradient-to-br ${fallbackGradient}`}
        >
          {showImage ? (
            <img
              src={otherPersonImage}
              alt={otherPersonName}
              onError={() => setImgBroken(true)}
              className="w-full h-full object-cover"
            />
          ) : isCompany ? (
            <Building2 className="w-5 h-5" strokeWidth={2.2} />
          ) : (
            otherPersonName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-sm font-bold truncate ${
                  unreadCount > 0 ? "text-[#0A0909]" : "text-[#2a2722]"
                }`}
              >
                {otherPersonName}
              </p>
              <p className="text-[11px] text-[#9B9891] truncate mt-0.5">
                {internshipTitle}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {lastMessage && (
                <span className="text-[10px] font-medium text-[#9B9891] tabular-nums">
                  {timeAgo(lastMessage.createdAt)}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 bg-gradient-to-br from-[#FF6A3D] to-[#C2410C] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            {isInterviewMsg && (
              <CalendarDays className="w-3 h-3 text-[#FF6A3D] flex-shrink-0" />
            )}
            <p
              className={`text-xs truncate ${
                unreadCount > 0
                  ? "text-[#4A4843] font-medium"
                  : "text-[#6D6A63]"
              }`}
            >
              {preview}
            </p>
          </div>

          {hasPendingInterview && (
            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg bg-[#FEF3C7] w-fit">
              <AlertTriangle className="w-3 h-3 text-[#B45309] flex-shrink-0" />
              <span className="text-[10px] text-[#B45309] font-semibold uppercase tracking-wide">
                Cita sin enviar
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
