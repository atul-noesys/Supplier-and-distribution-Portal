"use client";

import { PDFPreview } from "@/components/pdf-preview";
import Badge from "@/components/ui/badge/Badge";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { MdClose, MdDone } from "react-icons/md";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";

const tableStyles = `
  .delivery-table td {
    word-break: break-word;
    overflow-wrap: break-word;
  }
`;

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
const HIDDEN_COLUMNS_MODAL = ["ROWID", "InfoveaveBatchId", "step_history", "actual_delivery_date", "delivery_accepted_by"];


export default observer(function DeliveryPage() {
    const { nguageStore } = useStore();
    const user = nguageStore.currentUser;
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const previousUrlRef = useRef<string | null>(null);
    
    // Modal states
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [acceptModalData, setAcceptModalData] = useState<RowData | null>(null);
    const [acceptModalLoading, setAcceptModalLoading] = useState(false);
    const [acceptModalError, setAcceptModalError] = useState<string | null>(null);
    const [acceptModalRemarks, setAcceptModalRemarks] = useState<string>("");
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);



    // Fetch auth token
    const { data: authToken = null } = useQuery({
        queryKey: ["authToken"],
        queryFn: () => localStorage.getItem("access_token"),
        staleTime: 0,
        gcTime: 0,
    });

    // Fetch shipment list data
    const { data: shipmentData = [], isLoading, error } = useQuery({
        queryKey: ["deliveryShipmentList", authToken],
        queryFn: async () => {
            try {
                const paginationData = await nguageStore.GetPaginationData({
                    table: "shipment_list",
                    skip: 0,
                    take: null,
                    NGaugeId: "52",
                });

                const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
                // Filter to show both "In transit" and "Delivered" shipments
                return (result as RowData[]).filter(
                    (item) => {
                        const status = String(item.shipment_status || "").toLowerCase();
                        return status === "in transit" || status === "delivered";
                    }
                );
            } catch (err) {
                console.error("Error fetching shipment data:", err);
                throw err;
            }
        },
        staleTime: 0,
        enabled: !!authToken,
    });

    // Fetch ALL work orders for status updates/lookups
    const { data: allWorkOrders = [] } = useQuery({
        queryKey: ["allWorkOrdersDelivery", authToken],
        queryFn: async (): Promise<RowData[]> => {
            const response = await nguageStore.GetPaginationData({
                table: "work_order",
                skip: 0,
                take: 500,
                NGaugeId: "44",
            });
            let items = response?.data || response || [];
            return Array.isArray(items) ? (items as RowData[]) : [];
        },
        staleTime: 0,
        enabled: !!authToken,
    });

    // Fetch shipment items for mapping
    const { data: shipmentItems = [] } = useQuery({
        queryKey: ["shipmentItemsDelivery", authToken],
        queryFn: async (): Promise<RowData[]> => {
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
                return [];
            }
        },
        staleTime: 0,
        enabled: !!authToken,
    });



    // Get table columns from first row, excluding hidden columns
    const allColumns = shipmentData && shipmentData.length > 0 ? Object.keys(shipmentData[0]) : [];
    const columns = allColumns.filter((col) => !HIDDEN_COLUMNS.includes(col));



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

    // Handle Accept button click - fetch row data and open modal
    const handleAcceptDelivery = useCallback(async (rowId: string) => {
        setShowAcceptModal(true);
        setAcceptModalLoading(true);
        setAcceptModalError(null);
        setAcceptModalData(null);
        setAcceptModalRemarks("");

        try {
            const rowData = await nguageStore.GetRowData(52, rowId, "shipment_list");
            if (rowData) {
                setAcceptModalData(rowData);
            } else {
                setAcceptModalError("Failed to load shipment data");
            }
        } catch (err) {
            console.error("Error fetching row data:", err);
            setAcceptModalError(err instanceof Error ? err.message : "Failed to load shipment data");
        } finally {
            setAcceptModalLoading(false);
        }
    }, [nguageStore]);

    // Close accept modal
    const closeAcceptModal = () => {
        setShowAcceptModal(false);
        setAcceptModalData(null);
        setAcceptModalError(null);
        setAcceptModalRemarks("");
        setUploadMessage(null);
        setIsUploadingDocument(false);
    };

    // Helper function to update work order status
    const updateWorkOrderStatus = async (workOrderId: string, newStatus: string) => {
        try {
            console.log(`\n=== Updating Work Order Status ===`);
            console.log(`Work Order ID: ${workOrderId}`);
            console.log(`New Status: ${newStatus}`);
            console.log(`Total work orders available: ${allWorkOrders.length}`);
            
            // Find the work order by matching the expression field value
            const workOrder = allWorkOrders.find((wo) => {
                // Find the expression column (dynamic JSON key)
                const expressionKey = Object.keys(wo).find(
                    (key) => key.includes("expression") && key.includes("@po_number") && key.includes("@item_code")
                );
                
                // Get the expression value which is the concatenated po_number + item_code
                const woId = expressionKey ? String(wo[expressionKey] || "") : "";
                
                console.log(`Checking WO: ${woId} against ${workOrderId}`);
                return woId === workOrderId;
            });

            if (!workOrder) {
                console.error(`Could not find work order matching ID: ${workOrderId}`);
                console.log("Available work orders:", allWorkOrders.map(wo => {
                    const expressionKey = Object.keys(wo).find(
                        (key) => key.includes("expression") && key.includes("@po_number") && key.includes("@item_code")
                    );
                    return {
                        id: expressionKey ? wo[expressionKey] : "N/A",
                        po_number: wo.po_number,
                        item_code: wo.item_code,
                        ROWID: wo.ROWID
                    };
                }));
                throw new Error(`Work order not found: ${workOrderId}`);
            }

            if (!workOrder.ROWID) {
                console.error(`Work order found but has no ROWID: ${workOrderId}`);
                throw new Error(`Work order has no ROWID: ${workOrderId}`);
            }

            console.log(`Found work order with ROWID: ${workOrder.ROWID}`);

            // Fetch the full work order data
            const fullWorkOrderData = await nguageStore.GetRowData(44, String(workOrder.ROWID), 'work_order');

            if (!fullWorkOrderData) {
                console.error(`Could not fetch full work order data for ROWID: ${workOrder.ROWID}`);
                throw new Error(`Could not fetch work order data for ROWID: ${workOrder.ROWID}`);
            }

            console.log(`Fetched full work order data, current status: ${fullWorkOrderData.wo_status}`);

            // Spread the entire object and only update wo_status
            const updatedWorkOrder = {
                ...fullWorkOrderData,
                wo_status: newStatus,
            };

            console.log(`Updating work order with new status: ${newStatus}`);
            const result = await nguageStore.UpdateRowDataDynamic(
                updatedWorkOrder,
                String(workOrder.ROWID),
                44,
                'work_order'
            );

            if (!result.result) {
                const errorMsg = `Failed to update work order status: ${result.error}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            console.log(`✓ Work order ${workOrderId} status updated to ${newStatus}`);
            // Invalidate work order queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ["allWorkOrdersDelivery"] });
        } catch (error) {
            console.error(`✗ Error updating work order status for ${workOrderId}:`, error);
            throw error;
        }
    };

    // Handle submit accept delivery
    const handleSubmitAcceptDelivery = async () => {
        if (!acceptModalData) return;

        setAcceptModalLoading(true);
        
        try {
            // Get current user from store
            const currentUser = nguageStore.currentUser;
            const username = currentUser?.userName || "Unknown";

            // Get current date in ISO format
            const currentDate = new Date().toISOString().split('T')[0];

            // Prepare updated data with actual delivery date and accepted by username
            const updatedData = {
                ...acceptModalData,
                actual_delivery_date: currentDate,
                delivery_accepted_by: username,
                remarks: acceptModalRemarks,
                shipment_status: "Delivered"
            };

            // Use UpdateRowDataDynamic to update the shipment record
            const result = await nguageStore.UpdateRowDataDynamic(
                updatedData,
                String(acceptModalData.ROWID),
                52,
                "shipment_list"
            );

            if (!result.result) {
                throw new Error(result.error || "Failed to accept delivery");
            }

            console.log("Delivery accepted successfully");
            toast.success("Shipment marked as delivered!");

            // Get shipment ID for finding associated items
            const shipmentId = String(acceptModalData.shipment_id || "");
            console.log(`Looking for items with shipment_id: ${shipmentId}`);
            console.log(`Current shipmentItems data:`, shipmentItems);

            // Find all items related to this shipment and update their work orders
            const itemsForShipment = shipmentItems.filter(
                (item) => String(item.shipment_id || "") === shipmentId
            );

            console.log(`Found ${itemsForShipment.length} items for shipment ${shipmentId}`);
            console.log("Items for shipment:", itemsForShipment);

            if (itemsForShipment.length === 0) {
                console.warn(`No items found for shipment ${shipmentId}. Work orders will not be updated.`);
                console.log("Debugging: Checking if shipment_id field exists in items...");
                console.log("Sample item structure:", shipmentItems[0]);
                toast.warning("No shipment items found. Work orders were not updated.");
            } else {
                // Update work order statuses to "Delivered"
                let successCount = 0;
                let failureCount = 0;
                
                for (const item of itemsForShipment) {
                    console.log(`Processing item:`, item);
                    if (item.work_order_id) {
                        console.log(`Updating work order: ${item.work_order_id}`);
                        try {
                            await updateWorkOrderStatus(String(item.work_order_id), "Delivered");
                            successCount++;
                        } catch (woError) {
                            console.error(`Failed to update work order ${item.work_order_id}:`, woError);
                            failureCount++;
                        }
                    } else {
                        console.warn(`Item has no work_order_id:`, item);
                    }
                }
                
                if (successCount > 0) {
                    toast.success(`${successCount} work order(s) updated to "Delivered"`);
                }
                if (failureCount > 0) {
                    toast.error(`Failed to update ${failureCount} work order(s)`);
                }
            }
            
            // Invalidate the queries to refresh the data
            await queryClient.invalidateQueries({ 
                queryKey: ["deliveryShipmentList"] 
            });
            await queryClient.invalidateQueries({ 
                queryKey: ["allWorkOrdersDelivery"] 
            });
            
            closeAcceptModal();
        } catch (error) {
            console.error("Error accepting delivery:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to accept delivery";
            setAcceptModalError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setAcceptModalLoading(false);
        }
    };

    // Handle document upload
    const handleEditDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const fileNameToUpload = "Ngauge" + uuidv4() + file.name;

            setIsUploadingDocument(true);
            setUploadMessage(null);

            try {
                console.log("Uploading file:", file.name);
                const uploadResult = await nguageStore.UploadAttachFile(file, fileNameToUpload);
                console.log("Upload result:", uploadResult);

                if (uploadResult) {
                    setAcceptModalData((prev) => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            document: fileNameToUpload,
                        };
                    });
                    setUploadMessage({ type: "success", text: "File uploaded successfully!" });
                } else {
                    setUploadMessage({ type: "error", text: "File upload failed" });
                }
            } catch (error) {
                console.error("Upload error:", error);
                setUploadMessage({ type: "error", text: "An error occurred while uploading the file" });
            } finally {
                setIsUploadingDocument(false);
            }
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



    // Filter data based on search term
    const filteredData = !searchTerm.trim()
        ? shipmentData
        : shipmentData.filter((row) => {
            const shipmentIdStr = String(row.shipment_id || "").toLowerCase();
            const carrierName = String(row.carrier_name || "").toLowerCase();
            const invoiceId = String(row.invoice_id || "").toLowerCase();

            return (
                shipmentIdStr.includes(searchTerm.toLowerCase()) ||
                carrierName.includes(searchTerm.toLowerCase()) ||
                invoiceId.includes(searchTerm.toLowerCase())
            );
        });

    return (
        <div className="space-y-6">
            <style>{tableStyles}</style>
            <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
                {/* Header with Title and Search */}
                <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
                    <div className="flex justify-between items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery List</h2>
                        <div className="flex items-center gap-3 flex-1 max-w-115">
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
                            <div className="w-full">
                                <table className="delivery-table w-full table-fixed">
                                    <thead>
                                        <tr className="border-b border-blue-900 bg-blue-800 dark:bg-blue-700">
                                            {columns.map((col) => (
                                                <th
                                                    key={col}
                                                    className="px-2 py-2 text-left font-medium text-white text-xs uppercase tracking-wide"
                                                >
                                                    {col
                                                        .replace(/_/g, " ")
                                                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                </th>
                                            ))}
                                            <th className="px-2 py-2 text-left font-medium text-white text-xs uppercase tracking-wide">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row, index) => {
                                            const shipmentId = String(row.shipment_id || "");

                                            return (
                                                <React.Fragment key={row.ROWID || index}>
                                                    {/* Shipment Header Row */}
                                                    <tr
                                                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                                                    >
                                                        <td className="pl-2 pr-1 py-2 text-gray-700 dark:text-gray-300 font-semibold text-sm">

                                                            {searchTerm ? highlightText(String(row[columns[0]] || ""), searchTerm) : String(row[columns[0]] || "")}

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
                                                                    <td key={col} className={isShipmentStatus ? "px-1 py-2 w-28" : "px-1 py-2"}>
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
                                                                        className="px-2 py-2 text-gray-600 dark:text-gray-400 text-sm"
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
                                                                    <td key={col} className="px-2 py-2">
                                                                        {value ? (
                                                                            <button
                                                                                onClick={() => handleViewDocument(value as string)}
                                                                                className="cursor-pointer hover:opacity-75 transition-opacity"
                                                                                title="View document"
                                                                            >
                                                                                <AiOutlineEye className="ml-7 w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                            </button>
                                                                        ) : (
                                                                            <AiOutlineEyeInvisible className="ml-7 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                                        )}
                                                                    </td>
                                                                );
                                                            }

                                                            // Default cell rendering with highlight
                                                            return (
                                                                <td
                                                                    key={col}
                                                                    className="px-2 py-2 text-gray-600 dark:text-gray-400 text-sm"
                                                                >
                                                                    {searchTerm ? highlightText(String(value || "-"), searchTerm) : String(value || "-")}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-2 py-2 text-center">
                                                            {user?.roleId === 5 && String(row.shipment_status || "").toLowerCase() !== "delivered" && (
                                                                <button
                                                                    onClick={() => handleAcceptDelivery(String(row.ROWID || ""))}
                                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm flex items-center gap-1 justify-center whitespace-nowrap"
                                                                >
                                                                    <MdDone className="w-4 h-4" />
                                                                    Accept
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
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

            {/* Accept Delivery Modal */}
            {showAcceptModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-2/3 max-h-5/6 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-white/5">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Accept Delivery
                            </h2>
                            <button
                                onClick={closeAcceptModal}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <MdClose className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {acceptModalError ? (
                                <div className="flex items-center justify-center py-8">
                                    <p className="text-error-600 dark:text-error-400">
                                        {acceptModalError}
                                    </p>
                                </div>
                            ) : acceptModalData ? (
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Display all fields as disabled except documents and remarks */}
                                    {(() => {
                                        const entries = Object.entries(acceptModalData);
                                        const regularEntries = entries.filter(([key]) => !HIDDEN_COLUMNS_MODAL.includes(key) && !key.toLowerCase().includes("document") && !key.toLowerCase().includes("remark"));
                                        const docRemarkEntries = entries.filter(([key]) => (key.toLowerCase().includes("document") || key.toLowerCase().includes("remark")));
                                        return [...regularEntries, ...docRemarkEntries];
                                    })().map(([key, value]) => {
                                        const isDocument = key.toLowerCase().includes("document");
                                        const isRemark = key.toLowerCase().includes("remark");
                                        const isDisabled = !isDocument && !isRemark;

                                        return (
                                            <div key={key}>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                </label>
                                                {isDocument ? (
                                                    <div>
                                                        <input
                                                            type="file"
                                                            onChange={handleEditDocumentChange}
                                                            disabled={isUploadingDocument}
                                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50"
                                                        />
                                                        {acceptModalData.document && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                                Current: {acceptModalData.document}
                                                            </p>
                                                        )}
                                                        {uploadMessage && (
                                                            <p className={`text-xs font-medium mt-2 ${uploadMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                                                {uploadMessage.text}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : isRemark ? (
                                                    <textarea
                                                        value={isRemark ? acceptModalRemarks : String(value || "")}
                                                        onChange={(e) => isRemark && setAcceptModalRemarks(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:outline-none focus:border-blue-500 resize-none"
                                                        rows={3}
                                                        placeholder="Add remarks"
                                                    />
                                                ) : key.toLowerCase().includes("status") || key.toLowerCase().includes("state") ? (
                                                    <div>
                                                        <Badge color={getStatusColor(String(value))} variant="solid">
                                                            {String(value)}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={String(value || "-")}
                                                        disabled={isDisabled}
                                                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                                                            isDisabled
                                                                ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                                                                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500"
                                                        }`}
                                                        readOnly={isDisabled}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <div className="text-center text-gray-600 dark:text-gray-400">
                                        No data available
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
                            <button
                                onClick={closeAcceptModal}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitAcceptDelivery}
                                disabled={acceptModalLoading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2 justify-center"
                            >
                                {acceptModalLoading ? (
                                    <>
                                        <div className="animate-spin">
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        </div>
                                        Accepting Delivery...
                                    </>
                                ) : (
                                    <>
                                        <MdDone className="w-4 h-4" />
                                        Accept Delivery
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
