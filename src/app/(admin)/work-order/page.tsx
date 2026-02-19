"use client";

import Badge from "@/components/ui/badge/Badge";
import { PDFPreview } from "@/components/pdf-preview";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdClose, MdEdit, MdOpenInNew } from "react-icons/md";
import { MdViewAgenda, MdViewWeek } from "react-icons/md";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import axios from "axios";


// Keys to exclude from display
const EXCLUDED_KEYS = new Set(["ROWID", "InfoveaveBatchId"]);

// Define the desired column order for work orders (full list for modal)
const COLUMN_ORDER = [
  "workOrderId", // Computed field (po_number + item_code)
  "item_code",
  "item",
  "vendor_id",
  "vendor_name",
  "step",
  "wo_status",
  "po_number",
  "step_name",
  "start_date",
  "end_date",
  "document",
  "remarks",
];

// Define columns to display in the table (limited to 7 columns to avoid horizontal scrolling)
const DISPLAY_COLUMNS = [
  "workOrderId",
  "item_code",
  "item",
  "vendor_id",
  "vendor_name",
  "step",
  "wo_status",
  "po_number",
  "document",
];

// Function to generate column headers from data dynamically
const getDynamicColumns = (items: RowData[]): Array<{ key: string; label: string }> => {
  if (!items || items.length === 0) return [];

  const firstItem = items[0];
  const keys = Object.keys(firstItem).filter((key) => {
    // Exclude specified keys
    if (EXCLUDED_KEYS.has(key)) return false;
    // Include computed expression keys (starting with {)
    return true;
  });

  // Create a mapping of computed expression keys to "workOrderId"
  const computedExpressionKey = keys.find((key) => key.startsWith("{"));

  // Build the final column list using only DISPLAY_COLUMNS
  let sortedKeys = [...DISPLAY_COLUMNS];

  // If computed expression exists, map it to workOrderId
  if (computedExpressionKey && sortedKeys.includes("workOrderId")) {
    sortedKeys = sortedKeys.map((key) => (key === "workOrderId" ? computedExpressionKey : key));
  }

  // Convert key names to readable labels
  return sortedKeys.map((key) => {
    if (key === computedExpressionKey) {
      return { key, label: "Work Order ID" };
    }
    return {
      key,
      label: key
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    };
  });
};

