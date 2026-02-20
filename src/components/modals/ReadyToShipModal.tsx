"use client";

import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import Badge from "@/components/ui/badge/Badge";

interface ReadyToShipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getStatusColor = (
  status: string | number | null | undefined,
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  const lowerStatus = String(status || "").toLowerCase();
  switch (lowerStatus) {
    case "completed":
    case "delivered":
    case "approved":
    case "ready to ship":
      return "success";
    case "pending":
    case "work in progress":
      return "warning";
    case "shipped":
    case "production":
    case "in shipment":
      return "info";
    case "in warehouse":
      return "primary";
    case "cancelled":
      return "error";
    default:
      return "primary";
  }
};

function ReadyToShipModalContent({
  isOpen,
  onClose,
}: ReadyToShipModalProps) {
  const { nguageStore } = useStore();
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch shipment items with "Ready to ship" status
  const { data: readyToShipItems = [], isLoading } = useQuery({
    queryKey: ["readyToShipItems", isOpen],
    queryFn: async (): Promise<RowData[]> => {
      try {
        const response = await nguageStore.GetPaginationData({
          table: "shipment_list_items",
          skip: 0,
          take: 500,
          NGaugeId: "47",
        });

        let items = response?.data || response || [];
        
        // Filter items with "Ready to ship" status
        if (Array.isArray(items)) {
          items = items.filter(
            (item) =>
              item.shipment_status &&
              String(item.shipment_status).toLowerCase() === "ready to ship"
          );
        }

        return Array.isArray(items) ? (items as RowData[]) : [];
      } catch (error) {
        console.error("Error fetching ready to ship items:", error);
        return [];
      }
    },
    staleTime: 0,
    enabled: isOpen,
  });

  // Filter items based on search term
  const filteredItems = readyToShipItems.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      String(item.item_code || "").toLowerCase().includes(searchLower) ||
      String(item.item || "").toLowerCase().includes(searchLower) ||
      String(item.po_number || "").toLowerCase().includes(searchLower) ||
      String(item.shipment_id || "").toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-full max-w-6xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Ready to Ship Items
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <input
            type="text"
            placeholder="Search by Item Code, Item Name, PO #, or Shipment ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-gray-600 dark:text-gray-400">
                {readyToShipItems.length === 0
                  ? "No items ready to ship"
                  : "No items match your search"}
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-950">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Shipment ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Item Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        PO #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredItems.map((item, index) => (
                      <tr
                        key={index}
                        className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {item.shipment_id || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {item.item_code || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {item.item || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          ${parseFloat(String(item.unit_price || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {item.shipment_quantity || 0}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          ${
                            item.total
                              ? parseFloat(String(item.total)).toFixed(2)
                              : "0.00"
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {item.po_number || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <Badge
                            color={getStatusColor(item.shipment_status)}
                            variant="solid"
                          >
                            {item.shipment_status || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {item.remarks || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Items: <span className="font-semibold">{filteredItems.length}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export const ReadyToShipModal = observer(ReadyToShipModalContent);
