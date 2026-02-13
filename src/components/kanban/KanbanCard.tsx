"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanItem } from "./KanbanBoard";

interface KanbanCardProps {
  item: KanbanItem;
}

export default function KanbanCard({ item }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.ROWID });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalPrice = item.unit_price * item.quantity;

  if (isDragging) {
    return <div ref={setNodeRef} style={style} />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-move hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {item.po_number}
            </p>
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-2">
            {item.item}
          </p>
        </div>
      </div>

      {/* Item Code */}
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
        {item.item_code}
      </p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Unit Price</p>
          <p className="font-bold text-gray-900 dark:text-white">${item.unit_price}</p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Quantity</p>
          <p className="font-bold text-gray-900 dark:text-white">{item.quantity}</p>
        </div>
      </div>

      {/* Total Price */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded px-2 py-2 mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          ${totalPrice.toLocaleString()}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1 flex-wrap">
        {item.vendor_name && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {item.vendor_name}
          </span>
        )}
        {item.step_name && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
            {item.step_name}
          </span>
        )}
      </div>
    </div>
  );
}
