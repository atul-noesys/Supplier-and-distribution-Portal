"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MdEdit, MdCheckCircle } from "react-icons/md";
import { KanbanItem } from "./KanbanBoard";
import { useStore } from "@/store/store-context";
import { useMemo } from "react";

interface KanbanCardProps {
  item: KanbanItem;
  searchTerm?: string;
  onEditClick?: (item: KanbanItem) => void;
}

export default function KanbanCard({ item, searchTerm = "", onEditClick }: KanbanCardProps) {
  const { nguageStore } = useStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.ROWID });

  const user = useMemo(() => nguageStore.GetCurrentUserDetails(), [nguageStore]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if card is completed
  const isCardCompleted = (() => {
    if (!item.stepCount || !item.status) return false;
    const stepMatch = item.status.match(/\d+/);
    const currentStep = stepMatch ? parseInt(stepMatch[0], 10) : 0;
    return currentStep === item.stepCount;
  })();

  // Function to highlight search term in text
  const highlightText = (text: string | null | undefined, highlight: string) => {
    if (!text) return text;
    if (!highlight.trim()) return text;

    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-300 dark:bg-yellow-400 dark:text-gray-900 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg border p-3 cursor-move hover:shadow-md transition-all bg-white dark:bg-gray-800 ${isCardCompleted
          ? "border-green-400 dark:border-green-700"
          : "border-gray-200 dark:border-gray-700"
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {searchTerm ? highlightText(item.po_number, searchTerm) : item.po_number}
            </p>
            {user?.roleId !== 5 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick?.(item);
                }}
                className="ml-2 p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors shrink-0"
                title="Edit"
              >
                <MdEdit className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-2">
            {searchTerm ? highlightText(item.item, searchTerm) : item.item}
          </p>
        </div>
      </div>

      {/* Item Code */}
      <div className="flex justify-between">
        <p className="text-xs text-gray-50 dark:text-gray-400 mb-2 font-mono bg-blue-700 dark:bg-gray-700 px-2 py-0.75 rounded inline-block">
          {searchTerm ? highlightText(item.item_code, searchTerm) : item.item_code}
        </p>
        <span 
          className="flex items-center mb-2 px-1.5 rounded-lg text-xs font-bold tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 25%, #ffc700 50%, #ffb700 75%, #ffa500 100%)',
            color: '#5a3a14',
            textShadow: '0 1px 2px rgba(255,255,255,0.6)',
            // boxShadow: `
            //   inset 0 1px 0 rgba(255,255,255,0.8),
            //   inset 0 -2px 0 rgba(0,0,0,0.1),
            //   0 4px 12px rgba(255,168,0,0.3),
            //   0 2px 4px rgba(0,0,0,0.15)
            // `,
            border: '1px solid rgba(255,200,0,0.6)'
          }}
        >
          PV{item.version}
        </span>
      </div>

      {/* Details Grid */}
      {/* <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Unit Price</p>
          <p className="font-bold text-gray-900 dark:text-white">${item.unit_price}</p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Quantity</p>
          <p className="font-bold text-gray-900 dark:text-white">{item.quantity}</p>
        </div>
      </div> */}

      {/* Total Price */}
      {/* <div className="bg-linear-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded px-2 py-2 mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          ${totalPrice.toLocaleString()}
        </p>
      </div> */}

      <div className="bg-linear-to-r from-gray-100 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded px-2 py-1 mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-700 dark:text-gray-400">Quantity</p>
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {item.quantity}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {item.vendor_name && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            {searchTerm ? highlightText(item.vendor_name, searchTerm) : item.vendor_name}
          </span>
        )}
        {item.step_name && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
            {searchTerm ? highlightText(item.step_name, searchTerm) : item.step_name}
          </span>
        )}
      </div>

      {/* Step Progress Badge */}
      {item.stepCount && item.status && (() => {
        const stepMatch = item.status.match(/\d+/);
        const currentStep = stepMatch ? parseInt(stepMatch[0], 10) : 0;
        const progress = Math.round((currentStep / item.stepCount) * 100);

        return (
          <div className="mt-2 pt-1 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {item.status} of {item.stepCount}
                </span>
                {isCardCompleted ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                    <MdCheckCircle className="w-3.5 h-3.5" />
                    Completed
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{progress}%</span>
                )}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isCardCompleted
                      ? "bg-green-500 dark:bg-green-400"
                      : "bg-blue-500 dark:bg-blue-400"
                    }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
