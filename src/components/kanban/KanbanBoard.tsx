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
import KanbanCard from "./KanbanCard";

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
    maxStepCount?: number;
}

export default function KanbanBoard({ initialData, searchTerm = "", onEditClick, onDragDropSave, disabled = false, maxStepCount = 0 }: KanbanBoardProps) {
    const [items, setItems] = useState<KanbanItem[]>(initialData);
    const [activeId, setActiveId] = useState<number | null>(null);

    // Generate STEPS dynamically based on max stepCount from initialData or prop
    const STEPS = useMemo(() => {
        // Use maxStepCount prop if provided, otherwise find from initialData
        let maxSteps = maxStepCount;
        if (maxSteps === 0) {
            maxSteps = initialData.reduce((max, item) => {
                return Math.max(max, item.stepCount || 0);
            }, 0);
        }

        // Generate steps array dynamically, ensuring at least 1 step and capping at 10
        const stepsCount = Math.max(1, Math.min(maxSteps, 10));
        const generatedSteps = Array.from({ length: stepsCount }, (_, i) => `Step ${i + 1}`);

        return generatedSteps;
    }, [initialData, maxStepCount]);

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

        // Prevent moving items that have completed all their steps
        if (activeItem.stepCount && activeItem.status) {
            const stepMatch = activeItem.status.match(/\d+/);
            const currentStep = stepMatch ? parseInt(stepMatch[0], 10) : 0;
            if (currentStep === activeItem.stepCount) {
                return;
            }
        }

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

        // Validate that the new step doesn't exceed the item's total steps
        if (activeItem.stepCount && newStep) {
            const newStepMatch = newStep.match(/\d+/);
            const newStepNumber = newStepMatch ? parseInt(newStepMatch[0], 10) : 0;
            if (newStepNumber > activeItem.stepCount) {
                return;
            }
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

            <DragOverlay>{activeItem ? <KanbanCard item={activeItem} searchTerm={searchTerm} onEditClick={onEditClick} /> : null}</DragOverlay>
        </DndContext>
    );
}
