"use client";

import { Star } from "lucide-react";
import InboxAvatar from "./InboxAvatar";
import { stageMeta } from "./pipelineStage";

export type ConversationListItem = {
  id: string;
  otherName: string;
  otherImage: string | null;
  otherIsCompany: boolean;
  internshipTitle: string;
  pipelineStatus: string | null;
  isPinned: boolean;
  markedUnread: boolean;
  lastMessage: {
    content: string;
    type: "TEXT" | "INTERVIEW";
    createdAt: string;
    senderId: string | null;
  } | null;
  unreadCount: number;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

type Props = {
  conversation: ConversationListItem;
  isActive: boolean;
  onClick: () => void;
};

export default function ConversationItem({
  conversation: c,
  isActive,
  onClick,
}: Props) {
  const stage = stageMeta(c.pipelineStatus);
  const displayUnread = c.markedUnread
    ? Math.max(1, c.unreadCount)
    : c.unreadCount;
  const isUnread = displayUnread > 0;
  const preview =
    c.lastMessage?.type === "INTERVIEW"
      ? "📅 Cita de entrevista"
      : (c.lastMessage?.content ?? "Sin mensajes aún");

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-[#E8E5DD] transition-colors relative border-l-[3px] ${
        isActive
          ? "bg-[#FFF0E4]/60 border-l-[#FF6A3D]"
          : "hover:bg-[rgba(15,23,42,0.025)] border-l-transparent"
      }`}
    >
      <div className="flex gap-2.5">
        <div className="flex-shrink-0">
          <InboxAvatar
            name={c.otherName}
            image={c.otherImage}
            isCompany={c.otherIsCompany}
            size={38}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {c.isPinned && (
              <Star
                className="w-[11px] h-[11px] flex-shrink-0"
                fill="#FF6A3D"
                stroke="#FF6A3D"
              />
            )}
            <span
              className={`text-[13px] truncate flex-1 min-w-0 ${
                isUnread ? "font-extrabold" : "font-bold"
              } text-[#0A0909]`}
            >
              {c.otherName}
            </span>
            {c.lastMessage && (
              <span
                className={`text-[10.5px] flex-shrink-0 tabular-nums ${
                  isUnread
                    ? "text-[#FF6A3D] font-extrabold"
                    : "text-[#9B9891] font-semibold"
                }`}
              >
                {timeAgo(c.lastMessage.createdAt)}
              </span>
            )}
          </div>
          <div
            className="text-[10.5px] font-bold mb-1 truncate"
            style={{
              color: stage.color,
            }} /* dynamic: runtime pipelineStatus hex from stageMeta */
          >
            {c.internshipTitle}
          </div>
          <div className="flex gap-1.5 items-center">
            <p
              className={`flex-1 min-w-0 text-[11.5px] truncate leading-relaxed ${
                isUnread
                  ? "text-[#0A0909] font-semibold"
                  : "text-[#6D6A63] font-medium"
              }`}
            >
              {preview}
            </p>
            {isUnread && (
              <span className="text-[10px] font-black text-white bg-[#FF6A3D] px-1.5 py-px rounded-[9px] min-w-[18px] text-center flex-shrink-0">
                {displayUnread > 9 ? "9+" : displayUnread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
