"use client";

import { useState } from "react";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";

export default function EmpresaInboxPage() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="h-[calc(100vh-80px)] flex bg-[#f9f9ff]">
      {/* Columna izquierda: lista de conversaciones */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-gray-100 bg-white flex-shrink-0 ${
          activeId ? "hidden md:flex md:flex-col" : "flex flex-col"
        }`}
      >
        <ConversationList
          activeConversationId={activeId}
          onSelect={setActiveId}
        />
      </div>

      {/* Columna derecha: chat activo */}
      <div
        className={`flex-1 ${
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm text-gray-400 font-medium">
                Seleccioná una conversación para empezar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
