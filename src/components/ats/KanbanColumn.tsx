"use client";

import CandidateCard, { type CandidateData } from "./CandidateCard";

interface KanbanColumnProps {
  status: string;
  label: string;
  color: string;
  candidates: CandidateData[];
  showScore?: boolean;
  onDrop: (candidateId: string, newStatus: string) => void;
  onOpenDetail: (candidate: CandidateData) => void;
}

export default function KanbanColumn({
  status,
  label,
  color,
  candidates,
  showScore,
  onDrop,
  onOpenDetail,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData("candidateId");
    if (candidateId) onDrop(candidateId, status);
  };

  return (
    <div
      className="flex flex-col min-h-[400px] bg-white/60 backdrop-blur-sm rounded-[20px] border border-black/[0.06] p-3"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[10.5px] font-semibold text-[#4A4843] uppercase tracking-[0.08em]">
          {label}
        </span>
        <span className="ml-auto text-[10.5px] font-bold text-[#6D6A63] bg-black/[0.05] rounded-full px-2 py-0.5">
          {candidates.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {candidates.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-[11.5px] text-[#C9C6BF] font-medium">
              Arrastrá candidatos acá
            </p>
          </div>
        ) : (
          candidates.map((c) => (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("candidateId", c.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <CandidateCard
                candidate={c}
                showScore={showScore}
                onOpenDetail={() => onOpenDetail(c)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
