"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Edit2,
  Send,
  Trash2,
  X,
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
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Indicador hora */}
          <div className="flex-shrink-0 text-center min-w-[48px]">
            <p className="text-base font-extrabold text-gray-900">{hora}</p>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {studentName} · {internshipTitle} · {durationMins} min
            </p>

            {/* Link */}
            {meetingLink ? (
              <div className="flex items-center gap-2 mt-2">
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline truncate max-w-[200px]"
                >
                  {meetingLink}
                </a>
                <button
                  onClick={handleCopyLink}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1 italic">
                Link por confirmar
              </p>
            )}

            {/* Estado envío */}
            <div className="mt-2">
              {sentToChat ? (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    Cita enviada el {sentDate}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-amber-600 font-medium">
                    Cita no enviada al candidato
                  </span>
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
            className="flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-3 h-3" />
            {sending
              ? "Enviando..."
              : sentToChat
                ? "Reenviar"
                : "Enviar al chat"}
          </button>
          <button
            onClick={() => onEdit(id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>

            <h2 className="text-base font-extrabold text-gray-900 text-center mb-1">
              Eliminar entrevista
            </h2>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-semibold text-gray-700">{title}</span>
            </p>
            {sentToChat && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center mt-3 mb-1">
                ⚠️ Esta cita ya fue enviada al candidato. Se le notificará
                automáticamente que fue cancelada.
              </p>
            )}
            <p className="text-xs text-gray-400 text-center mt-3 mb-5">
              Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-60"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
