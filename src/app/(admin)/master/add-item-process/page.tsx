"use client";

import PDFViewerModal from "@/components/common/PDFViewerModal";
import { MultiFileInput } from "@/components/ui/infoveave-components/MultiFileInput";
import { TextInput } from "@/components/ui/infoveave-components/TextInput";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { MdClose } from "react-icons/md";
import { toast } from "react-toastify";

const HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId"];

// Helper function to get column width class based on index
const getColumnWidthClass = (index: number): string => {
  switch (index) {
    case 0:
      return "w-[150px] min-w-[150px] max-w-[150px]";
    case 1:
      return "w-[200px] min-w-[200px] max-w-[200px]";
    case 2:
      return "min-w-0 w-auto";
    case 3:
      return "w-[100px] min-w-[100px] max-w-[100px]";
    case 4:
      return "w-[200px] min-w-[200px] max-w-[200px]";
    default:
      return "min-w-[100px]";
  }
};

// Helper function to format column header text
const formatColumnName = (col: string): string => {
  return col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export default observer(function AddItemProcessPage() {
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [openDocumentsString, setOpenDocumentsString] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [stepHistory, setStepHistory] = useState<string | null>(null);
  const [headerName, setHeaderName] = useState<string>("");
  const previousUrlRef = useRef<string | null>(null);

  // Modal states for Add Item Process
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemModalLoading, setAddItemModalLoading] = useState(false);
  const [addItemModalError, setAddItemModalError] = useState<string | null>(null);
  const [addItemProcessName, setAddItemProcessName] = useState<string>("");
  const [addItemProcessDescription, setAddItemProcessDescription] = useState<string>("");
  const [addItemProcessRemarks, setAddItemProcessRemarks] = useState<string>("");
  const [addItemProcessDocuments, setAddItemProcessDocuments] = useState<string[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["itemProcess", authToken],
    queryFn: async (): Promise<RowData[]> => {
      const paginationData = await nguageStore.GetPaginationData({
        table: "item_process",
        skip: 0,
        take: null,
        NGaugeId: "58",
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

  // Handle PDF fetching when document selection changes
  useEffect(() => {
    fetchPdf(selectedDocument);
  }, [selectedDocument, fetchPdf]);

  // Handle viewing document
  const handleViewDocument = (docName: string | null) => {
    if (!docName) {
      setOpenDocumentsString(null);
      setSelectedDocument(null);
      setStepHistory(null);
      setHeaderName("");
      return;
    }
    setOpenDocumentsString(docName);
    setStepHistory(null);
    setHeaderName("");
    setSelectedDocument(null);
  };

  // Close PDF viewer
  const closePdfViewer = () => {
    setSelectedDocument(null);
    setOpenDocumentsString(null);
    setStepHistory(null);
    setHeaderName("");
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }
    setPdfUrl(null);
  };

  // Open Add Item Process Modal
  const openAddItemModal = () => {
    setAddItemModalError(null);
    setAddItemProcessName("");
    setAddItemProcessDescription("");
    setAddItemProcessRemarks("");
    setAddItemProcessDocuments([]);
    setUploadMessage(null);
    setShowAddItemModal(true);
  };

  // Close Add Item Process Modal
  const closeAddItemModal = () => {
    setShowAddItemModal(false);
    setAddItemModalError(null);
    setAddItemProcessName("");
    setAddItemProcessDescription("");
    setAddItemProcessRemarks("");
    setAddItemProcessDocuments([]);
    setUploadMessage(null);
    setIsUploadingDocument(false);
  };

  // Handle document upload
  const handleDocumentUpload = async (files: any[] | undefined) => {
    if (!files || files.length === 0) return;

    setIsUploadingDocument(true);
    setUploadMessage(null);

    try {
      // Normalize incoming values to File objects (some components pass { file } wrappers)
      const filesToUpload: File[] = files
        .map((fileItem: any) => (fileItem?.file ? fileItem.file : fileItem))
        .filter((file: File) => file instanceof File);

      if (filesToUpload.length === 0) {
        setUploadMessage({ type: "error", text: "No valid files selected" });
        return;
      }

      const uploadResult = await nguageStore.UploadMultipleMedia(filesToUpload);
      console.log("Upload result:", uploadResult);

      if (uploadResult && Array.isArray(uploadResult) && uploadResult.length > 0) {
        const uploadedPaths = uploadResult.filter((path) => path);
        setAddItemProcessDocuments(uploadedPaths);
        setUploadMessage({
          type: "success",
          text: `Successfully uploaded ${uploadedPaths.length} file(s)`,
        });
      } else {
        setUploadMessage({ type: "error", text: "Upload failed. Please try again." });
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploadMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to upload files",
      });
    } finally {
      setIsUploadingDocument(false);
    }
  };

  // Handle submit Add Item Process
  const handleSubmitAddItemProcess = async () => {
    if (!addItemProcessName.trim()) {
      setAddItemModalError("Item Process Name is required");
      return;
    }

    if (!addItemProcessDescription.trim()) {
      setAddItemModalError("Item Process Description is required");
      return;
    }

    setAddItemModalLoading(true);

    try {
      // Prepare data for submission
      const newItemProcess = {
        item_process_name: addItemProcessName,
        item_process_description: addItemProcessDescription,
        remarks: addItemProcessRemarks,
        document: addItemProcessDocuments.length > 0 ? addItemProcessDocuments[0] : null,
      };

      // Call the store method to add new item process
      const result = await nguageStore.AddRowData(newItemProcess, 58, "item_process");

      if (result?.result) {
        toast.success("Item Process added successfully!");
        // Invalidate the itemProcess query to refresh the data
        await queryClient.invalidateQueries({
          queryKey: ["itemProcess"],
        });
        closeAddItemModal();
      } else {
        throw new Error(result?.error || "Failed to add item process");
      }
    } catch (error) {
      console.error("Error adding item process:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add item process";
      setAddItemModalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setAddItemModalLoading(false);
    }
  };

  // Normalize documents prop for PDFViewerModal
  const documentsProp: string | string[] | undefined = openDocumentsString || undefined;

  return (
    <div>
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-3">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Item Process List</h2>
            <button
              onClick={openAddItemModal}
              className="px-4 py-2 bg-blue-800 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              Add Item Process
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
              <p className="text-error-600 dark:text-error-400">Failed to fetch item process data</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No item process records found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3">
              <div className="w-full">
                <table className="w-full table-fixed border-collapse">
                  <thead className="block pr-4 bg-blue-800 dark:bg-blue-700">
                    <tr className="table w-full table-fixed border-b border-blue-900 bg-blue-800 dark:bg-blue-700">
                      {columns.map((col, idx) => {
                        const base = "px-2 py-2 text-left font-medium text-white text-xs uppercase tracking-wide sticky top-0 z-10";
                        const widthClass = getColumnWidthClass(idx);

                        return (
                          <th key={col} className={`${base} ${widthClass}`}>
                            {formatColumnName(col)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="block max-h-[64vh] overflow-y-auto">
                    {items.map((row, idx) => (
                      <tr
                        key={row.ROWID || idx}
                        className="table w-full table-fixed border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                      >
                        {columns.map((col, cidx) => {
                          const tdBase = "px-2 py-2 text-gray-600 dark:text-gray-400 text-sm align-top";
                          const widthClass = getColumnWidthClass(cidx);
                          const value = (row as any)[col];

                          // Check if it's a document field
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

                          return (
                            <td key={col} className={`${tdBase} ${widthClass}`}>
                              {String(value ?? "-")}
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
        headerName={headerName}
      />

      {/* Add Item Process Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-1/2 max-h-5/6 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Item Process
              </h2>
              <button
                onClick={closeAddItemModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {addItemModalError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-error-600 dark:text-error-400">
                    {addItemModalError}
                  </p>
                </div>
              )}

              {uploadMessage && (
                <div className={`mb-4 p-4 rounded-lg border ${uploadMessage.type === "success"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}>
                  <p className={uploadMessage.type === "success" ? "text-green-600 dark:text-green-400" : "text-error-600 dark:text-error-400"}>
                    {uploadMessage.text}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Item Process ID - Disabled */}
                <TextInput
                  label="Item Process ID"
                  type="text"
                  value="Auto Generated"
                  disabled={true}
                  placeholder="Auto generated"
                  onValueChange={() => { }}
                />

                {/* Item Process Name */}
                <TextInput
                  label="Item Process Name"
                  type="text"
                  value={addItemProcessName}
                  onValueChange={(v) => setAddItemProcessName(v ?? "")}
                  placeholder="Enter item process name"
                />

                <TextInput
                  label="Item Process Description"
                  type="text"
                  value={addItemProcessDescription}
                  onValueChange={(v) => setAddItemProcessDescription(v ?? "")}
                  placeholder="Enter detailed description"
                />

                <MultiFileInput
                  label="Document"
                  onValueChange={handleDocumentUpload}
                />

                <TextInput
                  label="Remarks"
                  type="text"
                  value={addItemProcessRemarks}
                  onValueChange={(v) => setAddItemProcessRemarks(v ?? "")}
                  placeholder="Add any remarks (optional)"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
              <button
                onClick={closeAddItemModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddItemProcess}
                disabled={addItemModalLoading || isUploadingDocument}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2 justify-center"
              >
                {addItemModalLoading ? (
                  <>
                    <div className="animate-spin">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                    Adding...
                  </>
                ) : (
                  "Add Item Process"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
