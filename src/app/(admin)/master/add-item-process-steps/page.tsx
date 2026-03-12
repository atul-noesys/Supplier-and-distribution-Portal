"use client";

import PDFViewerModal from "@/components/common/PDFViewerModal";
import { stepColors } from "@/components/kanban/KanbanColumn";
import { MultiFileInput } from "@/components/ui/infoveave-components/MultiFileInput";
import { TextInput } from "@/components/ui/infoveave-components/TextInput";
import { Select } from "@/components/ui/infoveave-components/Select";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdClose, MdCheckCircle } from "react-icons/md";
import { IoAdd } from "react-icons/io5";
import { toast } from "react-toastify";

const HIDDEN_COLUMNS = ["ROWID", "InfoveaveBatchId"];

// Helper function to get step colors by sequence
const getStepColors = (sequence: number) => {
  const stepKey = `Step ${sequence}`;
  return stepColors[stepKey] || stepColors["Step 1"];
};

// Interface for grouped item process data
interface ItemProcessGroup {
  item_code: string;
  processes: Array<{
    sequence: number;
    item_process_id: string;
    ROWID: number;
  }>;
}

// Helper function to group items by item_code
const groupItemsByCode = (items: RowData[]): ItemProcessGroup[] => {
  const grouped: Record<string, ItemProcessGroup> = {};

  items.forEach((item: any) => {
    const itemCode = item.item_code;
    if (!grouped[itemCode]) {
      grouped[itemCode] = {
        item_code: itemCode,
        processes: [],
      };
    }
    grouped[itemCode].processes.push({
      sequence: item.sequence,
      item_process_id: item.item_process_id,
      ROWID: item.ROWID,
    });
  });

  // Sort processes within each group by sequence
  Object.values(grouped).forEach((group) => {
    group.processes.sort((a, b) => a.sequence - b.sequence);
  });

  return Object.values(grouped);
};

