"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Edit2,
  Send,
  Trash2,
  X,
  Link as LinkIcon,
} from "lucide-react";

type InterviewListItemProps = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMins: number;
  meetingLink: string | null;
  notes: string | null;
  sentToChat: boolean;
  sentToChatAt: string | null;
  studentName: string;
  internshipTitle: string;
  onSendToChat: (id: string) => Promise<void>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
};

export default function InterviewListItem({
  id,
  title,
  scheduledAt,
  durationMins,
  meetingLink,
  sentToChat,
  sentToChatAt,
  studentName,
  internshipTitle,
  onSendToChat,
  onEdit,
  onDelete,
}: InterviewListItemProps) {
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const hora = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(scheduledAt));

  const sentDate = sentToChatAt
    ? new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(sentToChatAt))
    : null;

  const handleSend = async () => {
    setSending(true);
    try {
      await onSendToChat(id);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCopyLink = async () => {
    if (!meetingLink) return;
    await navigator.clipboard.writeText(meetingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-black/[0.06] rounded-[20px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_-4px_rgba(20,15,10,0.08)] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Indicador hora */}
          <div className="flex-shrink-0 text-center min-w-[52px] pt-0.5">
            <p className="text-[17px] font-bold text-[#0A0909] tracking-[-0.02em] leading-none">
              {hora}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9B9891] mt-1">
              {durationMins}min
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#0A0909] tracking-[-0.01em] truncate">
              {title}
            </p>
            <p className="text-[12px] text-[#6D6A63] mt-0.5 truncate">
              {studentName}
              <span className="text-[#C9C6BF] mx-1.5">·</span>
              {internshipTitle}
            </p>

            {/* Link */}
            {meetingLink ? (
              <div className="flex items-center gap-2 mt-2.5">
                <LinkIcon
                  className="w-3 h-3 text-[#9B9891] flex-shrink-0"
                  strokeWidth={2.2}
                />
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11.5px] text-[#FF6A3D] hover:text-[#FF5A28] hover:underline truncate max-w-[220px] font-medium"
                >
                  {meetingLink}
                </a>
                <button
                  onClick={handleCopyLink}
                  className="text-[10.5px] text-[#9B9891] hover:text-[#0A0909] inline-flex items-center gap-0.5 font-medium transition-colors"
                >
                  <Copy className="w-3 h-3" strokeWidth={2.2} />
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            ) : (
              <p className="text-[11.5px] text-[#9B9891] mt-2 italic">
                Link por confirmar
              </p>
            )}

            {/* Estado envío */}
            <div className="mt-2.5">
              {sentToChat ? (
                <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold bg-[#ECFDF3] text-[#047857] border border-[#A7F3D0] px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" strokeWidth={2.4} />
                  Enviada {sentDate}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold bg-[#FFF7EC] text-[#B45309] border border-[#FCD9A8] px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" strokeWidth={2.4} />
                  Sin enviar al candidato
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white bg-gradient-to-r from-[#FF6A3D] to-[#FF9B6A] px-3 py-1.5 rounded-xl hover:shadow-[0_4px_12px_-2px_rgba(255,106,61,0.5)] shadow-[0_2px_6px_-1px_rgba(255,106,61,0.35)] transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Send className="w-3 h-3" strokeWidth={2.4} />
            {sending
              ? "Enviando..."
              : sentToChat
                ? "Reenviar"
                : "Enviar al chat"}
          </button>
          <button
            onClick={() => onEdit(id)}
            className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#6D6A63] hover:text-[#0A0909] hover:bg-black/[0.04] transition-all"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#9B9891] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-all disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Modal eliminación */}
      {showDeleteModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ fontFamily: "var(--font-onest), system-ui, sans-serif" }}
          >
            <div
              className="absolute inset-0 bg-[#0A0909]/50 backdrop-blur-md"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative bg-white rounded-[24px] shadow-[0_32px_64px_-16px_rgba(20,15,10,0.3)] border border-black/[0.06] w-full max-w-sm p-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#9B9891] hover:text-[#0A0909] hover:bg-black/[0.04] transition-all"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>

              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-[#B91C1C]" strokeWidth={2.2} />
              </div>

              <h2 className="text-[17px] font-bold tracking-[-0.02em] text-[#0A0909] text-center">
                Eliminar entrevista
              </h2>
              <p className="text-[13px] text-[#6D6A63] text-center mt-1.5">
                <span className="font-semibold text-[#0A0909]">{title}</span>
              </p>
              {sentToChat && (
                <p className="text-[11.5px] text-[#B45309] bg-[#FFF7EC] border border-[#FCD9A8] rounded-xl px-3 py-2 text-center mt-4 leading-relaxed">
                  Esta cita ya fue enviada al candidato. Se le notificará que
                  fue cancelada.
                </p>
              )}
              <p className="text-[11.5px] text-[#9B9891] text-center mt-3">
                Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 border border-black/[0.08] text-[#4A4843] font-semibold py-2.5 rounded-xl hover:bg-black/[0.03] hover:text-[#0A0909] transition-all text-[13px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-[#B91C1C] text-white font-semibold py-2.5 rounded-xl hover:bg-[#991B1B] transition-colors text-[13px] disabled:opacity-60"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
