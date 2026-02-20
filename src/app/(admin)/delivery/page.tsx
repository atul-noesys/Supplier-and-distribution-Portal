"use client";

import React, { useState, useEffect } from "react";
import { ReadyToShipModal } from "@/components/modals/ReadyToShipModal";
import { MdClose, MdArrowDropDown, MdOpenInNew } from "react-icons/md";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";

const HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId"];
const DATE_COLUMNS = ["actual_delivery_date", "delivery_acceptance_date"];

// Helper function to format dates by removing timestamp
const formatDateValue = (value: any, columnName: string): string => {
    if (!value) return "-";
    const stringValue = String(value);
    if (DATE_COLUMNS.includes(columnName)) {
        // Extract only the date part (YYYY-MM-DD)
        const dateMatch = stringValue.match(/^\d{4}-\d{2}-\d{2}/);
        return dateMatch ? dateMatch[0] : stringValue;
    }
    return stringValue;
};

export default observer(function DeliveryPage() {
    const { nguageStore } = useStore();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isReadyToShipModalOpen, setIsReadyToShipModalOpen] = useState(false);
    const [expandedDeliveries, setExpandedDeliveries] = useState<Set<string>>(new Set());
    const [selectedItemForDetails, setSelectedItemForDetails] = useState<RowData | null>(null);

    // Define columns for main view and details view
    const MAIN_ITEM_COLUMNS = [
        "shipment_id",
        "delivery_location",
        "delivery_accepted_by",
        "actual_delivery_date",
        "delivery_acceptance_date",
        "delivery_qc_passed",
        "document",
        "remarks",
    ];
    const DETAILS_COLUMNS: string[] = [];

    // Fetch delivery list data
    const { data: deliveryData = [], isLoading: isLoadingDelivery, error: deliveryError } = useQuery({
        queryKey: ["deliveryList"],
        queryFn: async () => {
            try {
                const paginationData = await nguageStore.GetPaginationData({
                    table: "delivery_list",
                    skip: 0,
                    take: null,
                    NGaugeId: "53",
                });

                const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
                return result as RowData[];
            } catch (err) {
                console.error("Error fetching delivery data:", err);
                throw err;
            }
        },
        staleTime: 0,
    });

    // Fetch delivery items data
    const { data: deliveryItems = [] } = useQuery({
        queryKey: ["deliveryItems"],
        queryFn: async () => {
            try {
                const paginationData = await nguageStore.GetPaginationData({
                    table: "delivery_list_items",
                    skip: 0,
                    take: null,
                    NGaugeId: "54",
                });

                const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
                return result as RowData[];
            } catch (err) {
                console.error("Error fetching delivery items:", err);
                throw err;
            }
        },
        staleTime: 0,
    });

    // Get table columns from first row, excluding hidden columns
    const allColumns = deliveryData && deliveryData.length > 0 ? Object.keys(deliveryData[0]) : [];
    const columns = allColumns.filter((col) => !HIDDEN_COLUMNS.includes(col));

    // Toggle delivery expansion
    const toggleDelivery = (deliveryId: string) => {
        const newExpandedDeliveries = new Set(expandedDeliveries);
        if (newExpandedDeliveries.has(deliveryId)) {
            newExpandedDeliveries.delete(deliveryId);
        } else {
            newExpandedDeliveries.add(deliveryId);
        }
        setExpandedDeliveries(newExpandedDeliveries);
    };

    // Open details modal for item
    const openItemDetailsModal = (item: RowData) => {
        setSelectedItemForDetails(item);
    };

    // Close details modal
    const closeItemDetailsModal = () => {
        setSelectedItemForDetails(null);
    };

    // Group delivery items by delivery_id
    const itemsByDelivery: Record<string, RowData[]> = {};
    deliveryItems.forEach((item: RowData) => {
        const deliveryId = String(item.delivery_id || "");
        if (!itemsByDelivery[deliveryId]) {
            itemsByDelivery[deliveryId] = [];
        }
        itemsByDelivery[deliveryId].push(item);
    });

    // Filter items based on search term
    const filteredItems = !searchTerm.trim()
        ? deliveryItems
        : deliveryItems.filter((item) => {
            const shipmentId = String(item.shipment_id || "").toLowerCase();
            const deliveryLocation = String(item.delivery_location || "").toLowerCase();

            return (
                shipmentId.includes(searchTerm.toLowerCase()) ||
                deliveryLocation.includes(searchTerm.toLowerCase())
            );
        });

    // Get delivery IDs that have matching items
    const deliveryIdsWithMatchingItems = new Set(
        filteredItems.map((item) => String(item.delivery_id || ""))
    );

    // Filter data based on search term - include deliveries that match OR have matching items
    const filteredData = !searchTerm.trim()
        ? deliveryData
        : deliveryData.filter((row) => {
            const deliveryId = String(row.delivery_id || "");
            const deliveryIdStr = String(row.delivery_id || "").toLowerCase();
            const searchLower = searchTerm.toLowerCase();

            const deliveryMatches = deliveryIdStr.includes(searchLower);

            // Include if delivery matches OR has items that match
            return deliveryMatches || deliveryIdsWithMatchingItems.has(deliveryId);
        });

    // Auto-expand deliveries when search term exists
    useEffect(() => {
        if (searchTerm.trim() !== "") {
            // Expand all deliveries that have matching items or delivery data
            const matchingDeliveryIds = new Set<string>();

            // Check delivery data
            deliveryData.forEach((delivery) => {
                const deliveryId = String(delivery.delivery_id || "");
                const deliveryIdStr = delivery.delivery_id ? String(delivery.delivery_id).toLowerCase() : "";

                if (deliveryIdStr.includes(searchTerm.toLowerCase())) {
                    matchingDeliveryIds.add(deliveryId);
                }
            });

            // Check item data
            deliveryItems.forEach((item) => {
                const shipmentId = String(item.shipment_id || "").toLowerCase();
                const deliveryLocation = String(item.delivery_location || "").toLowerCase();

                if (
                    shipmentId.includes(searchTerm.toLowerCase()) ||
                    deliveryLocation.includes(searchTerm.toLowerCase())
                ) {
                    const deliveryId = String(item.delivery_id || "");
                    matchingDeliveryIds.add(deliveryId);
                }
            });

            setExpandedDeliveries(matchingDeliveryIds);
        } else {
            // Collapse all when search is cleared
            setExpandedDeliveries(new Set());
        }
    }, [searchTerm, deliveryData, deliveryItems]);

    // Delivery items columns
    const ITEM_HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId"];
    const itemsAllColumns = deliveryItems && deliveryItems.length > 0 ? Object.keys(deliveryItems[0]) : [];

    // Filter to only show main view columns (case-insensitive matching)
    const itemColumns = MAIN_ITEM_COLUMNS.filter((col) =>
        itemsAllColumns.some((apiCol) => apiCol.toLowerCase() === col.toLowerCase())
    );

    // Get available detail columns from the data
    const availableDetailColumns = itemsAllColumns.filter(
        (col) =>
            !ITEM_HIDDEN_COLUMNS.includes(col) &&
            !MAIN_ITEM_COLUMNS.some((mainCol) => mainCol.toLowerCase() === col.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
                {/* Header with Title and Search */}
                <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
                    <div className="flex justify-between items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Management</h2>
                        <div className="flex items-center gap-3 flex-1 max-w-[460px]">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search deliveries..."
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
                                onClick={() => setIsReadyToShipModalOpen(true)}
                                className="px-4 py-2.25 bg-blue-800 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                            >
                                VIEW READY TO SHIP
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    {isLoadingDelivery ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin">
                                <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                            </div>
                        </div>
                    ) : deliveryError ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-error-600 dark:text-error-400">
                                Failed to fetch delivery data
                            </p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <p className="text-gray-600 dark:text-gray-400">
                                {searchTerm ? "No deliveries match your search" : "No deliveries found"}
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
                                                    className="px-5 py-2.5 text-left font-medium text-white text-xs uppercase tracking-wide"
                                                >
                                                    {col
                                                        .replace(/_/g, " ")
                                                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                </th>
                                            ))}
                                            <th className="px-5 py-1 text-left font-medium text-white text-xs uppercase tracking-wide">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row, index) => {
                                            const deliveryId = String(row.delivery_id || "");
                                            const hasItems = itemsByDelivery[deliveryId] && itemsByDelivery[deliveryId].length > 0;
                                            const isExpanded = expandedDeliveries.has(deliveryId);

                                            return (
                                                <React.Fragment key={row.ROWID || index}>
                                                    {/* Delivery Header Row */}
                                                    <tr
                                                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors cursor-pointer group"
                                                        onClick={() => hasItems && toggleDelivery(deliveryId)}
                                                    >
                                                        <td className="pl-1 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                                                            <div className="flex items-center gap-1">
                                                                {hasItems && (
                                                                    <MdArrowDropDown
                                                                        className={`w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"
                                                                            }`}
                                                                    />
                                                                )}
                                                                {!hasItems && (
                                                                    <div className="w-6 h-6" />
                                                                )}
                                                                {String(row[columns[0]] || "")}
                                                            </div>
                                                        </td>
                                                        {columns.slice(1).map((col) => {
                                                            const value = row[col];
                                                            return (
                                                                <td
                                                                    key={col}
                                                                    className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm"
                                                                >
                                                                    {String(value || "-")}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-5 py-4 text-center">
                                                            {/* Actions */}
                                                        </td>
                                                    </tr>

                                                    {/* Delivery Items */}
                                                    {isExpanded && hasItems && (
                                                        <tr className="border-b border-gray-100 dark:border-white/5">
                                                            <td colSpan={columns.length + 1} className="p-0">
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full">
                                                                        <thead>
                                                                            <tr className="border-b border-gray-100 dark:border-white/5 bg-blue-100 dark:bg-gray-700">
                                                                                {itemColumns.map((col) => (
                                                                                    <th
                                                                                        key={col}
                                                                                        className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                                                                                    >
                                                                                        {col
                                                                                            .replace(/_/g, " ")
                                                                                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                                                    </th>
                                                                                ))}
                                                                                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                                                                    Details
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {itemsByDelivery[deliveryId].map((item, itemIndex) => {
                                                                                return (
                                                                                    <tr
                                                                                        key={itemIndex}
                                                                                        className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-gray-800/30 hover:bg-blue-50 dark:hover:bg-gray-800/50 transition-colors"
                                                                                    >
                                                                                        {itemColumns.map((col) => {
                                                                                            // Find the actual column in item data (case-insensitive)
                                                                                            const actualCol = itemsAllColumns.find(
                                                                                                (apiCol) => apiCol.toLowerCase() === col.toLowerCase()
                                                                                            );
                                                                                            const value = actualCol
                                                                                                ? item[actualCol as keyof RowData]
                                                                                                : undefined;

                                                                                            return (
                                                                                                <td
                                                                                                    key={col}
                                                                                                    className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400"
                                                                                                >
                                                                                                    {formatDateValue(value, col)}
                                                                                                </td>
                                                                                            );
                                                                                        })}
                                                                                        <td className="px-5 py-3 text-center">
                                                                                            <button
                                                                                                onClick={() => openItemDetailsModal(item)}
                                                                                                className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                                                            >
                                                                                                <MdOpenInNew className="w-4 h-4" />
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Item Details Modal */}
            {selectedItemForDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-4/5 max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Delivery Item Details
                            </h3>
                            <button
                                onClick={closeItemDetailsModal}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                            >
                                <MdClose className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Main Item Information */}
                            <div>
                                <div className="grid grid-cols-3 gap-6">
                                    {itemColumns.map((col) => {
                                        // Find the actual column in item data (case-insensitive)
                                        const actualCol = itemsAllColumns.find(
                                            (apiCol) => apiCol.toLowerCase() === col.toLowerCase()
                                        );
                                        const value = actualCol
                                            ? selectedItemForDetails[actualCol as keyof RowData]
                                            : undefined;
                                        const label = col
                                            .replace(/_/g, " ")
                                            .replace(/\b\w/g, (l) => l.toUpperCase());

                                        return (
                                            <div key={col}>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {label}
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled
                                                    value={formatDateValue(value, col)}
                                                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Additional Details */}
                            {availableDetailColumns.length > 0 && (
                                <div>
                                    <div className="grid grid-cols-3 gap-6">
                                        {availableDetailColumns.map((col) => {
                                            const value = selectedItemForDetails[col as keyof RowData];
                                            const label = col
                                                .replace(/_/g, " ")
                                                .replace(/\b\w/g, (l) => l.toUpperCase());

                                            return (
                                                <div key={col}>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        {label}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled
                                                        value={formatDateValue(value, col)}
                                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-6 py-4 flex justify-end">
                            <button
                                onClick={closeItemDetailsModal}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ready to Ship Modal */}
            <ReadyToShipModal
                isOpen={isReadyToShipModalOpen}
                onClose={() => setIsReadyToShipModalOpen(false)}
            />
        </div>
    );
});
