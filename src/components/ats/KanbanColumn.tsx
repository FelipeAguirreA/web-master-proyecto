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
      className="flex flex-col min-h-[400px] bg-gray-50 rounded-2xl border border-gray-100 p-3"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
          {label}
        </span>
        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
          {candidates.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {candidates.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-300">Arrastrá candidatos aquí</p>
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
