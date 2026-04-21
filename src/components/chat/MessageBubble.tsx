"use client";

type MessageBubbleProps = {
  content: string;
  isMine: boolean;
  senderName: string;
  senderImage: string | null;
  createdAt: string;
};

export default function MessageBubble({
  content,
  isMine,
  senderName,
  createdAt,
}: MessageBubbleProps) {
  const hora = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 shadow-sm ${
          isMine
            ? "bg-gradient-to-br from-[#FFF0E4] to-[#FFE1CB] text-[#4A2410] border border-[#FFD4B5] rounded-[18px] rounded-br-[6px]"
            : "bg-white border border-[#E8E5DD] text-[#0A0909] rounded-[18px] rounded-bl-[6px]"
        }`}
      >
        {!isMine && (
          <p className="text-[10px] font-bold text-[#C2410C] mb-1 uppercase tracking-wide">
            {senderName}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {content}
        </p>
        <p
          className={`text-[10px] mt-1 text-right tabular-nums ${
            isMine ? "text-[#9A5B35]" : "text-[#9B9891]"
          }`}
        >
          {hora}
        </p>
      </div>
    </div>
  );
}
