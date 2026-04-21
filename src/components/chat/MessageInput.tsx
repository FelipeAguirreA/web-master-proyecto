"use client";

import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";

type MessageInputProps = {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Escribí un mensaje...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const canSend = content.trim().length > 0 && !disabled;

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    setContent("");
    onSend(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-3 px-4 md:px-6 py-4 border-t border-[#E8E5DD] bg-white/80 backdrop-blur-md">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled ? "Esperá a que la empresa te contacte primero" : placeholder
        }
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-2xl border border-[#E8E5DD] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0909] placeholder:text-[#9B9891] focus:outline-none focus:border-[#FF6A3D] focus:ring-2 focus:ring-[#FF6A3D]/20 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
        style={{ minHeight: "44px" }}
        onInput={(e) => {
          const target = e.currentTarget;
          target.style.height = "auto";
          target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
        }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${
          canSend
            ? "bg-gradient-to-br from-[#FF6A3D] to-[#C2410C] text-white shadow-md shadow-[#FF6A3D]/20 hover:shadow-lg hover:shadow-[#FF6A3D]/30 hover:-translate-y-0.5"
            : "bg-[#F0EDE4] text-[#9B9891] cursor-not-allowed"
        }`}
        aria-label="Enviar mensaje"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
