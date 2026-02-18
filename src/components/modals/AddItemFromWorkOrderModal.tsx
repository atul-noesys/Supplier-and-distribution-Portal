"use client";

import { RowData, ShipmentItem } from "@/types/nguage-rowdata";
import React, { useState } from "react";
import { MdClose } from "react-icons/md";

interface AddItemFromWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: ShipmentItem) => void;
  availableWorkOrders: (RowData & {
    quantity?: string | number;
    unit_price?: string | number;
    total?: number;
    workOrderId?: string;
  })[];
  selectedWorkOrderIds: string[];
  shipmentId: string;
}

export function AddItemFromWorkOrderModal({
  isOpen,
  onClose,
  onAddItem,
  availableWorkOrders,
  selectedWorkOrderIds,
  shipmentId,
}: AddItemFromWorkOrderModalProps) {
  const [selectedWorkOrders, setSelectedWorkOrders] = useState<Set<string>>(new Set());

  const handleToggleWorkOrder = (workOrderId: string) => {
    const newSelections = new Set(selectedWorkOrders);
    if (newSelections.has(workOrderId)) {
      newSelections.delete(workOrderId);
    } else {
      newSelections.add(workOrderId);
    }
    setSelectedWorkOrders(newSelections);
  };

  const handleAddItems = () => {
    if (selectedWorkOrders.size === 0) return;

    // Get available work orders that are selected
    const workOrdersToAdd = availableWorkOrders.filter((wo) =>
      selectedWorkOrders.has(wo.workOrderId || "")
    );

    // Add each selected work order as an item
    workOrdersToAdd.forEach((workOrder) => {
      const newItem: ShipmentItem = {
        item_code: workOrder.item_code || "",
        item: workOrder.item || "",
        unit_price: workOrder.unit_price || 0,
        shipment_quantity: workOrder.quantity || 0,
        total: Number(workOrder.unit_price || 0) * Number(workOrder.quantity || 0),
        po_number: workOrder.po_number || "",
        shipment_status: "Pending",
        work_order_id: workOrder.workOrderId || "",
        document: "",
        shipment_id: shipmentId,
      };

      onAddItem(newItem);
    });

    setSelectedWorkOrders(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-7/10 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Select Work Order to Add Item
          </h2>
          <button
            onClick={onClose}
            className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="space-y-4">
            {availableWorkOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-400">
                  No work orders available
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-950">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedWorkOrders.size === availableWorkOrders.length && availableWorkOrders.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWorkOrders(
                                  new Set(availableWorkOrders.filter(wo => !selectedWorkOrderIds.includes(wo.workOrderId || "")).map((wo) => wo.workOrderId || ""))
                                );
                              } else {
                                setSelectedWorkOrders(new Set());
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          WO ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          Item Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          Item Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          PO #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                          Vendor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {availableWorkOrders.map((workOrder) => {
                        const woId = workOrder.workOrderId || "";
                        const isAlreadySelected =
                          selectedWorkOrderIds.includes(woId);
                        const isCurrentlySelected =
                          selectedWorkOrders.has(woId);

                        return (
                          <tr
                            key={woId}
                            className={`transition-colors ${
                              isAlreadySelected
                                ? "bg-red-50 dark:bg-red-900/20 opacity-60"
                                : isCurrentlySelected
                                  ? "bg-blue-50 dark:bg-blue-900/30"
                                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isCurrentlySelected}
                                onChange={() => handleToggleWorkOrder(woId)}
                                disabled={isAlreadySelected}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                title={
                                  isAlreadySelected
                                    ? "This work order is already included in the shipment"
                                    : "Select this work order"
                                }
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {woId}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {workOrder.item_code || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                              {workOrder.item || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {workOrder.po_number || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {workOrder.quantity || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              ${Number(workOrder.unit_price || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              ${(
                                Number(workOrder.unit_price || 0) *
                                Number(workOrder.quantity || 0)
                              ).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {workOrder.vendor_name || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-8 py-4 bg-gray-50 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedWorkOrders.size === 0}
            onClick={handleAddItems}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add Items ({selectedWorkOrders.size})
          </button>
        </div>
      </div>
    </div>
  );
}
