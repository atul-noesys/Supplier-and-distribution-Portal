"use client";

import { useDroppable } from "@dnd-kit/core";
import KanbanCard from "@/components/kanban/KanbanCard";
import { KanbanItem } from "@/components/kanban/KanbanBoard";
import { stepColors } from "@/helper/step-color";

interface KanbanColumnProps {
  step: string;
  items: KanbanItem[];
  searchTerm?: string;
  onEditClick?: (item: KanbanItem) => void;
}

export default function KanbanColumn({ step, items = [], searchTerm = "", onEditClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `${step.toLowerCase().replace(" ", "-")}`,
  });

  const colors = stepColors[step] || stepColors["Step 1"];

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-52 ${colors.bg} rounded-lg border-2 ${colors.border} p-2 pr-0 min-h-136 flex flex-col`}
    >
      <div className="mb-0 pr-2">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-bold ${colors.text}`}>{step}</h2>
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gray-400 rounded-full dark:bg-gray-600">
            {items.length}
          </span>
        </div>
        <div className={`w-12 h-1 ${colors.text} rounded-full opacity-50 mt-2`}></div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-128 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800" style={{
        scrollbarWidth: 'thin',
      }}>
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            <p>Drop items here</p>
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard key={item.ROWID} item={item} searchTerm={searchTerm} onEditClick={onEditClick} />
          ))
        )}
      </div>
    </div>
  );
}
