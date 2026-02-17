"use client";

import Badge from "@/components/ui/badge/Badge";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/purchase-order";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { MdClose } from "react-icons/md";
import AddShipmentModal from "@/components/modals/AddShipmentModal";

const getStatusColor = (
  status: string,
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  const lowerStatus = status?.toLowerCase() || "";
  switch (lowerStatus) {
    case "delivered":
    case "completed":
    case "approved":
      return "success";
    case "pending":
    case "in transit":
      return "warning";
    case "shipped":
    case "processing":
      return "info";
    case "cancelled":
    case "failed":
      return "error";
    default:
      return "primary";
  }
};

const HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId"];

export default observer(function ShipmentPage() {
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddShipmentModalOpen, setIsAddShipmentModalOpen] = useState(false);

  // Fetch auth token
  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch shipment list data
  const { data: shipmentData = [], isLoading, error } = useQuery({
    queryKey: ["shipmentList", authToken],
    queryFn: async () => {
      try {
        const paginationData = await nguageStore.GetPaginationData({
          table: "shipment_list",
          skip: 0,
          take: null,
          NGaugeId: "46",
        });

        const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
        return result as RowData[];
      } catch (err) {
        console.error("Error fetching shipment data:", err);
        throw err;
      }
    },
    staleTime: 0,
    enabled: !!authToken,
  });

  // Get table columns from first row, excluding hidden columns
  const allColumns = shipmentData && shipmentData.length > 0 ? Object.keys(shipmentData[0]) : [];
  const columns = allColumns.filter((col) => !HIDDEN_COLUMNS.includes(col));

  // Filter data based on search term
  const filteredData = !searchTerm.trim()
    ? shipmentData
    : shipmentData.filter((row) =>
        columns.some((col) => {
          const value = String(row[col] || "").toLowerCase();
          return value.includes(searchTerm.toLowerCase());
        })
      );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        {/* Header with Title and Search */}
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shipment List</h2>
            <div className="flex items-center gap-3 flex-1 max-w-[460px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search shipments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.25 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Clear search"
                  >
                    <MdClose className="w-5 h-5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsAddShipmentModalOpen(true)}
                className="px-4 py-2.25 bg-blue-800 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
              >
                + ADD SHIPMENT
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-error-600 dark:text-error-400">
                Failed to fetch shipment data
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? "No shipments match your search" : "No shipments found"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-blue-900 bg-blue-800 dark:bg-blue-700">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide"
                        >
                          {col
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => (
                      <tr
                        key={row.ROWID || index}
                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                      >
                        {columns.map((col) => {
                          const value = row[col];

                          // Check if it's a status field
                          if (
                            col.toLowerCase().includes("status") ||
                            col.toLowerCase().includes("state")
                          ) {
                            return (
                              <td key={col} className="px-5 py-4">
                                <Badge color={getStatusColor(String(value))} variant="solid" size="sm">
                                  {String(value || "-")}
                                </Badge>
                              </td>
                            );
                          }

                          // Check if it's a date field
                          if (col.toLowerCase().includes("date")) {
                            return (
                              <td
                                key={col}
                                className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm"
                              >
                                {value
                                  ? new Date(String(value)).toLocaleDateString()
                                  : "-"}
                              </td>
                            );
                          }

                          // Default cell rendering
                          return (
                            <td
                              key={col}
                              className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm"
                            >
                              {String(value || "-")}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddShipmentModal
        isOpen={isAddShipmentModalOpen}
        onClose={() => setIsAddShipmentModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["shipmentList"] });
        }}
      />
    </div>
  );
});
