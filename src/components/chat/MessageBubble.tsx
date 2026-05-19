"use client";

import InboxAvatar from "./InboxAvatar";

type Props = {
  content: string;
  isMine: boolean;
  senderName: string;
  senderImage: string | null;
  senderIsCompany: boolean;
  createdAt: string;
  showAvatar: boolean;
  showDateSep: boolean;
};

function formatHora(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateSep(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Hoy";
  if (sameDay(d, yest)) return "Ayer";
  return d.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export default function MessageBubble({
  content,
  isMine,
  senderName,
  senderImage,
  senderIsCompany,
  createdAt,
  showAvatar,
  showDateSep,
}: Props) {
  return (
    <>
      {showDateSep && (
        <div className="text-center my-1.5">
          <span className="text-[10.5px] font-bold text-[#9B9891] bg-white px-2.5 py-1 rounded-full border border-[#E8E5DD]">
            {formatDateSep(createdAt)}
          </span>
        </div>
      )}
      <div
        className={`flex gap-2 items-end ${
          isMine ? "justify-end" : "justify-start"
        }`}
      >
        {!isMine && (
          <div className="w-7 h-7 flex-shrink-0">
            {showAvatar ? (
              <InboxAvatar
                name={senderName}
                image={senderImage}
                isCompany={senderIsCompany}
                size={28}
              />
            ) : null}
          </div>
        )}
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div
            className={`px-3 py-2 sm:px-3.5 sm:py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
              isMine
                ? "text-white rounded-tl-[14px] rounded-tr-[14px] rounded-br-[4px] rounded-bl-[14px] shadow-[0_4px_12px_rgba(255,106,61,0.18)] bg-gradient-to-br from-[#FF6A3D] to-[#FF8A5D]"
                : "bg-white text-[#0A0909] border border-[#E8E5DD] rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            }`}
          >
            {content}
          </div>
          <div
            className={`text-[10.5px] text-[#9B9891] mt-1 font-semibold tabular-nums ${
              isMine ? "text-right pr-1" : "text-left pl-1"
            }`}
          >
            {formatHora(createdAt)}
          </div>
        </div>
      </div>
    </>
  );
}
