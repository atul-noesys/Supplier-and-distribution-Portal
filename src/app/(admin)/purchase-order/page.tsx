"use client";

import PDFViewerModal from "@/components/common/PDFViewerModal";
import AddPOModal from "@/components/modals/AddPOModal";
import Badge from "@/components/ui/badge/Badge";
import { useTranslation } from "@/i18n";
import { useStore } from "@/store/store-context";
import { QueryKeys } from "@/types/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { observer } from "mobx-react-lite";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AiOutlineCheck, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdArrowDropDown, MdClose, MdEdit } from "react-icons/md";
import { toast } from "react-toastify";

interface PurchaseOrder {
  po_number: string;
  po_issue_date: string;
  po_status: "Pending" | "Shipped" | "Production" | "Completed";
  supplier_id: string;
  supplier_name?: string;
  InfoveaveBatchId: number;
  ROWID: number;
  document?: string | null;
  remarks?: string | null;
  step_history?: string | null;
}

interface PurchaseOrderItem {
  po_number: string;
  item_code: string;
  item: string;
  unit_price: number;
  quantity: number;
  status: string;
  step_name: string;
  document: string;
  work_order_created: string;
  InfoveaveBatchId: number;
  ROWID: number;
  total?: number;
  po_status?: string;
  supplier_id?: string;
  remarks?: string;
  supplier_name?: string;
  step_history?: string | null;
  [key: string]: any;
}

const getStatusColor = (
  status: "Pending" | "Shipped" | "Production" | "Completed" | "pending" | "approved" | "delivered" | "cancelled",
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case "completed":
    case "delivered":
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "shipped":
    case "production":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "primary";
  }
};

