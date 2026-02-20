"use client";

import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { MdClose } from "react-icons/md";

interface ReadyToShipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddDeliveryModalContent({
  isOpen,
  onClose,
}: ReadyToShipModalProps) {
  const { nguageStore } = useStore();

  // Fetch shipment list data
  const { data: shipmentListData = [] } = useQuery({
    queryKey: ["shipmentList", isOpen],
    queryFn: async (): Promise<RowData[]> => {
      try {
        const response = await nguageStore.GetPaginationData({
          table: "shipment_list",
          skip: 0,
          take: null,
          NGaugeId: "52",
        });

        const result = Array.isArray(response) ? response : (response?.data || []);
        return result as RowData[];
      } catch (error) {
        console.error("Error fetching shipment list:", error);
        return [];
      }
    },
    staleTime: 0,
    enabled: isOpen,
  });

  // Fetch shipment items data
  const { data: shipmentItemsData = [] } = useQuery({
    queryKey: ["shipmentItems", isOpen],
    queryFn: async (): Promise<RowData[]> => {
      try {
        const response = await nguageStore.GetPaginationData({
          table: "shipment_list_items",
          skip: 0,
          take: null,
          NGaugeId: "47",
        });

        const result = Array.isArray(response) ? response : (response?.data || []);
        return result as RowData[];
      } catch (error) {
        console.error("Error fetching shipment items:", error);
        return [];
      }
    },
    staleTime: 0,
    enabled: isOpen,
  });

  // Create a map of shipments by ID with their status
  const shipmentStatusMap = shipmentListData.reduce(
    (map: Record<string, string>, shipment: RowData) => {
      const shipmentId = String(shipment.shipment_id || "");
      map[shipmentId] = String(shipment.shipment_status || "");
      return map;
    },
    {}
  );

  // Filter shipment items to only show those whose parent shipment has "Ready to ship" status
  const readyToShipItems = shipmentItemsData.filter((item) => {
    const shipmentId = String(item.shipment_id || "");
    const shipmentStatus = shipmentStatusMap[shipmentId];
    return (
      shipmentStatus &&
      shipmentStatus.toLowerCase() === "ready to ship"
    );
  });

  const isLoading = shipmentListData.length === 0 && shipmentItemsData.length === 0;

  const filteredItems = readyToShipItems;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-4/5 h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create new delivery list
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ready to Ship Items
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-gray-600 dark:text-gray-400">
                No items ready to ship
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
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-end items-center rounded-b-lg">
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

export const ReadyToShipModal = observer(AddDeliveryModalContent);
