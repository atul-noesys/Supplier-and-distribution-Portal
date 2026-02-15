"use client";

import AddPOModal from "@/components/modals/AddPOModal";
import { PDFPreview } from "@/components/pdf-preview";
import Badge from "@/components/ui/badge/Badge";
import { useStore } from "@/store/store-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { observer } from "mobx-react-lite";
import { Fragment, useCallback, useEffect, useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineCheck } from "react-icons/ai";
import { MdArrowDropDown, MdClose } from "react-icons/md";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

interface PurchaseOrder {
  po_number: string;
  po_issue_date: string;
  po_status: "Pending" | "Shipped" | "Production" | "Completed";
  vendor_id: string;
  vendor_name?: string;
  InfoveaveBatchId: number;
  ROWID: number;
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
  vendor_id?: string;
  remarks?: string;
  vendor_name?: string;
  step_history?: string;
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
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPOModalOpen, setIsAddPOModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PurchaseOrderItem | null>(null);
  const [editFormData, setEditFormData] = useState<PurchaseOrderItem | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch auth token - refresh on component mount
  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  // Get the current user from the store
  const user = nguageStore.currentUser;

  // Save edit with token from state (same as other endpoints)
  const handleSaveEdit = async () => {
    if (!editFormData) {
      toast.error("No edit form data");
      return;
    }

    if (!authToken) {
      toast.error("No auth token available");
      return;
    }

    try {
      console.log("Sending edit data to API:", editFormData);

      const response = await axios.put(
        "/api/EditRow",
        editFormData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      console.log("Row updated successfully:", response.data);
      toast.success(
        <span>
          Purchase order item <b>{editFormData.item}</b> updated successfully!
        </span>
      );
      closeEditModal();
      // Refetch the updated data for both tables
      await queryClient.invalidateQueries({ queryKey: ["poItems"] });
      await queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    } catch (error) {
      console.error("Failed to update row:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response error details:", error.response.data);
        toast.error(`Failed to update: ${error.response.data?.message || "Unknown error"}`);
      } else {
        toast.error("Failed to update purchase order item");
      }
    }
  };

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading, error } = useQuery({
    queryKey: ["purchaseOrders", authToken],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const response = await axios.post(
        "/api/GetAllData",
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
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
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
      return (response.data.data || []).map((item: Record<string, unknown>) => ({
        po_number: item.po_number as string,
        item_code: item.item_code as string,
        item: item.item as string,
        unit_price: item.unit_price as number,
        quantity: item.quantity as number,
        status: item.status as string,
        step_name: item.step_name as string,
        document: (item.document as string) || null,
        work_order_created: (item.work_order_created as string) || null,
        vendor_name: (item.vendor_name as string) || null,
        InfoveaveBatchId: item.InfoveaveBatchId as number,
        ROWID: item.ROWID as number,
        total: (item.unit_price as number) * (item.quantity as number),
      }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken,
  });

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
        (item.vendor_name && item.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    fetchPdf(selectedDocument);
  }, [selectedDocument, fetchPdf]);

  const handleViewDocument = (docName: string) => {
    setSelectedDocument(docName);
  };

  const closePdfViewer = () => {
    setSelectedDocument(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  // Fetch detailed row data for edit modal
  const { data: editRowData, refetch: refetchEditData } = useQuery({
    queryKey: ["editRowData", selectedItem?.ROWID, authToken],
    queryFn: async () => {
      if (!selectedItem?.ROWID || !authToken) return null;
      const response = await axios.post(
        "/api/GetRowData",
        {
          ROWID: selectedItem.ROWID,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        },
      );
      return response.data.data;
    },
    enabled: !!selectedItem?.ROWID && !!authToken,
  });

  // Update edit form data with full API response when data is fetched
  useEffect(() => {
    if (editRowData) {
      setEditFormData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...editRowData,
        };
      });
    }
  }, [editRowData]);

  const openEditModal = (item: PurchaseOrderItem) => {
    setSelectedItem(item);
    setEditFormData(item);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedItem(null);
    setEditFormData(null);
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

  const handleCreateWorkOrder = async (item: PurchaseOrderItem) => {
    if (!authToken) {
      toast.error("No auth token available");
      return;
    }

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
      const saveResponse = await axios.put(
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
        step_name: null,
        document: null,
        remarks: "",
        start_date: new Date().toISOString().split('T')[0]
      }

      // Add work order row to work_order table
      await nguageStore.AddDataSourceRow(
        payloadForWorkOrder,
        44,
        "work_order"
      );

      console.log("Work order created successfully:", saveResponse.data);
      toast.success(
        <span>
          Work order created for <b>{item.item}</b>!
        </span>
      );

      // Refetch the updated data
      await queryClient.invalidateQueries({ queryKey: ["poItems"] });
      await queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    } catch (error) {
      console.error("Failed to create work order:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response error details:", error.response.data);
        toast.error(`Failed to create work order: ${error.response.data?.message || "Unknown error"}`);
      } else {
        toast.error("Failed to create work order");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        {/* Header with Title and Search */}
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
            <div className="flex items-center gap-3 flex-1 max-w-[460px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by PO number/Item name/Vendor name"
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
                  + ADD PO
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
              <div className="max-w-full overflow-x-auto">
                <table className="w-full">
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
                      Vendor Name
                    </th>
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
                          {searchTerm ? highlightText(po.vendor_name || po.vendor_id, searchTerm) : (po.vendor_name || po.vendor_id)}
                        </td>
                      </tr>

                      {expandedPOs.has(po.po_number) && itemsByPO[po.po_number] && itemsByPO[po.po_number].length > 0 && (
                        <>
                          <tr className="border-b border-gray-100 dark:border-white/5 bg-blue-100 dark:bg-blue-900/40">
                            <td colSpan={4} className="px-5 py-3">
                              <div className="grid gap-6" style={{ gridTemplateColumns: '1.2fr 2fr 1fr 0.6fr 1fr 0.8fr 1fr 0.8fr 0.9fr 0.7fr' }}>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Code</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Name</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Unit Price</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Qty</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Total</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Step</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Step Name</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Document</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">WO Created</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Action</div>
                              </div>
                            </td>
                          </tr>
                          {itemsByPO[po.po_number].map((item: PurchaseOrderItem) => (
                            <tr
                              key={item.ROWID}
                              className="border-b border-gray-100 dark:border-white/5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <td colSpan={4} className="px-5 py-4">
                                <div className="grid gap-6 text-sm" style={{ gridTemplateColumns: '1.2fr 2fr 1fr 0.6fr 1fr 0.8fr 1fr 0.8fr 0.9fr 0.7fr' }}>
                                  <div className="text-gray-700 dark:text-gray-300">{item.item_code}</div>
                                  <div className="text-gray-700 dark:text-gray-300">
                                    {searchTerm ? highlightText(item.item, searchTerm) : item.item}
                                  </div>
                                  <div className="text-gray-700 dark:text-gray-300">$ {formatNumber(item.unit_price)}</div>
                                  <div className="text-gray-700 dark:text-gray-300">{item.quantity}</div>
                                  <div className="text-gray-700 dark:text-gray-300 font-semibold">$ {formatNumber(item.total || 0)}</div>
                                  <div>
                                    <Badge color="green" variant="solid" size="sm">
                                      {item.status}
                                    </Badge>
                                  </div>
                                  <div className="text-gray-700 dark:text-gray-300">{item.step_name}</div>
                                  <div className="text-gray-700 dark:text-gray-300 ml-6">
                                    {item.document ? (
                                      <button
                                        onClick={() => handleViewDocument(item.document)}
                                        className="cursor-pointer hover:opacity-75 transition-opacity"
                                        title="View document"
                                      >
                                        <AiOutlineEye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                      </button>
                                    ) : (
                                      <AiOutlineEyeInvisible className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    )}
                                  </div>
                                  <div>
                                    {item.work_order_created === "Yes" ? (
                                      <Badge color="success" variant="solid" size="sm">
                                        Yes
                                      </Badge>
                                    ) : (
                                      <button
                                        onClick={() => handleCreateWorkOrder(item)}
                                        className="flex items-center gap-0 px-1 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                        title="Create Work Order"
                                      >
                                        <AiOutlineCheck className="w-5 h-5" />
                                        Create WO
                                      </button>
                                    )}
                                  </div>
                                  <div>
                                    <button
                                      onClick={() => openEditModal(item)}
                                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                    >
                                      Edit
                                    </button>
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

      {/* Edit Modal */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-2/3 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Purchase Order Item
              </h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editFormData ? (
                <>
                  {uploadMessage && (
                    <div
                      className={`mb-4 p-4 rounded-lg ${uploadMessage.type === "success"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                        }`}
                    >
                      {uploadMessage.text}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-6">
                {/* Item Code - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Item Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editRowData?.item_code || editFormData.item_code}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Item Description - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editRowData?.item || editFormData.item}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Unit Price - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit Price
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`$ ${formatNumber(editRowData?.unit_price || editFormData.unit_price)}`}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Quantity - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editRowData?.quantity || editFormData.quantity}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* Step - Editable Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => handleEditFormChange("status", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
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
                    value={editFormData.step_name}
                    onChange={(e) => handleEditFormChange("step_name", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a step name</option>
                    <option value="Painting">Painting</option>
                    <option value="Welding">Welding</option>
                    <option value="Fitting">Fitting</option>
                    <option value="Filing">Filing</option>
                    <option value="Drilling">Drilling</option>
                    <option value="Casting">Casting</option>
                  </select>
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
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-500 file:text-white hover:file:bg-brand-600 disabled:opacity-50"
                  />
                  {isUploadingDocument && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span>Uploading file...</span>
                    </div>
                  )}
                  {editFormData?.document && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Current: {editFormData.document}
                    </p>
                  )}
                </div>

                {/* PO Number - Disabled */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PO Number
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editRowData?.po_number || editFormData.po_number}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add PO Modal */}
      <AddPOModal
        isOpen={isAddPOModalOpen}
        onClose={() => setIsAddPOModalOpen(false)}
      />
    </div>
  );
});