export default observer(function AddItemProcessStepsPage() {
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

  // Modal states for Add Item Process Step
  const [showAddItemStepModal, setShowAddItemStepModal] = useState(false);
  const [addItemStepModalLoading, setAddItemStepModalLoading] = useState(false);

  // Modal states for Add Step within Item Process
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [addStepModalLoading, setAddStepModalLoading] = useState(false);
  const [selectedItemCodeForStep, setSelectedItemCodeForStep] = useState<string>("");
  const [selectedItemProcessId, setSelectedItemProcessId] = useState<string>("");
  const [selectedSequenceForStep, setSelectedSequenceForStep] = useState<string>("");

  const [addItemStepName, setAddItemStepName] = useState<string>("");
  const [addItemStepDescription, setAddItemStepDescription] = useState<string>("");
  const [addItemStepRemarks, setAddItemStepRemarks] = useState<string>("");
  const [addItemStepDocuments, setAddItemStepDocuments] = useState<string[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  const { data: itemProcessOptions = [] } = useQuery({
    queryKey: ["itemProcess", authToken],
    queryFn: async (): Promise<any[]> => {
      const paginationData = await nguageStore.GetPaginationData({
        table: "item_process",
        skip: 0,
        take: null,
        NGaugeId: "58",
      });
      const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
      return (result as any[]) || [];
    },
    enabled: !!authToken,
    staleTime: 0,
  });

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["itemProcessSteps", authToken],
    queryFn: async (): Promise<RowData[]> => {
      const paginationData = await nguageStore.GetPaginationData({
        table: "item_process_steps",
        skip: 0,
        take: null,
        NGaugeId: "60",
      });
      const result = Array.isArray(paginationData) ? paginationData : (paginationData?.data || []);
      return (result as RowData[]) || [];
    },
    enabled: !!authToken,
    staleTime: 0,
  });

  const allColumns = useMemo(
    () => items && items.length > 0 ? Object.keys(items[0]) : [],
    [items]
  );
  const columns = useMemo(
    () => allColumns.filter((col) => !HIDDEN_COLUMNS.includes(col)),
    [allColumns]
  );

  // Group items by item_code
  const groupedItems = useMemo(() => groupItemsByCode(items), [items]);

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

  // Open Add Item Process Step Modal
  const openAddItemStepModal = () => {
    setAddItemStepName("");
    setAddItemStepDescription("");
    setAddItemStepRemarks("");
    setAddItemStepDocuments([]);
    setShowAddItemStepModal(true);
  };

  // Close Add Item Process Step Modal
  const closeAddItemStepModal = () => {
    setShowAddItemStepModal(false);
    setAddItemStepName("");
    setAddItemStepDescription("");
    setAddItemStepRemarks("");
    setAddItemStepDocuments([]);
    setIsUploadingDocument(false);
  };

  // Open Add Step Modal
  const openAddStepModal = (itemCode: string, totalSteps: number) => {
    setSelectedItemCodeForStep(itemCode);
    setSelectedItemProcessId("");
    setSelectedSequenceForStep("");
    setShowAddStepModal(true);
  };

  // Get available item process options (exclude already used ones)
  const availableItemProcessOptions = useMemo(() => {
    const itemGroup = groupedItems.find((g) => g.item_code === selectedItemCodeForStep);
    const usedProcessIds = new Set(itemGroup?.processes.map((p) => p.item_process_id) || []);
    return itemProcessOptions.filter((option: any) => {
      // Try to match using id, name, or any identifier field
      const optionId = option.id || option.item_process_id || option.item_process_name;
      return !usedProcessIds.has(optionId);
    });
  }, [groupedItems, selectedItemCodeForStep, itemProcessOptions]);

  // Get available sequence options for inserting step
  const availableSequenceOptions = useMemo(() => {
    const itemGroup = groupedItems.find((g) => g.item_code === selectedItemCodeForStep);
    const totalSteps = itemGroup?.processes.length || 0;
    const options = [];
    
    // Create options for each position (1 to totalSteps + 1)
    for (let i = 1; i <= totalSteps + 1; i++) {
      if (i === totalSteps + 1) {
        options.push({
          value: String(i),
          label: `Step ${i} (Last)`,
        });
      } else {
        options.push({
          value: String(i),
          label: `Step ${i} (Insert before current Step ${i})`,
        });
      }
    }
    
    return options;
  }, [groupedItems, selectedItemCodeForStep]);

  // Close Add Step Modal
  const closeAddStepModal = () => {
    setShowAddStepModal(false);
    setSelectedItemCodeForStep("");
    setSelectedItemProcessId("");
    setSelectedSequenceForStep("");
  };

  // Handle submit Add Step
  const handleSubmitAddStep = async () => {
    if (!selectedItemCodeForStep) {
      toast.error("Item code is required");
      return;
    }

    if (!selectedItemProcessId) {
      toast.error("Item Process is required");
      return;
    }

    if (!selectedSequenceForStep) {
      toast.error("Sequence position is required");
      return;
    }

    setAddStepModalLoading(true);

    try {
      const selectedSequenceNumber = parseInt(selectedSequenceForStep, 10);
      const itemGroup = groupedItems.find((g) => g.item_code === selectedItemCodeForStep);
      const totalSteps = itemGroup?.processes.length || 0;

      // If inserting in the middle (not at the end), shift existing steps
      if (selectedSequenceNumber <= totalSteps) {
        // Find all processes that need to be updated (sequence >= selectedSequence)
        const processesToUpdate = itemGroup?.processes.filter(
          (p) => p.sequence >= selectedSequenceNumber
        ) || [];

        // Update each process with incremented sequence
        for (const process of processesToUpdate) {
          const newSequence = process.sequence + 1;
          
          // Fetch complete row data
          const completeRowData = await nguageStore.GetRowData(60, process.ROWID, "item_process_steps");
          
          if (!completeRowData) {
            throw new Error(`Failed to fetch complete data for step ${process.sequence}`);
          }

          // Prepare complete payload with updated sequence
          const updatePayload = {
            ...completeRowData,
            sequence: newSequence,
          };

          const updateResult = await nguageStore.UpdateRowDataDynamic(
            updatePayload,
            String(process.ROWID),
            60,
            "item_process_steps"
          );

          if (!updateResult.result) {
            throw new Error(`Failed to update step ${process.sequence}: ${updateResult.error}`);
          }
        }
      }

      // Prepare data for submission - add new step with selected sequence
      const newStep = {
        item_code: selectedItemCodeForStep,
        item_process_id: selectedItemProcessId,
        sequence: selectedSequenceNumber,
      };

      // Call the store method to add new step
      const result = await nguageStore.AddRowData(newStep, 60, "item_process_steps");

      if (result?.result) {
        toast.success("Step added successfully!");
        // Invalidate the itemProcessSteps query to refresh the data
        await queryClient.invalidateQueries({
          queryKey: ["itemProcessSteps"],
        });
        closeAddStepModal();
      } else {
        throw new Error(result?.error || "Failed to add step");
      }
    } catch (error) {
      console.error("Error adding step:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add step";
      toast.error(errorMessage);
    } finally {
      setAddStepModalLoading(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (files: any[] | undefined) => {
    if (!files || files.length === 0) return;

    setIsUploadingDocument(true);

    try {
      // Parse existing document paths
      let existingDocPaths: string[] = [];
      if (addItemStepDocuments.length > 0) {
        try {
          const parsed = JSON.parse(JSON.stringify(addItemStepDocuments));
          if (Array.isArray(parsed)) {
            existingDocPaths = parsed.map((d: any) => String(d));
          } else if (parsed) {
            existingDocPaths = [String(parsed)];
          }
        } catch {
          existingDocPaths = addItemStepDocuments.map((d) => String(d));
        }
      }

      // Normalize incoming values to File objects (some components pass { file } wrappers)
      const filesToUpload: File[] = files
        .map((fileItem: any) => (fileItem?.file ? fileItem.file : fileItem))
        .filter((file: File) => {
          if (!file || !file.name) return false;
          return !existingDocPaths.some((docPath) => docPath.includes(file.name));
        });

      if (filesToUpload.length === 0) {
        toast.error('No new files to upload');
        return;
      }

      const uploadResult = await nguageStore.UploadMultipleMedia(filesToUpload);
      console.log("Upload result:", uploadResult);

      if (uploadResult) {
        // Normalize new upload result to an array of strings
        const newDocs: string[] = Array.isArray(uploadResult)
          ? uploadResult.map((d: any) => String(d))
          : [String(uploadResult)];

        const merged = [...existingDocPaths, ...newDocs];
        setAddItemStepDocuments(merged);
        toast.success('File uploaded successfully');
      } else {
        toast.error('File upload failed');
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error('An error occurred while uploading the file');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  // Handle submit Add Item Process Step
  const handleSubmitAddItemStep = async () => {
    if (!addItemStepName.trim()) {
      toast.error("Item Process Step Name is required");
      return;
    }

    if (!addItemStepDescription.trim()) {
      toast.error("Item Process Step Description is required");
      return;
    }

    setAddItemStepModalLoading(true);

    try {
      // Prepare data for submission
      const newItemProcessStep = {
        item_process_step_name: addItemStepName,
        item_process_step_description: addItemStepDescription,
        remarks: addItemStepRemarks,
        document: addItemStepDocuments.length > 0 ? JSON.stringify(addItemStepDocuments) : null,
      };

      // Call the store method to add new item process step
      const result = await nguageStore.AddRowData(newItemProcessStep, 60, "item_process_steps");

      if (result?.result) {
        toast.success("Item Process Step added successfully!");
        // Invalidate the itemProcessSteps query to refresh the data
        await queryClient.invalidateQueries({
          queryKey: ["itemProcessSteps"],
        });
        closeAddItemStepModal();
      } else {
        throw new Error(result?.error || "Failed to add item process step");
      }
    } catch (error) {
      console.error("Error adding item process step:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add item process step";
      toast.error(errorMessage);
    } finally {
      setAddItemStepModalLoading(false);
    }
  };

  // Normalize documents prop for PDFViewerModal
  const documentsProp: string | string[] | undefined = openDocumentsString || undefined;

  return (
    <div>
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-3">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Item Process Steps List</h2>
            {/* <button
              onClick={openAddItemStepModal}
              className="px-4 py-2 bg-blue-800 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              Add Item Process Step
            </button> */}
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
              <p className="text-error-600 dark:text-error-400">Failed to fetch item process steps data</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No item process steps records found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3">
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-blue-800 dark:bg-blue-700 sticky top-0 z-10">
                    <tr>
                      <th className="w-32 px-4 py-3 text-left font-medium text-white text-xs uppercase tracking-wide border-b border-blue-900">
                        Item Code
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-white text-xs uppercase tracking-wide border-b border-blue-900">
                        Process Steps
                      </th>
                      <th className="w-28 px-4 py-3 text-center font-medium text-white text-xs uppercase tracking-wide border-b border-blue-900">
                        Total Steps
                      </th>
                      <th className="w-28 px-4 py-3 text-center font-medium text-white text-xs uppercase tracking-wide border-b border-blue-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {groupedItems.map((group) => (
                      <tr
                        key={group.item_code}
                        className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                      >
                        <td className="w-32 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {group.item_code}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center flex-wrap">
                            {group.processes.map((process, idx) => {
                              const colors = getStepColors(process.sequence);
                              return (
                                <React.Fragment key={process.ROWID}>
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className={`flex items-center justify-center w-12 h-6 rounded-full ${colors.bg} border ${colors.border}`}>
                                      <span className={`text-xs font-bold ${colors.text}`}>
                                        Step {process.sequence}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 text-center w-16 truncate">
                                      {process.item_process_id}
                                    </span>
                                  </div>
                                  {idx < group.processes.length - 1 && (
                                    <div className="w-5 mb-4.5 h-0.5 bg-linear-to-r from-blue-400 to-blue-300 dark:from-blue-500 dark:to-blue-600"></div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </td>
                        <td className="w-28 px-4 py-2 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                            {group.processes.length}
                          </span>
                        </td>
                        <td className="w-28 px-2 py-2 text-center">
                          <button
                            onClick={() => openAddStepModal(group.item_code, group.processes.length)}
                            className="inline-flex items-center px-2 py-1.5 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                            title="Add new step"
                          >
                            <IoAdd className="w-4 h-4" />
                            Add Step
                          </button>
                        </td>
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

      {/* Add Item Process Step Modal */}
      {showAddItemStepModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-1/2 max-h-5/6 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-white/5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Item Process Step
              </h2>
              <button
                onClick={closeAddItemStepModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

              <div className="grid grid-cols-2 gap-4">
                {/* Item Process Step ID - Disabled */}
                <TextInput
                  label="Item Process Step ID"
                  type="text"
                  value="IT-STEP-****"
                  disabled={true}
                  placeholder="IT-STEP-****"
                  onValueChange={() => { }}
                />

                {/* Item Process Step Name */}
                <TextInput
                  label="Item Process Step Name"
                  type="text"
                  value={addItemStepName}
                  onValueChange={(v) => setAddItemStepName(v ?? "")}
                  placeholder="Enter item process step name"
                />

                <TextInput
                  label="Item Process Step Description"
                  type="text"
                  value={addItemStepDescription}
                  onValueChange={(v) => setAddItemStepDescription(v ?? "")}
                  placeholder="Enter detailed description"
                />
                <div>
                  <MultiFileInput
                    label="Document"
                    maxFiles={5}
                    accept=".pdf"
                    multiple={true}
                    className="w-full"
                    onValueChange={handleDocumentUpload}
                  />
                  {addItemStepDocuments.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-gray-400 mt-1">
                      <span className="text-blue-600 dark:text-blue-400">Current:</span> {(() => {
                        try {
                          if (Array.isArray(addItemStepDocuments)) {
                            return addItemStepDocuments
                              .map((f: string) => (f ? f.split("/").pop() : ""))
                              .filter(Boolean)
                              .join(", ");
                          }
                          return String(addItemStepDocuments).split("/").pop() || String(addItemStepDocuments);
                        } catch {
                          return addItemStepDocuments.join(", ");
                        }
                      })()}
                    </p>
                  )}
                </div>

                <TextInput
                  label="Remarks"
                  type="text"
                  value={addItemStepRemarks}
                  onValueChange={(v) => setAddItemStepRemarks(v ?? "")}
                  placeholder="Add any remarks (optional)"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-white/5 flex justify-end gap-3">
              <button
                onClick={closeAddItemStepModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddItemStep}
                disabled={addItemStepModalLoading || isUploadingDocument}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-60 text-white font-medium rounded-lg transition-colors flex items-center gap-2 justify-center"
              >
                {addItemStepModalLoading ? (
                  <>
                    <div className="animate-spin">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                    Adding...
                  </>
                ) : (
                  "Add Item Process Step"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Step Modal */}
      {showAddStepModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            {/* Header with gradient */}
            <div className="flex items-center justify-between bg-linear-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 px-4 py-3">
              <h2 className="text-2xl font-bold text-white">Add New Step</h2>
              <button
                onClick={closeAddStepModal}
                className="text-white hover:text-gray-100 dark:hover:text-gray-200 transition-colors"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="space-y-2">
                {/* Item Code Badge */}
                <div className="flex items-center gap-5">
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Item Code
                    </p>
                    <div className="text-xs inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg font-semibold">
                      {selectedItemCodeForStep}
                    </div>
                  </div>

                  {/* Total Steps Info */}
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Total Steps
                    </p>
                    <div className="text-xs inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg font-semibold">
                      {groupedItems.find((g) => g.item_code === selectedItemCodeForStep)?.processes.length || 0}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Sequence Select - Choose position to insert */}
                <div>
                  <Select
                    label={<>Insert Position <span className="text-red-500">*</span></>}
                    value={selectedSequenceForStep}
                    onValueChange={(v) => setSelectedSequenceForStep(v ?? "")}
                    placeholder="Select position to insert step..."
                    data={availableSequenceOptions}
                    className="max-w-full"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">
                    Selecting a position in the middle will shift existing steps down.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Item Process Select - Large and prominent */}
                <div>
                  <Select
                    label={<>Select Process <span className="text-red-500">*</span></>}
                    value={selectedItemProcessId}
                    onValueChange={(v) => setSelectedItemProcessId(v ?? "")}
                    placeholder="Choose an item process..."
                    data={availableItemProcessOptions.map((option: any) => ({
                      value: option.id || option.item_process_id || option.item_process_name,
                      label: option.item_process_name || option.name || option.item_process_id,
                    }))}
                    className="max-w-full"
                  />
                  {availableItemProcessOptions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No available item processes (all processes already assigned)</p>
                  )}
                </div>

                {/* Selected item preview */}
                {selectedItemProcessId && selectedSequenceForStep && (
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MdCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-300">
                          {selectedItemProcessId}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                          Ready to be added as Step {selectedSequenceForStep}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
              <button
                onClick={closeAddStepModal}
                className="px-4 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddStep}
                disabled={addStepModalLoading || !selectedItemProcessId || !selectedSequenceForStep}
                className="px-4 py-1.5 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center gap-2 justify-center"
              >
                {addStepModalLoading ? (
                  <>
                    <div className="animate-spin">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                    Adding...
                  </>
                ) : (
                  <>
                    <IoAdd className="w-5 h-5" />
                    Add Step
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
