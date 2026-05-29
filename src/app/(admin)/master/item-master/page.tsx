"use client";

import PDFViewerModal from "@/components/common/PDFViewerModal";
import { TextInput } from "@/components/ui/infoveave-components/TextInput";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { QueryKeys } from "@/types/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { MdClose } from "react-icons/md";
import { toast } from "react-toastify";

const HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId", "long_description", "short_description"];

// Helper function to get column width class based on column name
const getColumnWidthClass = (col: string): string => {
  switch (col) {
    case "item_code":
      return "w-[100px] min-w-[100px] max-w-[100px]";
    case "item_name":
      return "w-[200px] min-w-[200px] max-w-[200px]";
    case "item_description":
      return "min-w-0 w-auto";
    case "unit_price":
      return "w-[100px] min-w-[100px] max-w-[100px]";
    case "item_category":
      return "w-[140px] min-w-[140px] max-w-[140px]";
    case "sub_category":
      return "w-[250px] min-w-[250px] max-w-[250px]";
    default:
      return "min-w-[100px]";
  }
};

// Helper function to format column header text
const formatColumnName = (col: string): string => {
  return col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

// Helper to render sub_category nicely
const formatSubCategory = (value: string): string => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    // not JSON
  }
  return value;
};

export default observer(function ItemMasterPage() {
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [openDocumentsString, setOpenDocumentsString] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [stepHistory, setStepHistory] = useState<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  // Modal states for Add Item
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemModalLoading, setAddItemModalLoading] = useState(false);

  const [formData, setFormData] = useState({
    itemCode: "",
    itemName: "",
    unitPrice: 0,
    description: "",
    itemCategory: "",
    subCategory: [] as string[],
    remarks: "",
  });

  const { data: authToken = null } = useQuery({
    queryKey: [QueryKeys.AuthToken],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: [QueryKeys.ItemMaster, authToken],
    queryFn: async (): Promise<RowData[]> => {
      const paginationData = await nguageStore.GetPaginationData({
        table: "item_master",
        skip: 0,
        take: 100,
        NGaugeId: "63",
      });
      const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
      return (result as RowData[]) || [];
    },
    enabled: !!authToken,
    staleTime: 0,
  });

  const allColumns = items && items.length > 0 ? Object.keys(items[0]) : [];
  const columns = useMemo(
    () => allColumns.filter((col) => !HIDDEN_COLUMNS.includes(col)),
    [allColumns]
  );

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

  useEffect(() => {
    fetchPdf(selectedDocument);
  }, [selectedDocument, fetchPdf]);

  const handleViewDocument = (docName: string | null) => {
    if (!docName) {
      setOpenDocumentsString(null);
      setSelectedDocument(null);
      setStepHistory(null);
      return;
    }
    setOpenDocumentsString(docName);
    setStepHistory(null);
    setSelectedDocument(null);
  };

  const closePdfViewer = () => {
    setSelectedDocument(null);
    setOpenDocumentsString(null);
    setStepHistory(null);
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setPdfUrl(null);
  };

  const openAddItemModal = () => {
    setShowAddItemModal(true);
  };

  const closeAddItemModal = () => {
    setFormData({
      itemCode: "",
      itemName: "",
      unitPrice: 0,
      description: "",
      itemCategory: "",
      subCategory: [],
      remarks: "",
    });
    setShowAddItemModal(false);
  };

  const handleSubmitAddItemMaster = async () => {
    const requiredFields = ['itemName', 'unitPrice', 'description', 'itemCategory', 'subCategory'];
    const missingFields = requiredFields.filter((field) => {
      const value = formData[field as keyof typeof formData];
      if (Array.isArray(value)) return value.length === 0;
      return !value;
    });

    if (missingFields.length > 0) {
      const labelMap: Record<string, string> = {
        itemName: 'Item Name',
        unitPrice: 'Unit Price',
        description: 'Item Description',
        itemCategory: 'Item Category',
        subCategory: 'Sub Category',
      };
      const readable = missingFields.map((f) => labelMap[f] || f).join(', ');
      toast.error(`Please fill in required fields: ${readable}`);
      return;
    }

    setAddItemModalLoading(true);

    try {
      const newItem = {
        item_code: formData.itemCode,
        item_name: formData.itemName,
        item_description: formData.description,
        short_description: formData.description,
        long_description: formData.description,
        unit_price: formData.unitPrice,
        item_category: formData.itemCategory,
        sub_category: JSON.stringify(formData.subCategory),
        remarks: formData.remarks || null,
      };

      const result = await nguageStore.AddRowData(newItem, 63, "item_master");

      if (result?.result) {
        toast.success("Item added successfully!");
        await queryClient.invalidateQueries({
          queryKey: [QueryKeys.ItemMaster],
        });
        closeAddItemModal();
      } else {
        throw new Error(result?.error || "Failed to add item");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add item";
      toast.error(errorMessage);
    } finally {
      setAddItemModalLoading(false);
    }
  };

  const documentsProp: string | string[] | undefined = openDocumentsString || undefined;

  return (
    <div>
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-3">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Item Master List</h2>
            <button
              onClick={openAddItemModal}
              className="px-4 py-2 bg-blue-800 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-error-600 dark:text-error-400">Failed to fetch item master data</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No item records found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3">
              <div className="w-full">
                <table className="w-full table-fixed border-collapse">
                  <thead className="block pr-4 bg-blue-800 dark:bg-blue-700">
                    <tr className="table w-full table-fixed border-b border-blue-900 bg-blue-800 dark:bg-blue-700">
                      {columns.map((col) => {
                        const base =
                          "px-2 py-2 text-left font-medium text-white text-xs uppercase tracking-wide sticky top-0 z-10";
                        const widthClass = getColumnWidthClass(col);
                        return (
                          <th key={col} className={`${base} ${widthClass}`}>
                            {formatColumnName(col)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="block overflow-y-auto" style={{ maxHeight: "calc(100vh - 250px)" }}>
                    {items.map((row, idx) => (
                      <tr
                        key={(row as any).ROWID || idx}
                        className="table w-full table-fixed border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                      >
                        {columns.map((col) => {
                          const tdBase =
                            "px-2 py-2 text-gray-600 dark:text-gray-400 text-sm align-top";
                          const widthClass = getColumnWidthClass(col);
                          const value = (row as any)[col];

                          // Document column
                          if (col.toLowerCase().includes("document")) {
                            return (
                              <td key={col} className={`${tdBase} ${widthClass}`}>
                                {value ? (
                                  <button
                                    onClick={() => handleViewDocument(String(value))}
                                    className="cursor-pointer hover:opacity-75 transition-opacity"
                                    title="View document"
                                  >
                                    <AiOutlineEye className="ml-6 w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  </button>
                                ) : (
                                  <AiOutlineEyeInvisible className="ml-6 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                )}
                              </td>
                            );
                          }

                          // unit_price — format as currency
                          if (col === "unit_price") {
                            return (
                              <td key={col} className={`${tdBase} ${widthClass}`}>
                                {value != null ? `$${Number(value).toFixed(2)}` : "-"}
                              </td>
                            );
                          }

                          // sub_category — parse JSON array
                          if (col === "sub_category") {
                            return (
                              <td key={col} className={`${tdBase} ${widthClass}`}>
                                <span className="line-clamp-2">
                                  {value ? formatSubCategory(String(value)) : "-"}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={col} className={`${tdBase} ${widthClass}`}>
                              <span className={col === "item_description" ? "line-clamp-2" : ""}>
                                {String(value ?? "-")}
                              </span>
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
        headerName=""
      />

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-1/2 max-h-5/6 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Item</h2>
              <button
                onClick={closeAddItemModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label={<>Item Code <span className="text-red-500">*</span></>}
                  type="text"
                  value={formData.itemCode}
                  placeholder="TY-****"
                  onValueChange={(v) => setFormData({ ...formData, itemCode: v ?? "" })}
                />

                <TextInput
                  label={<>Item Name <span className="text-red-500">*</span></>}
                  type="text"
                  value={formData.itemName}
                  placeholder="Enter item name"
                  onValueChange={(v) => setFormData({ ...formData, itemName: v ?? "" })}
                />

                <TextInput
                  label={<>Item Description <span className="text-red-500">*</span></>}
                  type="text"
                  value={formData.description}
                  placeholder="Enter item description"
                  onValueChange={(v) => setFormData({ ...formData, description: v ?? "" })}
                />

                <TextInput
                  label={<>Unit Price <span className="text-red-500">*</span></>}
                  type="number"
                  value={String(formData.unitPrice || "")}
                  placeholder="Enter unit price"
                  onValueChange={(v) => setFormData({ ...formData, unitPrice: parseFloat(v ?? "0") || 0 })}
                />

                <TextInput
                  label={<>Item Category <span className="text-red-500">*</span></>}
                  type="text"
                  value={formData.itemCategory}
                  placeholder="Enter item category"
                  onValueChange={(v) => setFormData({ ...formData, itemCategory: v ?? "" })}
                />

                <TextInput
                  label={<>Sub Category <span className="text-red-500">*</span></>}
                  type="text"
                  value={formData.subCategory.join(", ")}
                  placeholder="e.g. Teddy Bears, Dragon Toys"
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      subCategory: (v ?? "").split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />

                <TextInput
                  label="Remarks"
                  type="text"
                  value={formData.remarks}
                  onValueChange={(v) => setFormData({ ...formData, remarks: v ?? "" })}
                  placeholder="Add any remarks (optional)"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
              <button
                onClick={closeAddItemModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddItemMaster}
                disabled={addItemModalLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-60 text-white font-medium rounded-lg transition-colors flex items-center gap-2 justify-center"
              >
                {addItemModalLoading ? (
                  <>
                    <div className="animate-spin">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                    Adding...
                  </>
                ) : (
                  "Add Item"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});