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
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? "bg-brand-600 text-white rounded-br-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
        }`}
      >
        {!isMine && (
          <p className="text-xs font-semibold text-brand-600 mb-1">
            {senderName}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <p
          className={`text-[11px] mt-1 text-right ${
            isMine ? "text-brand-200" : "text-gray-400"
          }`}
        >
          {hora}
        </p>
      </div>
    </div>
  );
}
