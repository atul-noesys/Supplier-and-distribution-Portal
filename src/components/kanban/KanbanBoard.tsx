"use client";

import {
    DndContext,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useMemo, useState } from "react";
import KanbanColumn from "./KanbanColumn";

export interface KanbanItem {
    po_number: string;
    item_code: string;
    item: string;
    unit_price: number;
    quantity: number;
    status: string;
    InfoveaveBatchId: number;
    po_status: string;
    ROWID: number;
    [key: string]: any;
}

interface KanbanBoardProps {
    initialData: KanbanItem[];
    searchTerm?: string;
    onEditClick?: (item: KanbanItem) => void;
    onDragDropSave?: (item: KanbanItem, newStep: string) => Promise<void>;
    disabled?: boolean;
}

const STEPS = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];

export default function KanbanBoard({ initialData, searchTerm = "", onEditClick, onDragDropSave, disabled = false }: KanbanBoardProps) {
    const [items, setItems] = useState<KanbanItem[]>(initialData);
    const [activeId, setActiveId] = useState<number | null>(null);

    // Sync items with initialData when it changes (e.g., on search/filter)
    useEffect(() => {
        setItems(initialData);
    }, [initialData]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: disabled ? Infinity : 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Group items by status
    const groupedItems = useMemo(() => {
        const groups: Record<string, KanbanItem[]> = {};
        STEPS.forEach((step) => {
            groups[step] = [];
        });

        items.forEach((item) => {
            const status = STEPS.includes(item.status) ? item.status : "Step 1";
            if (!groups[status]) {
                groups[status] = [];
            }
            groups[status].push(item);
        });

        return groups;
    }, [items]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        // Get the item being dragged
        const activeItem = items.find((item) => item.ROWID === active.id);
        if (!activeItem) return;

        // Extract the step from over.id (format: "step-X" or just a ROWID for reordering)
        let newStep = activeItem.status;

        if (typeof over.id === "string" && over.id.includes("step-")) {
            const overStepMatch = over.id.toString().match(/^step-(\d)/);
            newStep = overStepMatch ? `Step ${overStepMatch[1]}` : activeItem.status;
        } else if (typeof over.id === "number") {
            // Dropped on another card - find which step it belongs to
            const overItem = items.find((item) => item.ROWID === over.id);
            newStep = overItem?.status || activeItem.status;
        }

        // Only update if step actually changed
        if (newStep !== activeItem.status) {
            const updatedItems = items.map((item) =>
                item.ROWID === activeItem.ROWID ? { ...item, status: newStep } : item
            );
            setItems(updatedItems);

            // Call the drag-drop save handler if provided
            if (onDragDropSave) {
                onDragDropSave({ ...activeItem, status: newStep }, newStep).catch((error) => {
                    console.error("Error saving drag-drop change:", error);
                    // Revert the change if save fails
                    setItems(items);
                });
            }
        }
    };

    const activeItem = items.find((item) => item.ROWID === activeId);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items.map((item) => item.ROWID)} strategy={verticalListSortingStrategy}>
                <div className="w-full h-full flex flex-col overflow-hidden">
                    <div className="flex gap-3 sm:gap-4 flex-1 overflow-hidden">
                        {STEPS.map((step) => (
                            <KanbanColumn
                                key={step}
                                step={step}
                                items={groupedItems[step]}
                                searchTerm={searchTerm}
                                onEditClick={onEditClick}
                            />
                        ))}
                    </div>
                </div>
            </SortableContext>

            <DragOverlay>
                {activeItem ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-2xl ring-2 ring-blue-500 scale-100 w-64">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {activeItem.po_number}
                                </p>
                                <p className="text-xs font-bold text-gray-900 dark:text-white mt-1 line-clamp-2">
                                    {activeItem.item}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded inline-block">
                            {activeItem.item_code}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-xs">Price</p>
                                <p className="font-bold text-gray-900 dark:text-white text-xs">${activeItem.unit_price}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-xs">Qty</p>
                                <p className="font-bold text-gray-900 dark:text-white text-xs">{activeItem.quantity}</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded px-2 py-1.5">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                                ${(activeItem.unit_price * activeItem.quantity).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