export default observer(function PurchaseOrderPage() {
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddPOModalOpen, setIsAddPOModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [loadingItemROWID, setLoadingItemROWID] = useState<number | null>(null);
  const [loadingPONumber, setLoadingPONumber] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [relatedDocuments, setRelatedDocuments] = useState<string[]>([]);
  const [openDocumentsString, setOpenDocumentsString] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [stepHistory, setStepHistory] = useState<string | null>(null);
  const [headerName, setHeaderName] = useState<string>("");
  const previousUrlRef = useRef<string | null>(null);

  // Fetch auth token - refresh on component mount
  const { data: authToken = null } = useQuery({
    queryKey: [QueryKeys.AuthToken],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

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

  // Handle viewing document (normalize like work-order page)
  const handleViewDocument = (docName: string | null, docs?: string[], stepHist?: string | null, header?: string) => {
    if (!docName) {
      setOpenDocumentsString(null);
      setSelectedDocument(null);
      setStepHistory(null);
      setHeaderName("");
      return;
    }
    if (docs && docs.length > 0) {
      // pass the docs array as a JSON string so modal will normalize
      setOpenDocumentsString(JSON.stringify(docs));
    } else {
      setOpenDocumentsString(docName);
    }
    setStepHistory(stepHist || null);
    setHeaderName(header || "");
    // modal will call back with single filename when selected
    setSelectedDocument(null);
  };

  // Close PDF viewer
  const closePdfViewer = () => {
    setSelectedDocument(null);
    setOpenDocumentsString(null);
    setRelatedDocuments([]);
    setStepHistory(null);
    setHeaderName("");
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setPdfUrl(null);
  };

  // Normalize documents prop for PDFViewerModal to a string or undefined
  const documentsProp: string | string[] | undefined = (() => {
    if (openDocumentsString) return openDocumentsString;
    if (relatedDocuments && relatedDocuments.length > 0) return relatedDocuments;
    return undefined;
  })();

  // Get the current user from the store
  const user = nguageStore.currentUser;

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading, error } = useQuery({
    queryKey: ["purchaseOrders", authToken],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const purchaseOrderList = await nguageStore.GetPaginationData({
        table: "purchase_orders",
        skip: 0,
        take: 200,
        NGaugeId: "41",
      });
      return (purchaseOrderList || []) as PurchaseOrder[];
    },
    staleTime: 0,
    enabled: !!authToken,
  });

  // Fetch PO items
  const { data: poItems = [] } = useQuery({
    queryKey: ["poItems", authToken],
    queryFn: async (): Promise<PurchaseOrderItem[]> => {
      const response = await axios.post(
        "/api/GetPOItems",
        {
          table: "PurchaseOrder",
          skip: 0,
          take: null,
          NGaugeId: undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        },
      );
      return (response.data.data || []).map((item: Record<string, unknown>) => {
        // Find the calculated total field from the API response
        const totalKey = Object.keys(item).find(
          (key) => key.includes("@unit_price * @quantity") || key.includes("expression")
        );
        const total = totalKey ? (item[totalKey] as number) : (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);

        return {
          po_number: item.po_number as string,
          item_code: item.item_code as string,
          item: item.item as string,
          unit_price: Number(item.unit_price) || 0,
          quantity: Number(item.quantity) || 0,
          status: item.status as string,
          step_name: item.step_name as string,
          document: (item.document as string) || null,
          work_order_created: (item.work_order_created as string) || null,
          supplier_name: (item.supplier_name as string) || null,
          step_history: (item.step_history as string) || null,
          InfoveaveBatchId: item.InfoveaveBatchId as number,
          ROWID: item.ROWID as number,
          total: total,
        };
      });
    },
    staleTime: 0,
    gcTime: 0,
    enabled: !!authToken,
  });

  // Fetch item process data
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

  // Fetch item process steps data
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

  // Create a map of item_process_id to item_process_name
  const processNameMap = useRef(new Map<string, string>()).current;
  useEffect(() => {
    const processes = Array.isArray(itemProcesses) ? itemProcesses : [];
    processes.forEach((proc: any) => {
      if (proc.item_process_id && proc.item_process_name) {
        processNameMap.set(String(proc.item_process_id), String(proc.item_process_name));
      }
    });
  }, [itemProcesses, processNameMap]);

  // Function to get step name for a given item_code and sequence
  const getStepNameForItemCode = useCallback(
    (itemCode: string, sequence: number = 1): string | null => {
      const steps = Array.isArray(itemProcessSteps) ? itemProcessSteps : [];
      
      const matchingStep = steps.find((step: any) =>
        String(step.item_code || "").toLowerCase() === String(itemCode || "").toLowerCase() &&
        step.sequence === sequence
      );

      if (!matchingStep) return null;

      const processId = String(matchingStep.item_process_id || "");
      return processNameMap.get(processId) || null;
    },
    [itemProcessSteps, processNameMap]
  );

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

  const formatNumber = (num: number) => {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Filter items based on search term
  const filteredPoItems = searchTerm.trim() === ""
    ? poItems
    : poItems.filter((item) =>
      (item.item && item.item.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.supplier_name && item.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.po_number && item.po_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const itemsByPO = filteredPoItems.reduce(
    (acc, item) => {
      if (!acc[item.po_number]) {
        acc[item.po_number] = [];
      }
      acc[item.po_number].push(item);
      return acc;
    },
    {} as Record<string, PurchaseOrderItem[]>,
  );

  // Auto-expand accordion when search term exists
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      // Expand all POs that have matching items
      const matchingPOs = new Set(filteredPoItems.map((item) => item.po_number));
      setExpandedPOs(matchingPOs);
    } else {
      // Collapse all when search is cleared
      setExpandedPOs(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const togglePO = (poNumber: string) => {
    const newExpandedPOs = new Set(expandedPOs);
    if (newExpandedPOs.has(poNumber)) {
      newExpandedPOs.delete(poNumber);
    } else {
      // If no search term, only allow one accordion open at a time
      if (searchTerm.trim() === "") {
        newExpandedPOs.clear();
      }
      newExpandedPOs.add(poNumber);
    }
    setExpandedPOs(newExpandedPOs);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    setIsAddPOModalOpen(true);
  };

  const handleCloseAddPOModal = () => {
    setIsAddPOModalOpen(false);
    setEditingPO(null);
  };

  const handleCreateWorkOrder = async (item: PurchaseOrderItem) => {
    if (!authToken) {
      toast.error("No auth token available");
      return;
    }

    setLoadingItemROWID(item.ROWID);

    try {
      // Fetch the latest row data
      const response = await axios.post(
        "/api/GetRowData",
        {
          ROWID: item.ROWID,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const latestRowData = response.data.data;

      // Update work_order_created to "Yes"
      const updatedData = {
        ...latestRowData,
        ROWID: item.ROWID,
        work_order_created: "Yes",
      };

      // Save the updated data
      await axios.put(
        "/api/EditRow",
        updatedData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const payloadForWorkOrder = {
        ...latestRowData,
        step: "Step 1",
        step_name: getStepNameForItemCode(String(item.item_code), 1),
        document: null,
        remarks: "",
        start_date: new Date().toISOString().split('T')[0],
        wo_status: "Work in progress"
      }

      // Add work order row to work_order table
      await nguageStore.AddRowData(
        payloadForWorkOrder,
        44,
        "work_order"
      );

      toast.success(
        <span>
          Work order created for <b>{item.item}</b>!
        </span>
      );

      // Refetch the updated data
      await queryClient.invalidateQueries({ queryKey: ["poItems"] });
      await queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      await queryClient.invalidateQueries({ queryKey: ["workOrderItems"] });
    } catch (error) {
      console.error("Failed to create work order:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response error details:", error.response.data);
        toast.error(`Failed to create work order: ${error.response.data?.message || "Unknown error"}`);
      } else {
        toast.error("Failed to create work order");
      }
    } finally {
      setLoadingItemROWID(null);
    }
  };

  const handleCreateMultipleWorkOrders = async (poNumber: string) => {
    if (!authToken) {
      toast.error("No auth token available");
      return;
    }

    setLoadingPONumber(poNumber);

    try {
      // Get all items for this PO that need work orders created
      const itemsToProcess = itemsByPO[poNumber]?.filter(
        (item) => item.work_order_created !== "Yes"
      ) || [];

      if (itemsToProcess.length === 0) {
        toast.info("All items in this PO already have work orders created");
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Process each item one by one
      for (const item of itemsToProcess) {
        try {
          // Fetch the latest row data
          const response = await axios.post(
            "/api/GetRowData",
            {
              ROWID: item.ROWID,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
            },
          );

          const latestRowData = response.data.data;

          // Update work_order_created to "Yes"
          const updatedData = {
            ...latestRowData,
            ROWID: item.ROWID,
            work_order_created: "Yes",
          };

          // Save the updated data
          await axios.put(
            "/api/EditRow",
            updatedData,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
              },
            },
          );

          const payloadForWorkOrder = {
            ...latestRowData,
            step: "Step 1",
            step_name: getStepNameForItemCode(String(item.item_code), 1),
            document: null,
            remarks: "",
            start_date: new Date().toISOString().split('T')[0],
            wo_status: "Work in progress"
          }

          // Add work order row to work_order table
          await nguageStore.AddRowData(
            payloadForWorkOrder,
            44,
            "work_order"
          );

          successCount++;
        } catch (itemError) {
          console.error(`Failed to create work order for item ${item.item}:`, itemError);
          failureCount++;
        }
      }

      // Show summary toast
      if (successCount > 0) {
        toast.success(
          <span>
            Created {successCount} work order{successCount !== 1 ? 's' : ''} for PO <b>{poNumber}</b>
            {failureCount > 0 ? ` (${failureCount} failed)` : ''}
          </span>
        );
      }

      if (failureCount > 0 && successCount === 0) {
        toast.error(`Failed to create work orders for PO ${poNumber}`);
      }

      // Refetch the updated data
      await queryClient.invalidateQueries({ queryKey: ["poItems"] });
      await queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      await queryClient.invalidateQueries({ queryKey: ["workOrderItems"] });
    } catch (error) {
      console.error("Failed to create work orders:", error);
      toast.error("Failed to create work orders");
    } finally {
      setLoadingPONumber(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        {/* Header with Title and Search */}
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
            <div className="flex items-center gap-3 flex-1 max-w-115">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by PO number/Item name/Supplier name"
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
              {user?.roleId === 5 && (
                <button
                  onClick={() => setIsAddPOModalOpen(true)}
                  className="px-4 py-2.25 bg-blue-800 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  + {t('purchaseOrderPage.addPO')}
                </button>
              )}
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
                Failed to fetch purchase orders
              </p>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No purchase orders found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3">
              <div className="w-full">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-blue-900 bg-blue-800 dark:bg-blue-700">
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                        PO Number
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                        Issue Date
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                        Supplier Name
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                        Document
                      </th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                        Remarks
                      </th>
                      {user?.roleId === 5 && (
                        <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide" style={{ width: '100px' }}>
                          Actions
                        </th>
                      )}
                      {user?.roleId !== 5 && (
                        <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide" style={{ width: '175px' }}>
                          WO Created
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po: PurchaseOrder) => (
                      <Fragment key={po.po_number}>
                        <tr
                          key={po.po_number}
                          className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors cursor-pointer group"
                          onClick={() => togglePO(po.po_number)}
                        >
                          <td className="pl-1 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                            <div className="flex items-center gap-1">
                              <MdArrowDropDown
                                className={`w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-transform duration-200 ${expandedPOs.has(po.po_number) ? '' : '-rotate-90'}`}
                              />
                              {searchTerm ? highlightText(po.po_number, searchTerm) : po.po_number}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                            {po.po_issue_date ? new Date(po.po_issue_date).toLocaleDateString() : ""}
                          </td>
                          <td className="px-5 py-4">
                            <Badge color={getStatusColor(po.po_status)} variant="solid">
                              {po.po_status.charAt(0).toUpperCase() + po.po_status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                            {searchTerm ? highlightText(po.supplier_name || po.supplier_id, searchTerm) : (po.supplier_name || po.supplier_id)}
                          </td>
                          <td className="pl-11 px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                            {po.document ? (
                              <button
                                onClick={() => handleViewDocument(po.document!, undefined, po.step_history as string | null, po.po_number)}
                                className="cursor-pointer hover:opacity-75 transition-opacity"
                                title="View document"
                              >
                                <AiOutlineEye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </button>
                            ) : (
                              <AiOutlineEyeInvisible className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            )}
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm truncate" title={po.remarks || "No remarks"}>
                            {po.remarks || <span className="text-gray-400 dark:text-gray-500">-</span>}
                          </td>
                          {user?.roleId === 5 && (
                            <td className="px-5 py-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPO(po);
                                }}
                                className="flex items-center justify-center w-full text-blue-600"
                                title="Edit Purchase Order"
                              >
                                <MdEdit className="w-5 h-5" />
                              </button>
                            </td>
                          )}
                          {user?.roleId !== 5 && (
                            <td className="px-5 py-4">
                              {itemsByPO[po.po_number]?.some((item) => item.work_order_created !== "Yes") ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreateMultipleWorkOrders(po.po_number);
                                  }}
                                  disabled={loadingPONumber === po.po_number}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                                  title="Create Work Orders for all items"
                                >
                                  {loadingPONumber === po.po_number ? (
                                    <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <AiOutlineCheck className="w-4 h-4" />
                                  )}
                                  Create All WO
                                </button>
                              ) : (
                                <Badge color="success" variant="solid" size="sm">
                                  All Created
                                </Badge>
                              )}
                            </td>
                          )}
                        </tr>

                        {expandedPOs.has(po.po_number) && itemsByPO[po.po_number] && itemsByPO[po.po_number].length > 0 && (
                          <>
                            <tr className="border-b border-gray-100 dark:border-white/5 bg-blue-100 dark:bg-blue-900/40">
                              <td colSpan={7} className="px-5 py-3">
                                <div className="grid gap-6" style={{ gridTemplateColumns: '1.2fr 2fr 1fr 0.6fr 1fr 1.2fr 1.2fr 1.4fr' }}>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Code</div>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Name</div>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Unit Price</div>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Qty</div>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Total</div>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Document</div>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Remarks</div>
                                  <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">WO Created</div>
                                </div>
                              </td>
                            </tr>
                            {itemsByPO[po.po_number].map((item: PurchaseOrderItem) => (
                              <tr
                                key={item.ROWID}
                                className="border-b border-gray-100 dark:border-white/5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                <td colSpan={7} className="px-5 py-4">
                                  <div className="grid gap-6 text-sm" style={{ gridTemplateColumns: '1.2fr 2fr 1fr 0.6fr 1fr 1.2fr 1.2fr 1.4fr' }}>
                                    <div className="text-gray-700 dark:text-gray-300">{item.item_code}</div>
                                    <div className="text-gray-700 dark:text-gray-300">
                                      {searchTerm ? highlightText(item.item, searchTerm) : item.item}
                                    </div>
                                    <div className="text-gray-700 dark:text-gray-300">$ {formatNumber(item.unit_price)}</div>
                                    <div className="text-gray-700 dark:text-gray-300">{item.quantity}</div>
                                    <div className="text-gray-700 dark:text-gray-300 font-semibold">$ {formatNumber(item.total || 0)}</div>
                                    <div className="pl-6 text-gray-700 dark:text-gray-300 truncate" title={item.document || "No document"}>
                                      {item.document ? (
                                        <button
                                          onClick={() => handleViewDocument(item.document!, undefined, item.step_history as string | null, item.po_number)}
                                          className="cursor-pointer hover:opacity-75 transition-opacity"
                                          title="View document"
                                        >
                                          <AiOutlineEye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </button>
                                      ) : (
                                        <AiOutlineEyeInvisible className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                      )}
                                    </div>
                                    <div className="text-gray-700 dark:text-gray-300 truncate" title={item.remarks || "No remarks"}>
                                      {item.remarks || <span className="text-gray-400 dark:text-gray-500">-</span>}
                                    </div>
                                    <div>
                                      {item.work_order_created === "Yes" ? (
                                        <Badge color="success" variant="solid" size="sm">
                                          Yes
                                        </Badge>
                                      ) : (
                                        <>
                                          {user?.roleId !== 5 ? (
                                            <button
                                              onClick={() => handleCreateWorkOrder(item)}
                                              disabled={loadingItemROWID === item.ROWID}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                                              title="Create Work Order"
                                            >
                                              {loadingItemROWID === item.ROWID ? (
                                                <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />
                                              ) : (
                                                <AiOutlineCheck className="w-4 h-4" />
                                              )}
                                              Create WO
                                            </button>
                                          ) : (
                                            <Badge color="error" variant="solid" size="sm">
                                              No
                                            </Badge>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
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

      {/* Add/Edit PO Modal */}
      <AddPOModal
        isOpen={isAddPOModalOpen}
        onClose={handleCloseAddPOModal}
        initialData={editingPO}
        onSuccess={() => {
          handleCloseAddPOModal();
          queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
          queryClient.invalidateQueries({ queryKey: ["poItems"] });
        }}
      />
    </div>
  );
});

