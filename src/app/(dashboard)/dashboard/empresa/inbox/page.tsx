"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";

export default function EmpresaInboxPage() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="px-0 md:px-6 py-0 md:py-6 h-[calc(100dvh-80px)] md:h-[calc(100vh-96px)]">
      <div className="max-w-screen-2xl mx-auto h-full flex bg-white/75 backdrop-blur-xl border border-black/[0.06] rounded-none md:rounded-[24px] shadow-[0_8px_32px_-16px_rgba(20,15,10,0.1)] overflow-hidden">
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-[#E8E5DD] flex-shrink-0 ${
            activeId ? "hidden md:flex md:flex-col" : "flex flex-col"
          }`}
        >
          <ConversationList
            activeConversationId={activeId}
            onSelect={setActiveId}
          />
        </div>

        <div
          className={`flex-1 min-w-0 ${
            activeId ? "flex flex-col" : "hidden md:flex md:flex-col"
          }`}
        >
          {activeId ? (
            <ChatWindow
              conversationId={activeId}
              showBackButton={true}
              onBack={() => setActiveId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center relative bg-[#FAFAF8]">
              <div
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{
                  background:
                    "radial-gradient(500px circle at 50% 30%, rgba(255,106,61,0.08), transparent 60%)",
                }}
              />
              <div className="relative text-center max-w-sm px-6">
                <div className="inline-flex w-16 h-16 rounded-2xl bg-white border border-[#E8E5DD] items-center justify-center mb-5 shadow-sm">
                  <MessageSquare
                    className="w-7 h-7 text-[#FF6A3D]"
                    strokeWidth={1.8}
                  />
                </div>
                <p className="text-[15px] font-bold text-[#0A0909] tracking-tight mb-1.5">
                  Seleccioná una conversación
                </p>
                <p className="text-[13px] text-[#6D6A63] leading-relaxed">
                  Elegí un candidato de la lista para ver el hilo y responder.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
