"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ConversationItem, {
  type ConversationListItem,
} from "./ConversationItem";

type TabKey = "todos" | "no-leido" | "pendientes" | "pin";

const TABS: { key: TabKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "no-leido", label: "No leídos" },
  { key: "pendientes", label: "Pendientes" },
  { key: "pin", label: "Pinneados" },
];

type Props = {
  conversations: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  emptyHint: string;
  userId: string;
};

export default function ConversationListPanel({
  conversations,
  activeId,
  onSelect,
  loading,
  emptyHint,
  userId,
}: Props) {
  const [tab, setTab] = useState<TabKey>("todos");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return conversations
      .filter((c) => {
        const isUnread = c.markedUnread || c.unreadCount > 0;
        if (tab === "no-leido" && !isUnread) return false;
        if (tab === "pin" && !c.isPinned) return false;
        if (tab === "pendientes") {
          // "Pendientes" = el último mensaje lo escribió el otro (no yo)
          if (!c.lastMessage) return false;
          if (c.lastMessage.senderId === userId) return false;
        }
        if (query) {
          const hay =
            c.otherName.toLowerCase().includes(query) ||
            c.internshipTitle.toLowerCase().includes(query);
          if (!hay) return false;
        }
        return true;
      })
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [conversations, tab, q, userId]);

  const totals = useMemo(
    () => ({
      todos: conversations.length,
      "no-leido": conversations.filter(
        (c) => c.markedUnread || c.unreadCount > 0,
      ).length,
      pendientes: conversations.filter(
        (c) => c.lastMessage && c.lastMessage.senderId !== userId,
      ).length,
      pin: conversations.filter((c) => c.isPinned).length,
    }),
    [conversations, userId],
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-[18px] pt-4 pb-2.5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[17px] font-extrabold text-[#0A0909] tracking-tight">
            Mensajes
          </h2>
          {totals["no-leido"] > 0 && (
            <span className="text-[10px] font-bold text-white bg-gradient-to-br from-[#FF6A3D] to-[#C2410C] px-2 py-0.5 rounded-full uppercase tracking-wide">
              {totals["no-leido"]} sin leer
            </span>
          )}
        </div>

        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 absolute left-[11px] top-1/2 -translate-y-1/2 text-[#9B9891]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar conversaciones…"
            className="w-full bg-[rgba(15,23,42,0.045)] border border-transparent rounded-[9px] py-2 pl-8 pr-3 text-[12.5px] text-[#0A0909] placeholder:text-[#9B9891] outline-none focus:bg-white focus:border-[#D4D0C7] transition-colors"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto -mx-0.5 px-0.5">
          {TABS.map((tb) => {
            const isOn = tab === tb.key;
            const count = totals[tb.key];
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`px-2.5 py-[5px] rounded-[7px] text-[11.5px] font-bold whitespace-nowrap inline-flex items-center gap-1 transition-colors ${
                  isOn
                    ? "bg-[#FFF0E4] text-[#FF6A3D] border border-[#FFD4B5]"
                    : "bg-transparent text-[#4A4843] border border-transparent hover:bg-[rgba(15,23,42,0.04)]"
                }`}
              >
                {tb.label}
                {count > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 rounded-[5px] min-w-[14px] text-center ${
                      isOn
                        ? "bg-white text-[#FF6A3D]"
                        : "bg-[rgba(15,23,42,0.06)] text-[#9B9891]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto border-t border-[#E8E5DD]">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-[3px] border-[#FF6A3D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center px-5 py-10 text-[12.5px] text-[#9B9891] leading-relaxed">
            {conversations.length === 0 ? emptyHint : "Sin conversaciones"}
          </div>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              isActive={c.id === activeId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
