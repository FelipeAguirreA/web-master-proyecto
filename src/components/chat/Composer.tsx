"use client";

import { KeyboardEvent, useState } from "react";
import { Send } from "lucide-react";

const TEMPLATES: { label: string; body: string }[] = [
  {
    label: "Saludo",
    body: "Hola, gracias por postular a la práctica.",
  },
  {
    label: "Agendar",
    body: "¿Tienes disponibilidad esta semana para una primera entrevista? Te dejo dos opciones: mañana 11:00 o jueves 16:00.",
  },
  {
    label: "Pedir info",
    body: "¿Puedes contarme un poco más sobre tu experiencia previa y por qué te interesa este rol?",
  },
];

type Props = {
  onSend: (content: string) => void;
  disabled?: boolean;
  disabledHint?: string;
  showTemplates?: boolean;
  placeholderName?: string;
};

export default function Composer({
  onSend,
  disabled = false,
  disabledHint,
  showTemplates = true,
  placeholderName,
}: Props) {
  const [draft, setDraft] = useState("");
  const canSend = draft.trim().length > 0 && !disabled;

  const send = () => {
    if (!canSend) return;
    const v = draft.trim();
    setDraft("");
    onSend(v);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (disabled && disabledHint) {
    return (
      <footer className="bg-white border-t border-[#E8E5DD] px-[18px] py-3.5">
        <div className="text-[12px] text-[#9B9891] text-center leading-relaxed">
          {disabledHint}
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white border-t border-[#E8E5DD] px-[18px] py-3">
      {showTemplates && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => setDraft(tpl.body)}
              className="px-2.5 py-[5px] bg-[rgba(15,23,42,0.04)] hover:bg-[#FFF0E4] hover:text-[#FF6A3D] rounded-md text-[11px] text-[#4A4843] font-semibold transition-colors"
            >
              ↳ {tpl.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 bg-[rgba(15,23,42,0.035)] border border-[#E8E5DD] rounded-xl pl-3 pr-2 py-2 focus-within:border-[#FFD4B5] focus-within:bg-white transition-colors">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={
            placeholderName
              ? `Escribe a ${placeholderName.split(" ")[0]}…`
              : "Escribe un mensaje…"
          }
          rows={1}
          className="flex-1 bg-transparent border-none resize-none text-[13px] text-[#0A0909] placeholder:text-[#9B9891] outline-none py-[7px] max-h-[120px] leading-relaxed font-[inherit]"
          style={{ fontFamily: "inherit" }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className={`inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[12.5px] font-extrabold transition-all ${
            canSend
              ? "bg-gradient-to-br from-[#FF6A3D] to-[#FF8A5D] text-white shadow-[0_4px_12px_rgba(255,106,61,0.25)] hover:-translate-y-0.5"
              : "bg-[rgba(15,23,42,0.08)] text-[#9B9891] cursor-not-allowed"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
      </div>
      <div className="text-[10.5px] text-[#9B9891] mt-1.5 pl-1">
        Enter para enviar · Shift+Enter para salto de línea
      </div>
    </footer>
  );
}
