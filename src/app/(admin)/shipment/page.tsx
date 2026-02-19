"use client";

import AddShipmentModal from "@/components/modals/AddShipmentModal";
import { PDFPreview } from "@/components/pdf-preview";
import Badge from "@/components/ui/badge/Badge";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { MdArrowDropDown, MdClose, MdOpenInNew } from "react-icons/md";

const getStatusColor = (
  status: string,
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  const lowerStatus = status?.toLowerCase() || "";
  switch (lowerStatus) {
    case "delivered":
    case "completed":
    case "approved":
    case "ready to ship":
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

const HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId", "vendor_id", "vendor_name", "step_history"];

export default observer(function ShipmentPage() {
  const { nguageStore, shipmentStore } = useStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddShipmentModalOpen, setIsAddShipmentModalOpen] = useState(false);
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<RowData | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  // Get the current user from the store
  const user = nguageStore.currentUser;

  // Define columns for main view and details view
  const MAIN_ITEM_COLUMNS = ["work_order_id", "item_code", "item", "unit_price", "shipment_quantity", "document"];
  const DETAILS_COLUMNS = ["po_number", "shipment_status", "remarks"];

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
          NGaugeId: "52",
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

  // Fetch shipment items data
  const { data: shipmentItems = [] } = useQuery({
    queryKey: ["shipmentItems", authToken],
    queryFn: async () => {
      try {
        const paginationData = await nguageStore.GetPaginationData({
          table: "shipment_list_items",
          skip: 0,
          take: null,
          NGaugeId: "47",
        });

        const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
        return result as RowData[];
      } catch (err) {
        console.error("Error fetching shipment items:", err);
        throw err;
      }
    },
    staleTime: 0,
    enabled: !!authToken,
  });

  // Get table columns from first row, excluding hidden columns
  const allColumns = shipmentData && shipmentData.length > 0 ? Object.keys(shipmentData[0]) : [];
  const columns = allColumns.filter((col) => !HIDDEN_COLUMNS.includes(col));

  // Toggle shipment expansion
  const toggleShipment = (shipmentId: string) => {
    const newExpandedShipments = new Set(expandedShipments);
    if (newExpandedShipments.has(shipmentId)) {
      newExpandedShipments.delete(shipmentId);
    } else {
      newExpandedShipments.add(shipmentId);
    }
    setExpandedShipments(newExpandedShipments);
  };

  // Open details modal for item
  const openItemDetailsModal = (item: RowData, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemForDetails(item);
  };

  // Close details modal
  const closeItemDetailsModal = () => {
    setSelectedItemForDetails(null);
  };

  // Fetch PDF document
  const fetchPdf = useCallback(async (docName: string | null) => {
    if (!docName) {
      setPdfUrl(null);
      return;
    }

    setLoadingPdf(true);
    setPdfError(null);

    try {
      const apiUrl = `/api/GetPdfUrl?attachment=${encodeURIComponent(docName)}`;

      const pdfResponse = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!pdfResponse.ok) {
        throw new Error(
          `Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`,
        );
      }

      const pdfBlob = await pdfResponse.blob();
      const blobUrl = URL.createObjectURL(pdfBlob);
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
      previousUrlRef.current = blobUrl;
      setPdfUrl(blobUrl);
    } catch (err) {
      console.error("Failed to fetch PDF:", err);
      setPdfError(err instanceof Error ? err.message : "Failed to load PDF");
      setPdfUrl(null);
    } finally {
      setLoadingPdf(false);
    }
  }, [authToken]);

  // Handle PDF fetching when document selection changes
  useEffect(() => {
    fetchPdf(selectedDocument);
  }, [selectedDocument, fetchPdf]);

  // Handle viewing document
  const handleViewDocument = (docName: string) => {
    setSelectedDocument(docName);
  };

  // Close PDF viewer
  const closePdfViewer = () => {
    setSelectedDocument(null);
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setPdfUrl(null);
  };

  // Handle edit shipment
  const handleEditShipment = async (row: RowData) => {
    const shipmentId = String(row.shipment_id || "");
    const rowId = String(row.ROWID || "");
    
    try {
      // Fetch fresh shipment data using GetRowData
      const freshShipmentData = await nguageStore.GetRowData(52, rowId, "shipment_list");
      
      // Get items for this shipment
      const itemsForShipment = itemsByShipment[shipmentId] || [];
      
      // Fetch fresh data for each item using GetRowData
      const freshItemsData = await Promise.all(
        itemsForShipment.map((item) => 
          nguageStore.GetRowData(47, String(item.ROWID || ""), "shipment_list_items")
        )
      );
      
      // Filter out null values
      const validFreshItems = freshItemsData.filter((item) => item !== null) as RowData[];
      
      // Store in the store with fresh API data
      if (freshShipmentData) {
        // Ensure ROWID is preserved in the fetched data
        const shipmentWithROWID = {
          ...freshShipmentData,
          ROWID: rowId,
        };
        shipmentStore.setCurrentShipment(shipmentWithROWID, validFreshItems.length > 0 ? validFreshItems : itemsForShipment);
      }
      
      // Open the modal
      setIsAddShipmentModalOpen(true);
    } catch (error) {
      console.error("Error fetching shipment data:", error);
      // Fallback to existing data if API call fails
      const itemsForShipment = itemsByShipment[shipmentId] || [];
      shipmentStore.setCurrentShipment(row, itemsForShipment);
      setIsAddShipmentModalOpen(true);
    }
  };

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

  // Auto-expand shipments when search term exists
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      // Expand all shipments that have matching items or shipment data
      const matchingShipmentIds = new Set<string>();

      // Check shipment data
      shipmentData.forEach((shipment) => {
        const shipmentId = String(shipment.shipment_id || "");
        const carrierName = String(shipment.carrier_name || "").toLowerCase();
        const invoiceId = String(shipment.invoice_id || "").toLowerCase();

        if (
          shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          carrierName.includes(searchTerm.toLowerCase()) ||
          invoiceId.includes(searchTerm.toLowerCase())
        ) {
          matchingShipmentIds.add(shipmentId);
        }
      });

      // Check item data
      shipmentItems.forEach((item) => {
        const itemCode = String(item.item_code || "").toLowerCase();
        const itemName = String(item.item || "").toLowerCase();

        if (
          itemCode.includes(searchTerm.toLowerCase()) ||
          itemName.includes(searchTerm.toLowerCase())
        ) {
          const shipmentId = String(item.shipment_id || "");
          matchingShipmentIds.add(shipmentId);
        }
      });

      setExpandedShipments(matchingShipmentIds);
    } else {
      // Collapse all when search is cleared
      setExpandedShipments(new Set());
    }
  }, [searchTerm, shipmentData, shipmentItems]);

  // Shipment items columns (excluding hidden columns)
  const ITEM_HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId"];
  const itemsAllColumns = shipmentItems && shipmentItems.length > 0 ? Object.keys(shipmentItems[0]) : [];

  // Find the expression column (total calculation)
  const expressionColumn = itemsAllColumns.find((col) => col.startsWith("{"));

  // Filter to only show main view columns (case-insensitive matching)
  const itemColumns = MAIN_ITEM_COLUMNS.filter((col) =>
    itemsAllColumns.some((apiCol) => apiCol.toLowerCase() === col.toLowerCase())
  );

  // Get available detail columns from the data
  const availableDetailColumns = DETAILS_COLUMNS.filter((col) =>
    itemsAllColumns.some((apiCol) => apiCol.toLowerCase() === col.toLowerCase())
  );

  // Filter items based on search term
  const filteredItems = !searchTerm.trim()
    ? shipmentItems
    : shipmentItems.filter((item) => {
      const itemCode = String(item.item_code || "").toLowerCase();
      const itemName = String(item.item || "").toLowerCase();

      return (
        itemCode.includes(searchTerm.toLowerCase()) ||
        itemName.includes(searchTerm.toLowerCase())
      );
    });

  // Get shipment IDs that have matching items
  const shipmentIdsWithMatchingItems = new Set(
    filteredItems.map((item) => String(item.shipment_id || ""))
  );

  // Filter data based on search term - include shipments that match OR have matching items
  const filteredData = !searchTerm.trim()
    ? shipmentData
    : shipmentData.filter((row) => {
      const shipmentId = String(row.shipment_id || "");
      const shipmentIdStr = String(row.shipment_id || "").toLowerCase();
      const carrierName = String(row.carrier_name || "").toLowerCase();
      const invoiceId = String(row.invoice_id || "").toLowerCase();

      const shipmentMatches = (
        shipmentIdStr.includes(searchTerm.toLowerCase()) ||
        carrierName.includes(searchTerm.toLowerCase()) ||
        invoiceId.includes(searchTerm.toLowerCase())
      );

      // Include if shipment matches OR has items that match
      return shipmentMatches || shipmentIdsWithMatchingItems.has(shipmentId);
    });

  // Group filtered items by shipment_id
  const itemsByShipment: Record<string, RowData[]> = {};
  filteredItems.forEach((item: RowData) => {
    const shipmentId = String(item.shipment_id || "");
    if (!itemsByShipment[shipmentId]) {
      itemsByShipment[shipmentId] = [];
    }
    itemsByShipment[shipmentId].push(item);
  });

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
                  placeholder="Search by Shipment ID/Carrier/Invoice ID/Item Code/Item"
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
              {user?.roleId !== 5 && (<button
                onClick={() => setIsAddShipmentModalOpen(true)}
                className="px-4 py-2.25 bg-blue-800 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
              >
                + ADD SHIPMENT
              </button>)}
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
                          className="px-5 py-1 text-left font-medium text-white text-xs uppercase tracking-wide"
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
                      const shipmentId = String(row.shipment_id || "");
                      const hasItems = itemsByShipment[shipmentId] && itemsByShipment[shipmentId].length > 0;
                      const isExpanded = expandedShipments.has(shipmentId);

                      return (
                        <React.Fragment key={row.ROWID || index}>
                          {/* Shipment Header Row */}
                          <tr
                            className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors cursor-pointer group"
                            onClick={() => hasItems && toggleShipment(shipmentId)}
                          >
                            <td className="pl-1 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                              <div className="flex items-center gap-1">
                                {hasItems && (
                                  <MdArrowDropDown
                                    className={`w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"
                                      }`}
                                  />
                                )}
                                {!hasItems && <div className="w-6"></div>}
                                {searchTerm ? highlightText(String(row[columns[0]] || ""), searchTerm) : String(row[columns[0]] || "")}
                              </div>
                            </td>
                            {columns.slice(1).map((col) => {
                              const value = row[col];

                              // Check if it's a status field
                              if (
                                col.toLowerCase().includes("status") ||
                                col.toLowerCase().includes("state")
                              ) {
                                const isShipmentStatus = col.toLowerCase() === "shipment_status";
                                return (
                                  <td key={col} className={isShipmentStatus ? "px-5 py-2.5 w-40" : "px-5 py-2.5"}>
                                    {value && <Badge color={getStatusColor(String(value))} variant="solid" size="sm">
                                      {String(value)}
                                    </Badge>
                                    }
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

                              // Check if it's a document field
                              if (col.toLowerCase().includes("document")) {
                                return (
                                  <td key={col} className="px-11 py-4">
                                    {value ? (
                                      <button
                                        onClick={() => handleViewDocument(value as string)}
                                        className="cursor-pointer hover:opacity-75 transition-opacity"
                                        title="View document"
                                      >
                                        <AiOutlineEye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                      </button>
                                    ) : (
                                      <AiOutlineEyeInvisible className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    )}
                                  </td>
                                );
                              }

                              // Default cell rendering with highlight
                              return (
                                <td
                                  key={col}
                                  className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm"
                                >
                                  {searchTerm ? highlightText(String(value || "-"), searchTerm) : String(value || "-")}
                                </td>
                              );
                            })}
                            <td className="px-5 py-4 text-center">
                              <button
                                onClick={() => handleEditShipment(row)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </td>
                          </tr>

                          {/* Shipment Items */}
                          {isExpanded && hasItems && (
                            <>
                              {/* Items Header Row */}
                              <tr className="border-b border-gray-100 dark:border-white/5 bg-blue-100 dark:bg-blue-900/40">
                                <td colSpan={columns.length + 1} className="px-5 py-3">
                                  <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(6, minmax(90px, 1fr)) 100px 50px" }}>
                                    {itemColumns.map((col) => (
                                      <div key={col} className="text-xs font-bold text-blue-900 dark:text-gray-300 uppercase tracking-wider">
                                        {col
                                          .replace(/_/g, " ")
                                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                                      </div>
                                    ))}
                                    <div className="text-xs font-bold text-blue-900 dark:text-gray-300 uppercase tracking-wider">
                                      Total
                                    </div>
                                    <div className="text-xs font-bold text-blue-900 dark:text-gray-300 uppercase tracking-wider">
                                      Details
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {/* Items Data Rows */}
                              {itemsByShipment[shipmentId].map((item, itemIndex) => {
                                return (
                                  <React.Fragment key={itemIndex}>
                                    {/* Main Item Row */}
                                    <tr className="border-b border-gray-100 dark:border-white/5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                      <td colSpan={columns.length + 1} className="px-5 py-3">
                                        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(6, minmax(90px, 1fr)) 100px 50px" }}>

                                          {/* Main Columns */}
                                          {itemColumns.map((col) => {
                                            // Find the actual column in item data (case-insensitive)
                                            const actualCol = itemsAllColumns.find(
                                              (apiCol) => apiCol.toLowerCase() === col.toLowerCase()
                                            );
                                            const value = actualCol ? item[actualCol as keyof RowData] : undefined;

                                            // Check if it's a document field
                                            if (col.toLowerCase().includes("document")) {
                                              return (
                                                <div key={col} className="ml-6">
                                                  {value ? (
                                                    <button
                                                      onClick={() => handleViewDocument(value as string)}
                                                      className="cursor-pointer hover:opacity-75 transition-opacity"
                                                      title="View document"
                                                    >
                                                      <AiOutlineEye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </button>
                                                  ) : (
                                                    <AiOutlineEyeInvisible className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                                  )}
                                                </div>
                                              );
                                            }

                                            // Check if it's a status field
                                            if (col.toLowerCase().includes("status")) {
                                              return (
                                                <div key={col} className={col.toLowerCase() === "shipment_status" ? "min-w-[200px]" : ""}>
                                                  <Badge
                                                    color={getStatusColor(String(value))}
                                                    variant="solid"
                                                    size="sm"
                                                  >
                                                    {String(value || "-")}
                                                  </Badge>
                                                </div>
                                              );
                                            }

                                            // Check if it's a numeric field
                                            if (
                                              col.toLowerCase().includes("price") ||
                                              col.toLowerCase().includes("quantity")
                                            ) {
                                              return (
                                                <div
                                                  key={col}
                                                  className="text-gray-600 dark:text-gray-400 text-sm font-medium"
                                                >
                                                  {value ? (typeof value === "number" ? value.toFixed(2) : value) : "0"}
                                                </div>
                                              );
                                            }

                                            // Default cell rendering
                                            return (
                                              <div
                                                key={col}
                                                className="text-gray-600 dark:text-gray-400 text-sm"
                                              >
                                                {searchTerm ? highlightText(String(value || "-"), searchTerm) : String(value || "-")}
                                              </div>
                                            );
                                          })}

                                          {/* Total Column */}
                                          <div className="text-gray-600 dark:text-gray-400 text-sm font-bold">
                                            {expressionColumn && item[expressionColumn as keyof RowData]
                                              ? `$${typeof item[expressionColumn as keyof RowData] === "number"
                                                ? (item[expressionColumn as keyof RowData] as number).toFixed(2)
                                                : item[expressionColumn as keyof RowData]
                                              }`
                                              : "$0.00"}
                                          </div>

                                          {/* Details Button */}
                                          <div className="flex justify-center">
                                            <button
                                              onClick={(e) => openItemDetailsModal(item, e)}
                                              className="flex justify-center w-8 h-8 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                              title="View Details"
                                            >
                                              <MdOpenInNew className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>


                                  </React.Fragment>
                                );
                              })}
                            </>
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

      <AddShipmentModal
        isOpen={isAddShipmentModalOpen}
        onClose={() => {
          setIsAddShipmentModalOpen(false);
          shipmentStore.clearCurrentShipment();
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["shipmentList"] });
          shipmentStore.clearCurrentShipment();
        }}
      />

      {/* Item Details Modal */}
      {selectedItemForDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-4/5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Details - {selectedItemForDetails.item_code}
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
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
                  Item Information
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  {itemColumns.map((col) => {
                    // Find the actual column in item data (case-insensitive)
                    const actualCol = itemsAllColumns.find(
                      (apiCol) => apiCol.toLowerCase() === col.toLowerCase()
                    );
                    const value = actualCol ? selectedItemForDetails[actualCol as keyof RowData] : undefined;
                    const label = col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

                    // Check if it's a numeric field
                    if (col.toLowerCase().includes("price") || col.toLowerCase().includes("quantity")) {
                      return (
                        <div key={col}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {label}
                          </label>
                          <input
                            type="text"
                            disabled
                            value={value ? (typeof value === "number" ? value.toFixed(2) : value) : "-"}
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={col}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {label}
                        </label>
                        <input
                          type="text"
                          disabled
                          value={String(value || "-")}
                          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        />
                      </div>
                    );
                  })}
                  {/* Total */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total
                    </label>
                    <input
                      type="text"
                      disabled
                      value={
                        expressionColumn && selectedItemForDetails[expressionColumn as keyof RowData]
                          ? `$${typeof selectedItemForDetails[expressionColumn as keyof RowData] === "number"
                            ? (selectedItemForDetails[expressionColumn as keyof RowData] as number).toFixed(2)
                            : selectedItemForDetails[expressionColumn as keyof RowData]
                          }`
                          : "$0.00"
                      }
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {availableDetailColumns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4">
                    Additional Details
                  </h4>
                  <div className="grid grid-cols-3 gap-6">
                    {availableDetailColumns.map((col) => {
                      // Find the actual column in item data (case-insensitive)
                      const actualCol = itemsAllColumns.find(
                        (apiCol) => apiCol.toLowerCase() === col.toLowerCase()
                      );
                      const value = actualCol ? selectedItemForDetails[actualCol as keyof RowData] : undefined;
                      const label = col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

                      // Check if it's a status field
                      if (col.toLowerCase().includes("status")) {
                        return (
                          <div key={col}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {label}
                            </label>
                            <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                              <Badge
                                color={getStatusColor(String(value))}
                                variant="solid"
                                size="sm"
                              >
                                {String(value || "-")}
                              </Badge>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={col}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {label}
                          </label>
                          <input
                            type="text"
                            disabled
                            value={String(value || "-")}
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

      {/* PDF Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-2/3 h-5/6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDocument}
              </h2>
              <button
                onClick={closePdfViewer}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {pdfError ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 text-lg font-medium text-red-500">
                      Error
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">{pdfError}</div>
                    <button
                      className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      onClick={() => handleViewDocument(selectedDocument)}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : loadingPdf ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                  </div>
                </div>
              ) : pdfUrl ? (
                <PDFPreview
                  pdfUrl={pdfUrl}
                  docName={selectedDocument}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-gray-600 dark:text-gray-400">
                    No PDF loaded
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
