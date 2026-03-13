"use client";

import Badge from "@/components/ui/badge/Badge";
import PDFViewerModal from "@/components/common/PDFViewerModal";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { TimelineLayout } from "@/components/timeline/timeline-layout";
import { useStore } from "@/store/store-context";
import { TextInput, Select } from "@/components/ui";
import { MultiFileInput } from "@/components/ui/infoveave-components/MultiFileInput";
import { RowData } from "@/types/nguage-rowdata";
import { TimelineElement } from "@/types/timeline";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdClose, MdEdit, MdOpenInNew } from "react-icons/md";
import { MdViewAgenda, MdViewWeek } from "react-icons/md";
import { MdDateRange } from "react-icons/md";
import { toast } from "react-toastify";
import axios from "axios";
import { QueryKeys } from "@/types/query-keys";


// Keys to exclude from display
const EXCLUDED_KEYS = new Set(["ROWID", "InfoveaveBatchId"]);

// Define the desired column order for work orders (full list for modal)
const COLUMN_ORDER = [
  "workOrderId", // Computed field (po_number + item_code)
  "item_code",
  "item",
  "supplier_id",
  "supplier_name",
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
  "supplier_id",
  "supplier_name",
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
  const [editFormData, setEditFormData] = useState<RowData | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [openDocumentsString, setOpenDocumentsString] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [stepHistory, setStepHistory] = useState<string | null>(null);
  const [headerName, setHeaderName] = useState<string>("");
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const previousUrlRef = useRef<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [isSavingWorkOrder, setIsSavingWorkOrder] = useState(false);
  const hasEditFormChangedRef = useRef(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineElement[]>([]);
  const [timelineHeader, setTimelineHeader] = useState<string>("");
  const itemsPerPage = 50;

  // Fetch auth token
  const { data: authToken = null } = useQuery({
    queryKey: [QueryKeys.AuthToken],
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
    staleTime: 0,
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

  const { data: itemProcesses = [] } = useQuery({
    queryKey: ["itemProcesses", authToken],
    queryFn: async () => {
      try {
        const response = await nguageStore.GetPaginationData({
          table: "item_process",
          skip: 0,
          take: 500,
          NGaugeId: "58",
        });
        return response?.data || response || [];
      } catch (err) {
        console.error("Error fetching item_process:", err);
        return [];
      }
    },
    staleTime: 0,
    enabled: !!authToken,
  });

  const { data: itemProcessSteps = [] } = useQuery({
    queryKey: ["itemProcessSteps", authToken],
    queryFn: async () => {
      try {
        const response = await nguageStore.GetPaginationData({
          table: "item_process_steps",
          skip: 0,
          take: 1000,
          NGaugeId: "60",
        });
        return response?.data || response || [];
      } catch (err) {
        console.error("Error fetching item_process_steps:", err);
        return [];
      }
    },
    staleTime: 0,
    enabled: !!authToken,
  });

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
    staleTime: 0,
    enabled: !!authToken,
  });

  // Function to get total steps for an item_code
  const getTotalStepsForItemCode = useCallback(
    (itemCode: string): number => {
      const steps = Array.isArray(itemProcessSteps) ? itemProcessSteps : [];
      const uniqueSequences = new Set<number>();

      steps.forEach((step: any) => {
        if (String(step.item_code || "").toLowerCase() === String(itemCode || "").toLowerCase()) {
          uniqueSequences.add(Number(step.sequence || 0));
        }
      });

      return uniqueSequences.size;
    },
    [itemProcessSteps]
  );

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
      const totalSteps = getTotalStepsForItemCode(String(item.item_code));

      return {
        po_number: String(item.po_number || ""),
        item_code: String(item.item_code || ""),
        item: String(item.item || ""),
        unit_price: poItem?.unit_price || 0,
        quantity: poItem?.quantity || 0,
        status: String(item.step || "Step 1"),
        stepCount: totalSteps,
        InfoveaveBatchId: Number(item.InfoveaveBatchId) || 0,
        po_status: poItem?.po_status || "Pending",
        supplier_id: String(item.supplier_id || ""),
        supplier_name: item.supplier_name ? String(item.supplier_name) : undefined,
        step_name: item.step_name ? String(item.step_name) : undefined,
        remarks: item.remarks ? String(item.remarks) : undefined,
        document: item.document ? String(item.document) : undefined,
        wo_status: item.wo_status ? String(item.wo_status) : undefined,
        step_history: poItem?.step_history,
        ROWID: Number(item.ROWID) || 0,
      };
    });
  }, [filteredItems, poItemsData, getTotalStepsForItemCode]);

  const handleEditRow = async (item: RowData) => {
    const rowId = String(item.ROWID);
    if (!rowId) {
      console.error("Row ID is missing");
      return;
    }

    // Open modal immediately with existing item to avoid UI delay
    const dataWithRowId = {
      ...item,
      ROWID: rowId,
    };
    setSelectedWorkOrder(dataWithRowId as RowData);
    setEditFormData(dataWithRowId as RowData);
    hasEditFormChangedRef.current = false;
    setIsModalOpen(true);

    // Fetch latest in background and update if user hasn't started editing
    try {
      const latestData = await nguageStore.GetRowData(44, rowId, 'work_order');

      if (latestData) {
        const latestWithRowId = {
          ...latestData,
          ROWID: rowId,
        };
        // Always update displayed selectedWorkOrder (for readonly/disabled fields)
        setSelectedWorkOrder(latestWithRowId as RowData);

        // Only replace the edit form data if the user hasn't modified the form yet
        if (!hasEditFormChangedRef.current) {
          setEditFormData(latestWithRowId as RowData);
        }
      } else {
        console.warn("Could not fetch work order data");
      }
    } catch (error) {
      console.error("Error fetching work order data:", error);
    } finally {
    }
  };

  const handleViewDetails = async (item: RowData) => {
    const rowId = String(item.ROWID);
    if (!rowId) {
      console.error("Row ID is missing");
      return;
    }

    // Open details modal immediately with available item
    const dataWithRowId = {
      ...item,
      ROWID: rowId,
    };
    setSelectedWorkOrder(dataWithRowId as RowData);
    setIsDetailModalOpen(true);

    // Fetch latest in background and update the displayed details
    try {
      const latestData = await nguageStore.GetRowData(44, rowId, 'work_order');
      if (latestData) {
        const latestWithRowId = {
          ...latestData,
          ROWID: rowId,
        };
        setSelectedWorkOrder(latestWithRowId as RowData);
      } else {
        console.warn("Could not fetch work order data");
      }
    } catch (error) {
      console.error("Error fetching work order data:", error);
    } finally {
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

  const handleViewDocument = (docName: string | null, stepHist?: string | null, header?: string) => {
    // Open the PDF viewer with the raw (possibly stringified) documents value
    if (!docName) {
      setOpenDocumentsString(null);
      setSelectedDocument(null);
      setStepHistory(null);
      setHeaderName("");
      setIsPdfViewerOpen(false);
      return;
    }
    setOpenDocumentsString(docName);
    setStepHistory(stepHist || null);
    setHeaderName(header || "");
    setIsPdfViewerOpen(true);
    // Do not parse here; modal will normalize and call back with a single filename when selected
    setSelectedDocument(null);
  };

  const parseStepHistory = (stepHistoryString: string | null): TimelineElement[] => {
    if (!stepHistoryString) return [];

    const extractFilenames = (value: string): string => {
      try {
        // Try to parse as JSON array (for document fields)
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item: string) => {
              // Extract filename from path (e.g., "ivdoc://.../.../file.pdf" -> "file.pdf")
              const parts = item.split('/');
              return parts[parts.length - 1];
            })
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Not JSON, try to extract filename from path
        const parts = value.split('/');
        const filename = parts[parts.length - 1];
        return filename || value;
      }
      return value;
    };

    try {
      const parsed = JSON.parse(stepHistoryString);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, index: number) => {
          // Handle new format with values array containing changes
          if (item.values && Array.isArray(item.values)) {
            const changes = item.values
              .map((v: any) => {
                const displayKey = v.key.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                // Extract filenames if this is a document field
                let oldVal = v.oldValue === "" ? "(empty)" : String(v.oldValue);
                let newVal = v.newValue === "" ? "(empty)" : String(v.newValue);

                if (v.key === 'document') {
                  oldVal = oldVal === "(empty)" ? "(empty)" : extractFilenames(oldVal);
                  newVal = newVal === "(empty)" ? "(empty)" : extractFilenames(newVal);
                } else {
                  oldVal = oldVal.substring(0, 40) + (oldVal.length > 40 ? "..." : "");
                  newVal = newVal.substring(0, 40) + (newVal.length > 40 ? "..." : "");
                }

                return { key: displayKey, oldValue: v.oldValue, newValue: v.newValue, oldVal, newVal };
              });

            const date = new Date(item.updatedOn);
            const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return {
              id: index,
              date: dateStr,
              title: `${dateStr} at ${timeStr}`,
              description: `Updated by User ${item.updatedBy}`,
              icon: item.icon,
              status: "completed" as const,
              color: "primary" as const,
              changes,
            } as TimelineElement & { changes: any[] };
          }
          // Fallback for old format
          return {
            id: index,
            date: item.date || item.timestamp || new Date().toISOString().split('T')[0],
            title: item.title || item.step_name || "Step",
            description: item.description || item.remarks || "",
            icon: item.icon,
            status: item.status,
            color: item.color,
          };
        });
      }
      return [];
    } catch (error) {
      console.error("Error parsing step_history:", error);
      return [];
    }
  };

  const handleViewTimeline = (stepHist: string | null, header: string) => {
    if (!stepHist) {
      toast.error("No timeline data available");
      return;
    }
    const parsed = parseStepHistory(stepHist);
    if (parsed.length === 0) {
      toast.error("Unable to parse timeline data");
      return;
    }
    setTimelineData(parsed);
    setTimelineHeader(header || "");
    setIsTimelineModalOpen(true);
  };

  const closeTimelineModal = () => {
    setIsTimelineModalOpen(false);
    setTimelineData([]);
    setTimelineHeader("");
  };

  const closePdfViewer = () => {
    setSelectedDocument(null);
    setOpenDocumentsString(null);
    setStepHistory(null);
    setHeaderName("");
    setIsPdfViewerOpen(false);
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setPdfUrl(null);
  };

  const handleEditFormChange = (field: string, value: string) => {
    hasEditFormChangedRef.current = true;
    setEditFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleEditDocumentChange = async (files: any[] | undefined) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploadingDocument(true);
    setUploadMessage(null);
    hasEditFormChangedRef.current = true;

    try {
      // Get existing document paths for comparison
      let existingDocPaths: string[] = [];
      if (editFormData?.document) {
        try {
          const parsed = JSON.parse(String(editFormData.document));
          if (Array.isArray(parsed)) {
            existingDocPaths = parsed.map((d: any) => String(d));
          } else if (parsed) {
            existingDocPaths = [String(parsed)];
          }
        } catch {
          existingDocPaths = [String(editFormData.document)];
        }
      }

      // Extract File objects and filter out duplicates (files that already exist)
      const filesToUpload = files
        .map((fileItem: any) => {
          return fileItem.file ? fileItem.file : fileItem;
        })
        .filter((file: File) => {
          // Exclude files that already exist in the documents
          return !existingDocPaths.some((docPath) =>
            docPath.includes(file.name)
          );
        });

      console.log("Files to upload:", filesToUpload);

      // Only upload if there are new files
      if (filesToUpload.length === 0) {
        setUploadMessage({ type: "error", text: "No new files to upload" });
        setIsUploadingDocument(false);
        return;
      }

      const uploadResult = await nguageStore.UploadMultipleMedia(filesToUpload);
      console.log("Upload result:", uploadResult);

      if (uploadResult) {
        setEditFormData((prev) => {
          if (!prev) return null;

          // Normalize new upload result to an array of strings
          const newDocs: string[] = Array.isArray(uploadResult)
            ? uploadResult.map((d: any) => String(d))
            : [String(uploadResult)];

          const merged = [...existingDocPaths, ...newDocs];

          return {
            ...prev,
            document: JSON.stringify(merged),
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

      // Check if current step is the final step for this item
      const stepMatch = String(editFormData.step || "").match(/\d+/);
      const currentStep = stepMatch ? parseInt(stepMatch[0], 10) : 0;
      const totalSteps = getTotalStepsForItemCode(String(editFormData.item_code || ""));

      // Add end_date as current system date
      const dataToSave = {
        ...editFormData,
        end_date: currentDate,
        wo_status: currentStep === totalSteps ? "Finished goods" : "Work in progress"
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

      // Get the new step name for the new step
      const newStepName = getStepNameForItemCodeAndStep(String(latestData.item_code), newStep);

      // Check if new step is the final step for this item
      const newStepMatch = String(newStep || "").match(/\d+/);
      const newCurrentStep = newStepMatch ? parseInt(newStepMatch[0], 10) : 0;
      const newTotalSteps = getTotalStepsForItemCode(String(latestData.item_code));

      // Prepare data with new step and current date
      const dataToSave = {
        ...latestData,
        step: newStep,
        step_name: newStepName,
        end_date: currentDate,
        wo_status: newCurrentStep === newTotalSteps ? "Finished goods" : "Work in progress"
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
    hasEditFormChangedRef.current = false;
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

  // Normalize documents prop for PDFViewerModal to a string or undefined
  const documentsProp: string | string[] | undefined = (() => {
    if (openDocumentsString) return openDocumentsString;
    if (editFormData?.document != null) return String(editFormData.document);
    if (selectedWorkOrder?.document != null) return String(selectedWorkOrder.document);
    return undefined;
  })();

  // Get all steps for the current item_code, sorted by sequence
  const availableSteps = useMemo(() => {
    if (!editFormData?.item_code) {
      return [];
    }

    // Handle both array and PaginationData formats
    const steps = Array.isArray(itemProcessSteps) ? itemProcessSteps : [];
    if (steps.length === 0) {
      return [];
    }

    // Filter steps by item_code and sort by sequence
    return steps
      .filter((step: any) =>
        String(step.item_code || "").toLowerCase() === String(editFormData.item_code || "").toLowerCase()
      )
      .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  }, [editFormData?.item_code, itemProcessSteps]);

  // Generate step options for the Step dropdown
  const stepOptions = useMemo(() => {
    if (availableSteps.length === 0) {
      // Fallback to default steps if no dynamic data available
      return [
        { label: "Step 1", value: "Step 1" },
        { label: "Step 2", value: "Step 2" },
        { label: "Step 3", value: "Step 3" },
        { label: "Step 4", value: "Step 4" },
        { label: "Step 5", value: "Step 5" },
      ];
    }

    return availableSteps.map((step: any) => ({
      label: `Step ${step.sequence}`,
      value: `Step ${step.sequence}`,
    }));
  }, [availableSteps]);

  // Create a map of item_process_id to item_process_name from itemProcesses table
  const processNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const processes = Array.isArray(itemProcesses) ? itemProcesses : [];

    processes.forEach((proc: any) => {
      if (proc.item_process_id && proc.item_process_name) {
        map.set(String(proc.item_process_id), String(proc.item_process_name));
      }
    });

    return map;
  }, [itemProcesses]);

  // Generate step name options for the Step Name dropdown
  const stepNameOptions = useMemo(() => {
    if (availableSteps.length === 0) {
      // Fallback to default step names if no dynamic data available
      return [
        { label: "Painting", value: "Painting" },
        { label: "Welding", value: "Welding" },
        { label: "Fitting", value: "Fitting" },
        { label: "Filing", value: "Filing" },
        { label: "Drilling", value: "Drilling" },
        { label: "Casting", value: "Casting" },
      ];
    }

    // Create unique step names from available steps using item_process_id lookup
    const nameSet = new Set<string>();
    availableSteps.forEach((step: any) => {
      const processId = String(step.item_process_id || "");
      const stepName = processNameMap.get(processId);

      if (stepName) {
        nameSet.add(stepName);
      }
    });

    console.log("Extracted step names from itemProcesses:", Array.from(nameSet));

    return Array.from(nameSet).map((name) => ({
      label: name,
      value: name,
    }));
  }, [availableSteps, processNameMap]);

  // Get the step name for a given step value
  const getStepNameForStep = useCallback(
    (stepValue: string): string | null => {
      if (!availableSteps || availableSteps.length === 0) {
        return null;
      }

      // Extract sequence number from step value (e.g., "Step 1" -> 1)
      const sequenceMatch = stepValue.match(/\d+/);
      if (!sequenceMatch) return null;

      const sequence = parseInt(sequenceMatch[0], 10);
      const step = availableSteps.find((s: any) => s.sequence === sequence);

      if (!step) return null;

      // Look up the item_process_name using item_process_id
      const processId = String(step.item_process_id || "");
      const stepName = processNameMap.get(processId);

      return stepName || null;
    },
    [availableSteps, processNameMap]
  );

  // Enhanced handleEditFormChange to auto-populate step_name when step changes
  const handleEditFormChangeEnhanced = useCallback(
    (field: string, value: string) => {
      handleEditFormChange(field, value);

      // Auto-populate step_name when step changes
      if (field === "step") {
        const stepName = getStepNameForStep(value);
        if (stepName) {
          handleEditFormChange("step_name", stepName);
        }
      }
    },
    [getStepNameForStep]
  );

  // Function to get step name for any item_code and step value (for drag-drop operations)
  const getStepNameForItemCodeAndStep = useCallback(
    (itemCode: string, stepValue: string): string | null => {
      if (!itemCode || !stepValue) {
        return null;
      }

      // Extract sequence number from step value (e.g., "Step 1" -> 1)
      const sequenceMatch = stepValue.match(/\d+/);
      if (!sequenceMatch) return null;

      const sequence = parseInt(sequenceMatch[0], 10);

      // Filter steps by item_code and find the matching sequence
      const steps = Array.isArray(itemProcessSteps) ? itemProcessSteps : [];
      const matchingStep = steps.find((step: any) =>
        String(step.item_code || "").toLowerCase() === String(itemCode || "").toLowerCase() &&
        step.sequence === sequence
      );

      if (!matchingStep) return null;

      // Look up the step name using item_process_id
      const processId = String(matchingStep.item_process_id || "");
      return processNameMap.get(processId) || null;
    },
    [itemProcessSteps, processNameMap]
  );

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
                  placeholder="Search by PO number/Item code/Item name/Supplier"
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
                  className={`p-1.5 rounded-full transition-all ${viewMode === "kanban"
                    ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                    }`}
                  title="Kanban view"
                >
                  <MdViewAgenda className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-full transition-all ${viewMode === "table"
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1.4fr 0.7fr 1.1fr 0.6fr 1.2fr 0.9fr 0.6fr 100px', gap: '0', minWidth: '100%' }}>
                {/* Table Header */}
                {tableColumns.map((column) => (
                  <div
                    key={column.key}
                    className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 border-r border-blue-800 dark:border-blue-800"
                  >
                    {column.label}
                  </div>
                ))}
                {/* Actions Header (combined Details + Timeline + Actions) */}
                <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 border-r border-blue-800 dark:border-blue-800">
                  Actions
                </div>
              </div>

              {/* Table Body */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1.4fr 0.7fr 1.1fr 0.6fr 1.2fr 0.9fr 0.6fr 100px', gap: '0', minWidth: '100%' }}>
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
                        // Render Badge for step field with color mapping
                        else if (column.key === "step") {
                          const stepValue = String(value || "");
                          const stepColors: Record<string, "blue" | "purple" | "pink" | "orange" | "green"> = {
                            "Step 1": "blue",
                            "Step 2": "purple",
                            "Step 3": "pink",
                            "Step 4": "orange",
                            "Step 5": "green",
                          };
                          const stepColor = stepColors[stepValue] || "blue";
                          cellContent = (
                            <Badge color={stepColor} variant="light">
                              {value || "-"}
                            </Badge>
                          );
                        }
                        // Render Badge for wo_status field
                        else if (column.key === "wo_status") {
                          const statusValue = String(value).toLowerCase();
                          let statusColor: "blue" | "orange" | "green" | "warning" | "purple" | "info" = "orange";

                          if (statusValue.includes("work in progress")) {
                            statusColor = "warning";
                          } else if (statusValue.includes("in warehouse")) {
                            statusColor = "info";
                          } else if (statusValue.includes("ready to ship")) {
                            statusColor = "purple";
                          } else if (statusValue.includes("delivered")) {
                            statusColor = "green";
                          } else if (statusValue.includes("in transit")) {
                            statusColor = "orange";
                          } else if (statusValue.includes("finished goods")) {
                            statusColor = "blue";
                          }

                          cellContent = (
                            <Badge color={statusColor} variant="solid">
                              {value || "-"}
                            </Badge>
                          );
                        }
                        // Render document icon
                        else if (column.key === "document") {
                          const workOrderId = `${item.po_number}${item.item_code}`;
                          cellContent = value ? (
                            <button
                              onClick={() => handleViewDocument(value as string, item.step_history as string | null, workOrderId)}
                              className="cursor-pointer hover:opacity-75 transition-opacity"
                              title="View document"
                            >
                              <AiOutlineEye className="ml-3.5 w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </button>
                          ) : (
                            <AiOutlineEyeInvisible className="ml-3.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
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
                      {/* Combined Actions Cell: Details, Timeline, Edit */}
                      <div className="px-2.5 py-2 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                        <div className="flex items-center justify-start gap-1">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="text-green-600 dark:text-green-400 transition-colors p-1 rounded"
                            title="View Details"
                          >
                            <MdOpenInNew className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleViewTimeline(item.step_history as string | null, `${item.po_number}${item.item_code}`)}
                            disabled={!item.step_history}
                            className={`p-1 rounded transition-colors ${item.step_history
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-gray-400 dark:text-gray-500 opacity-50 cursor-not-allowed"
                              }`}
                            title={item.step_history ? "View Timeline" : "No timeline data"}
                          >
                            <MdDateRange className="w-4 h-4" />
                          </button>

                          {user?.roleId !== 5 && !["delivered", "ready to ship", "in transit"].includes(String(item.wo_status || "").toLowerCase()) && (
                            <button
                              onClick={() => handleEditRow(item)}
                              className="text-blue-600 dark:text-blue-400 transition-colors p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              title="Edit"
                            >
                              <MdEdit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
      {isPdfViewerOpen && (
        <PDFViewerModal
          documents={documentsProp}
          pdfUrl={pdfUrl}
          loadingPdf={loadingPdf}
          pdfError={pdfError}
          onClose={closePdfViewer}
          onRetry={(doc: string) => setSelectedDocument(doc)}
          onDocumentSelect={(doc: string) => setSelectedDocument(doc)}
          stepHistory={stepHistory}
          headerName={headerName}
        />
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
                  } else if (key === "document") {
                    if (!value) {
                      displayValue = "-";
                    } else {
                      try {
                        const parsed = JSON.parse(String(value));
                        if (Array.isArray(parsed)) {
                          displayValue = parsed
                            .map((f: string) => (f ? f.split("/").pop() : ""))
                            .filter(Boolean)
                            .join(", ");
                        } else {
                          const s = String(parsed);
                          displayValue = s.split("/").pop() || s;
                        }
                      } catch {
                        const s = String(value);
                        if (s.includes(",")) {
                          displayValue = s
                            .split(",")
                            .map((p) => p.trim())
                            .map((f) => (f ? f.split("/").pop() : ""))
                            .filter(Boolean)
                            .join(", ");
                        } else {
                          displayValue = s.split("/").pop() || s;
                        }
                      }
                    }
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
                      <TextInput
                        label={label}
                        type="text"
                        disabled
                        value={displayValue}
                        onValueChange={() => { }}
                      />
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
                  <TextInput
                    label="Work Order ID"
                    type="text"
                    disabled
                    value={String(selectedWorkOrder.workOrderId || selectedWorkOrder[Object.keys(selectedWorkOrder).find(k => k.startsWith("{")) || ""] || "-")}
                    onValueChange={() => { }}
                  />
                </div>

                {/* Item Code - Disabled */}
                <div>
                  <TextInput
                    label="Item Code"
                    type="text"
                    disabled
                    value={String(editFormData.item_code || "-")}
                    onValueChange={() => { }}
                  />
                </div>

                {/* Item - Disabled */}
                <div>
                  <TextInput
                    label="Item Name"
                    type="text"
                    disabled
                    value={String(editFormData.item || "-")}
                    onValueChange={() => { }}
                  />
                </div>

                {/* Supplier Name - Disabled */}
                <div>
                  <TextInput
                    label="Supplier Name"
                    type="text"
                    disabled
                    value={String(editFormData.supplier_name || "-")}
                    onValueChange={() => { }}
                  />
                </div>

                {/* PO Number - Disabled */}
                <div>
                  <TextInput
                    label="PO Number"
                    type="text"
                    disabled
                    value={String(editFormData.po_number || "-")}
                    onValueChange={() => { }}
                  />
                </div>

                {/* Start Date - Disabled */}
                <div>
                  <TextInput
                    label="Start Date"
                    type="text"
                    disabled
                    value={formatDate(String(editFormData.start_date || ""))}
                    onValueChange={() => { }}
                  />
                </div>

                {/* End Date - Disabled */}
                <div>
                  <TextInput
                    label="End Date"
                    type="text"
                    disabled
                    value={formatDate(String(editFormData.end_date || ""))}
                    onValueChange={() => { }}
                  />
                </div>

                {/* Step - Editable Dropdown */}
                <div>
                  <Select
                    label="Step"
                    value={String(editFormData.step || "")}
                    onChange={(v) => handleEditFormChangeEnhanced("step", v ?? "")}
                    data={stepOptions}
                  />
                </div>

                {/* Step Name - Editable Dropdown */}
                <div>
                  <Select
                    label="Step Name"
                    value={String(editFormData.step_name || "")}
                    onChange={(v) => handleEditFormChange("step_name", v ?? "")}
                    data={stepNameOptions}
                    disabled
                  />
                </div>

                {/* WO Status - Disabled (Auto-calculated) */}
                <div>
                  <TextInput
                    label="WO Status"
                    type="text"
                    disabled
                    value={String(editFormData.wo_status || "-")}
                    onValueChange={() => { }}
                  />
                </div>

                {/* Document - File Upload */}
                <div>
                  <MultiFileInput
                    label="Document"
                    maxFiles={5}
                    accept=".pdf"
                    multiple={true}
                    className="w-full"
                    onValueChange={handleEditDocumentChange}
                    error={uploadMessage?.type === "error" ? uploadMessage.text : undefined}
                  />
                  {uploadMessage && uploadMessage.type === "success" && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                      <p className="font-semibold">✓ {uploadMessage.text}</p>
                      {editFormData.document && (
                        <p className="text-xs text-green-600 dark:text-gray-400 mt-1">
                          <span className="text-blue-600 dark:text-blue-400">Current:</span> {(() => {
                            try {
                              const parsed = JSON.parse(editFormData.document as string);
                              if (Array.isArray(parsed)) {
                                return parsed
                                  .map((f: string) => (f ? f.split("/").pop() : ""))
                                  .filter(Boolean)
                                  .join(", ");
                              }
                              return String(parsed).split("/").pop() || String(parsed);
                            } catch {
                              return String(editFormData.document);
                            }
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Remarks - Textarea (Full Width) */}
                <div>
                  <TextInput
                    label="Remarks"
                    type="text"
                    placeholder="Enter any remarks here..."
                    value={String(editFormData.remarks || "")}
                    onValueChange={(value) => handleEditFormChange("remarks", value)}
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
                disabled={isSavingWorkOrder || isUploadingDocument}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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

      {/* Timeline Modal */}
      {isTimelineModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800">
            {/* Modal Header with Gradient */}
            <div className="relative px-5 py-2 border-b border-gray-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-800/20 backdrop-blur-sm">
                    <MdDateRange className="w-6 h-6 text-blue-800" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Step History Timeline
                    </h2>
                    <p className="text-sm text-blue-800 mt-0.5">
                      Work Order: {timelineHeader}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeTimelineModal}
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-800 transition-all duration-200"
                  title="Close"
                >
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800/50">
              {timelineData.length > 0 ? (
                <TimelineLayout
                  items={timelineData}
                  size="lg"
                  iconColor="primary"
                  customIcon={<MdDateRange className="w-5 h-5" />}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400">
                  <MdDateRange className="w-12 h-12 mb-2 opacity-50" />
                  <p>No timeline data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
});