export default observer(function WorkOrderPage() {
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<RowData | null>(null);
  const [isLoadingWorkOrder, setIsLoadingWorkOrder] = useState(false);
  const [editFormData, setEditFormData] = useState<RowData | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [isSavingWorkOrder, setIsSavingWorkOrder] = useState(false);
  const itemsPerPage = 50;

  // Fetch auth token
  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  // Get the current user from the store
  const user = useMemo(() => nguageStore.GetCurrentUserDetails(), [nguageStore]);

  // Fetch work order items using GetPaginationData
  const { data: paginationData, isLoading, error } = useQuery({
    queryKey: ["workOrderItems", authToken],
    queryFn: async (): Promise<RowData[]> => {
      const response = await nguageStore.GetPaginationData({
        table: "work_order",
        skip: 0,
        take: 500,
        NGaugeId: "44",
      });
      
      // Handle response - GetPaginationData returns PaginationData object with data property
      const items = response?.data || response || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        return [];
      }

      // Return items as-is without adding non-existent fields
      return items as RowData[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken,
  });

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!paginationData) return [];
    
    return paginationData.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [paginationData, searchTerm]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Fetch PO items data
  const { data: poItemsData = [] } = useQuery({
    queryKey: ["poItemsForKanban", authToken],
    queryFn: async () => {
      try {
        const response = await axios.post("/api/GetPOItems", {}, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        return response.data?.data || [];
      } catch (error) {
        console.error("Error fetching PO items:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken,
  });

  // Transform work order data to KanbanItem format for the kanban view
  const kanbanItems = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) return [];
    
    // Create a map of PO items for quick lookup
    const poItemsMap = new Map<string, any>();
    poItemsData.forEach((item: any) => {
      const key = `${item.po_number}_${item.item_code}`;
      poItemsMap.set(key, item);
    });

    // Merge work order data with PO items
    return filteredItems.map((item) => {
      const key = `${item.po_number}_${item.item_code}`;
      const poItem = poItemsMap.get(key);

      return {
        po_number: String(item.po_number || ""),
        item_code: String(item.item_code || ""),
        item: String(item.item || ""),
        unit_price: poItem?.unit_price || 0,
        quantity: poItem?.quantity || 0,
        status: String(item.step || "Step 1"),
        InfoveaveBatchId: Number(item.InfoveaveBatchId) || 0,
        po_status: poItem?.po_status || "Pending",
        vendor_id: String(item.vendor_id || ""),
        vendor_name: item.vendor_name ? String(item.vendor_name) : undefined,
        step_name: item.step_name ? String(item.step_name) : undefined,
        remarks: item.remarks ? String(item.remarks) : undefined,
        document: item.document ? String(item.document) : undefined,
        wo_status: item.wo_status ? String(item.wo_status) : undefined,
        step_history: poItem?.step_history,
        ROWID: Number(item.ROWID) || 0,
      };
    });
  }, [filteredItems, poItemsData]);

  const handleEditRow = async (item: RowData) => {
    const rowId = String(item.ROWID);
    if (!rowId) {
      console.error("Row ID is missing");
      return;
    }

    setIsLoadingWorkOrder(true);
    try {
      const latestData = await nguageStore.GetRowData(
        44,
        rowId,
        'work_order'
      );

      if (latestData) {
        // Add ROWID to the fetched data since GetRowData response doesn't include it
        const dataWithRowId = {
          ...latestData,
          ROWID: rowId,
        };
        setSelectedWorkOrder(dataWithRowId as RowData);
        setEditFormData(dataWithRowId as RowData);
        setIsModalOpen(true);
      } else {
        console.warn("Could not fetch work order data");
      }
    } catch (error) {
      console.error("Error fetching work order data:", error);
    } finally {
      setIsLoadingWorkOrder(false);
    }
  };

  const handleViewDetails = async (item: RowData) => {
    const rowId = String(item.ROWID);
    if (!rowId) {
      console.error("Row ID is missing");
      return;
    }

    setIsLoadingWorkOrder(true);
    try {
      const latestData = await nguageStore.GetRowData(
        44,
        rowId,
        'work_order'
      );

      if (latestData) {
        // Add ROWID to the fetched data since GetRowData response doesn't include it
        const dataWithRowId = {
          ...latestData,
          ROWID: rowId,
        };
        setSelectedWorkOrder(dataWithRowId as RowData);
        setIsDetailModalOpen(true);
      } else {
        console.warn("Could not fetch work order data");
      }
    } catch (error) {
      console.error("Error fetching work order data:", error);
    } finally {
      setIsLoadingWorkOrder(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedWorkOrder(null);
  };

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

  useEffect(() => {
    fetchPdf(selectedDocument);
  }, [selectedDocument, fetchPdf]);

  const handleViewDocument = (docName: string) => {
    setSelectedDocument(docName);
  };

  const closePdfViewer = () => {
    setSelectedDocument(null);
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setPdfUrl(null);
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

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
          setEditFormData((prev) => {
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

  const handleEditWorkOrder = async () => {
    // Add guard clause to ensure data exists
    if (!editFormData || !selectedWorkOrder) {
      toast.error("Form data is missing. Please try again.");
      return;
    }

    setIsSavingWorkOrder(true);

    try {
      const rowId = String(selectedWorkOrder.ROWID);
      
      // Get current date in YYYY-MM-DD format
      const today = new Date();
      const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      
      // Add end_date as current system date
      const dataToSave = {
        ...editFormData,
        end_date: currentDate,
        wo_status: editFormData.step?.toString() === "Step 5" ? "In warehouse" : "Work in progress"
      };

      console.log("Saving work order with data:", dataToSave);
      
      const result = await nguageStore.UpdateRowDataDynamic(
        dataToSave,
        rowId,
        44,
        "work_order"
      );

      if (result.result) {
        toast.success("Work order updated successfully!");
        handleCloseModal();
        queryClient.invalidateQueries({ queryKey: ["workOrderItems"] });
      } else {
        toast.error("Failed to update work order. Please try again.");
      }
    } catch (error) {
      console.error("Error saving work order:", error);
      toast.error("An error occurred while saving the work order.");
    } finally {
      setIsSavingWorkOrder(false);
    }
  };

  const handleDragDropSave = async (item: any, newStep: string) => {
    const rowId = String(item.ROWID);
    if (!rowId) {
      console.error("Row ID is missing");
      return;
    }

    try {
      // Fetch the latest row data
      const latestData = await nguageStore.GetRowData(
        44,
        rowId,
        'work_order'
      );

      if (!latestData) {
        toast.error("Failed to fetch latest work order data");
        return;
      }

      // Get current date in YYYY-MM-DD format
      const today = new Date();
      const currentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      // Prepare data with new step and current date
      const dataToSave = {
        ...latestData,
        step: newStep,
        end_date: currentDate,
        wo_status: newStep.toString() === "Step 5" ? "In warehouse" : "Work in progress"
      };

      console.log("Saving drag-drop change:", dataToSave);

      const result = await nguageStore.UpdateRowDataDynamic(
        dataToSave,
        rowId,
        44,
        "work_order"
      );

      if (result.result) {
        toast.success(<span>Work order <b>{latestData.po_number}{latestData.item_code}</b> moved to <b>{newStep}</b></span>);
        queryClient.invalidateQueries({ queryKey: ["workOrderItems"] });
      } else {
        toast.error("Failed to update work order step.");
      }
    } catch (error) {
      console.error("Error saving drag-drop change:", error);
      toast.error("An error occurred while updating the work order.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedWorkOrder(null);
    setEditFormData(null);
    setUploadMessage(null);
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

  // Function to format date fields
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  // Generate columns dynamically from data
  const tableColumns = useMemo(() => {
    const dynamicColumns = getDynamicColumns(paginatedItems);
    // Always use DISPLAY_COLUMNS for consistency
    if (dynamicColumns.length === 0) {
      return DISPLAY_COLUMNS.map((key) => ({
        key,
        label: key === "workOrderId" 
          ? "Work Order ID"
          : key
              .replace(/_/g, " ")
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
      }));
    }
    return dynamicColumns;
  }, [paginatedItems]);

  if (error) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Error Loading Work Orders
          </h4>
          <p className="mt-2 text-red-500">Failed to load work order data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        {/* Header with Title and Search */}
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">Work Orders</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by PO number/Item code/Item name/Vendor"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-80 px-4 py-2.25 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Clear search"
                  >
                    <MdClose className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-full p-0.5">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`p-1.5 rounded-full transition-all ${
                    viewMode === "kanban"
                      ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                  }`}
                  title="Kanban view"
                >
                  <MdViewAgenda className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-full transition-all ${
                    viewMode === "table"
                      ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                  }`}
                  title="Table view"
                >
                  <MdViewWeek className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="pt-4 px-0">
          <KanbanBoard initialData={kanbanItems} searchTerm={searchTerm} onEditClick={user?.roleId !== 5 ? handleEditRow : undefined} onDragDropSave={user?.roleId !== 5 ? handleDragDropSave : undefined} disabled={user?.roleId === 5} />
        </div>
      ) : (
        <div className="border-t border-gray-200 dark:border-white/5">
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1.4fr 0.7fr 1.1fr 0.6fr 1fr 0.9fr 0.6fr 70px 80px', gap: '0', minWidth: '100%' }}>
              {/* Table Header */}
              {tableColumns.map((column) => (
                <div
                  key={column.key}
                  className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 border-r border-blue-800 dark:border-blue-800"
                >
                  {column.label}
                </div>
              ))}
              {/* Details Header */}
              <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 border-r border-blue-800 dark:border-blue-800">
                Details
              </div>
              {/* Actions Header */}
              <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 border-r border-blue-800 dark:border-blue-800">
                Actions
              </div>
            </div>

            {/* Table Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1.4fr 0.7fr 1.1fr 0.6fr 1fr 0.9fr 0.6fr 70px 80px', gap: '0', minWidth: '100%' }}>
              {paginatedItems.length === 0 ? (
                <div style={{ gridColumn: '1 / -1' }} className="py-8 text-center bg-white dark:bg-gray-800">
                  <p className="text-gray-500 dark:text-gray-400">No work orders found</p>
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <Fragment key={item.ROWID}>
                    {tableColumns.map((column) => {
                      const value = item[column.key];
                      let cellContent: React.ReactNode = "-";

                      // Format date fields
                      if (column.key === "start_date" || column.key === "end_date") {
                        cellContent = formatDate(String(value || ""));
                      }
                      // Render Badge for step field
                      else if (column.key === "step") {
                        cellContent = (
                          <Badge color="green" variant="solid">
                            {value || "-"}
                          </Badge>
                        );
                      }
                      // Render Badge for wo_status field
                      else if (column.key === "wo_status") {
                        const statusColor = String(value).toLowerCase().includes("warehouse") ? "blue" : "orange";
                        cellContent = (
                          <Badge color={statusColor} variant="solid">
                            {value || "-"}
                          </Badge>
                        );
                      }
                      // Render document icon
                      else if (column.key === "document") {
                        cellContent = value ? (
                          <button
                            onClick={() => handleViewDocument(value as string)}
                            className="cursor-pointer hover:opacity-75 transition-opacity"
                            title="View document"
                          >
                            <AiOutlineEye className="ml-7 w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </button>
                        ) : (
                          <AiOutlineEyeInvisible className="ml-7 w-5 h-5 text-gray-400 dark:text-gray-500" />
                        );
                      } else if (value !== null && value !== undefined && value !== "") {
                        // Render with highlight if search term exists
                        cellContent = searchTerm ? highlightText(String(value), searchTerm) : String(value);
                      }

                      return (
                        <div
                          key={column.key}
                          className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {cellContent}
                          </p>
                        </div>
                      );
                    })}
                    {/* Details Cell */}
                    <div className="px-2.5 py-3 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="flex justify-center items-center ml-2 w-8 h-4 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                        title="View Details"
                      >
                        <MdOpenInNew className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Actions Cell */}
                    <div className="px-2.5 py-3 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                      {user?.roleId !== 5 && (
                        <button
                          onClick={() => handleEditRow(item)}
                          className="flex justify-center items-center ml-3 w-8 h-4 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <MdEdit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </Fragment>
                ))
              )}
            </div>
          </div>
        </div>
      )}
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

      {/* Work Order Detail Modal */}
      {isDetailModalOpen && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-4/5 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Work Order Details
              </h2>
              <button
                onClick={handleCloseDetailModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Display all fields from COLUMN_ORDER */}
                {COLUMN_ORDER.map((key) => {
                  const value = selectedWorkOrder[key];
                  let displayValue = "-";

                  // Handle computed expression key (workOrderId)
                  if (key === "workOrderId") {
                    const computedKey = Object.keys(selectedWorkOrder).find((k) => k.startsWith("{"));
                    displayValue = computedKey ? String(selectedWorkOrder[computedKey] || "-") : "-";
                  } else if (key === "start_date" || key === "end_date") {
                    displayValue = formatDate(String(value || ""));
                  } else if (value !== null && value !== undefined && value !== "") {
                    displayValue = String(value);
                  }

                  const label = key === "workOrderId"
                    ? "Work Order ID"
                    : key
                        .replace(/_/g, " ")
                        .split(" ")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ");

                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {label}
                      </label>
                      <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300">
                        {displayValue}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
              <button
                onClick={handleCloseDetailModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Order Edit Modal */}
      {isModalOpen && selectedWorkOrder && editFormData && user?.roleId !== 5 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-4/5 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Work Order
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Work Order ID - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Work Order ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value={String(selectedWorkOrder.workOrderId || selectedWorkOrder[Object.keys(selectedWorkOrder).find(k => k.startsWith("{")) || ""] || "-")}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Item Code - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Item Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={String(editFormData.item_code || "-")}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Item - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={String(editFormData.item || "-")}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Vendor Name - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vendor Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={String(editFormData.vendor_name || "-")}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* PO Number - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PO Number
                  </label>
                  <input
                    type="text"
                    disabled
                    value={String(editFormData.po_number || "-")}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Start Date - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatDate(String(editFormData.start_date || ""))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* End Date - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatDate(String(editFormData.end_date || ""))}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Step - Editable Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step
                  </label>
                  <select
                    value={String(editFormData.step || "")}
                    onChange={(e) => handleEditFormChange("step", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select step</option>
                    <option value="Step 1">Step 1</option>
                    <option value="Step 2">Step 2</option>
                    <option value="Step 3">Step 3</option>
                    <option value="Step 4">Step 4</option>
                    <option value="Step 5">Step 5</option>
                  </select>
                </div>

                {/* Step Name - Editable Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step Name
                  </label>
                  <select
                    value={String(editFormData.step_name || "")}
                    onChange={(e) => handleEditFormChange("step_name", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select step name</option>
                    <option value="Painting">Painting</option>
                    <option value="Welding">Welding</option>
                    <option value="Fitting">Fitting</option>
                    <option value="Filing">Filing</option>
                    <option value="Drilling">Drilling</option>
                    <option value="Casting">Casting</option>
                  </select>
                </div>

                {/* WO Status - Disabled (Auto-calculated) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    WO Status
                  </label>
                  <input
                    type="text"
                    disabled
                    value={String(editFormData.wo_status || "-")}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Document - File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Document
                  </label>
                  <input
                    type="file"
                    onChange={handleEditDocumentChange}
                    disabled={isUploadingDocument}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50"
                  />
                  {editFormData.document && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Current: {editFormData.document}
                    </p>
                  )}
                </div>

                {/* Remarks - Textarea (Full Width) */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={String(editFormData.remarks || "")}
                    onChange={(e) => handleEditFormChange("remarks", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter any remarks here..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
              <button
                onClick={handleCloseModal}
                disabled={isSavingWorkOrder}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditWorkOrder}
                disabled={isSavingWorkOrder}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSavingWorkOrder ? (
                  <>
                    <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
});