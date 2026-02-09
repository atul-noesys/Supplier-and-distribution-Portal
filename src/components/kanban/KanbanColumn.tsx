"use client";

import { useDroppable } from "@dnd-kit/core";
import KanbanCard from "./KanbanCard";
import { KanbanItem } from "./KanbanBoard";

interface KanbanColumnProps {
  step: string;
  items: KanbanItem[];
}

const stepColors: Record<string, { bg: string; border: string; text: string }> =
  {
    "Step 1": {
      bg: "bg-blue-50 dark:bg-blue-950",
      border: "border-blue-200 dark:border-blue-700",
      text: "text-blue-700 dark:text-blue-300",
    },
    "Step 2": {
      bg: "bg-purple-50 dark:bg-purple-950",
      border: "border-purple-200 dark:border-purple-700",
      text: "text-purple-700 dark:text-purple-300",
    },
    "Step 3": {
      bg: "bg-pink-50 dark:bg-pink-950",
      border: "border-pink-200 dark:border-pink-700",
      text: "text-pink-700 dark:text-pink-300",
    },
    "Step 4": {
      bg: "bg-amber-50 dark:bg-amber-950",
      border: "border-amber-200 dark:border-amber-700",
      text: "text-amber-700 dark:text-amber-300",
    },
    "Step 5": {
      bg: "bg-green-50 dark:bg-green-950",
      border: "border-green-200 dark:border-green-700",
      text: "text-green-700 dark:text-green-300",
    },
  };

export default function KanbanColumn({ step, items }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `${step.toLowerCase().replace(" ", "-")}`,
  });

  const colors = stepColors[step] || stepColors["Step 1"];

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-52 ${colors.bg} rounded-lg border-2 ${colors.border} p-3 min-h-96 flex flex-col`}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-bold ${colors.text}`}>{step}</h2>
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-gray-400 rounded-full dark:bg-gray-600">
            {items.length}
          </span>
        </div>
        <div className={`w-12 h-1 ${colors.text} rounded-full opacity-50 mt-2`}></div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            <p>Drop items here</p>
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard key={item.ROWID} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
