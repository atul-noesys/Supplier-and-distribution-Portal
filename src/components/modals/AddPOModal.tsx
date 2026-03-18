'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import * as React from 'react';
import { MdClose, MdEdit, MdDelete } from 'react-icons/md';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { observer } from 'mobx-react-lite';
import axios from 'axios';
import DateInput from '@/components/ui/infoveave-components/DateInput';
import { useStore } from '@/store/store-context';
import AddPOItemModal from './AddPOItemModal';
import { POItem, KeyValueRecord, RowData } from '@/types/nguage-rowdata';
import { Select, TextInput } from "@/components/ui"
import MultiFileInput from '@/components/ui/infoveave-components/MultiFileInput';

/**
 * Convert KeyValueRecord to RowData for API submission
 * Removes undefined values and ensures type compatibility
 */
const toRowData = (record: KeyValueRecord): RowData => {
  const rowData: RowData = {};
  Object.keys(record).forEach((key) => {
    const value = record[key];
    if (value !== null && value !== undefined && value !== '') {
      rowData[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    }
  });
  return rowData;
};

interface AddPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

function AddPOModalContent({ isOpen, onClose, onSuccess, initialData }: AddPOModalProps) {
  const { nguageStore, poStore } = useStore();
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [itemEdited, setItemEdited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const itemEditedRef = useRef(false);
  const [isSaved, setIsSaved] = useState(false);
  const [poData, setPoData] = useState<KeyValueRecord | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tableBodyHeight, setTableBodyHeight] = useState(155);
  const tableBodyRef = useRef<HTMLDivElement>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [formData, setFormData] = useState<KeyValueRecord>({
    po_issue_date: '',
    supplier_id: '',
    supplier_name: '',
    po_status: 'Pending',
  });

  // Calculate table body height dynamically
  const calculateTableHeight = useCallback(() => {
    if (!tableBodyRef.current) return;

    const parent = tableBodyRef.current.parentElement; // the container div
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const contentArea = parent.closest('[class*="overflow-y-auto"]') as HTMLElement;

    if (contentArea) {
      const contentRect = contentArea.getBoundingClientRect();
      const availableHeight = contentRect.height - parentRect.top + contentRect.top - 120; // 120px for padding/gaps
      const calculatedHeight = Math.max(155, Math.min(350, availableHeight));
      setTableBodyHeight(calculatedHeight);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      calculateTableHeight();
      // Recalculate on resize
      window.addEventListener('resize', calculateTableHeight);
      return () => window.removeEventListener('resize', calculateTableHeight);
    }
  }, [isOpen, calculateTableHeight]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Fetch pagination data using TanStack Query
  const { data: paginationData, refetch } = useQuery({
    queryKey: ["paginationData", "userregistration", "31"],
    queryFn: () =>
      nguageStore.GetPaginationData({
        table: "userregistration",
        skip: 0,
        take: 200,
        NGaugeId: "31",
      }),
    enabled: false,
  });

  // Refetch when modal opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Initialize form data when editing existing PO
  useEffect(() => {
    if (isOpen && initialData) {
      setIsEditMode(true);
      setPoData(initialData);
      setFormData({
        po_number: String(initialData.po_number || ''),
        po_issue_date: String(initialData.po_issue_date ? initialData.po_issue_date.split('T')[0] : ''),
        supplier_id: String(initialData.supplier_id || ''),
        supplier_name: String(initialData.supplier_name || ''),
        po_status: String(initialData.po_status || 'Pending'),
        document: String(initialData.document || ''),
        remarks: String(initialData.remarks || ''),
        ROWID: initialData.ROWID,
        InfoveaveBatchId: initialData.InfoveaveBatchId,
      });
      setIsSaved(true);
    } else if (isOpen) {
      setIsEditMode(false);
      setPoData(null);
      setFormData({
        po_issue_date: '',
        supplier_id: '',
        supplier_name: '',
        po_status: 'Pending',
      });
      setIsSaved(false);
    }
  }, [isOpen, initialData]);

  // Fetch and load PO items when editing
  useEffect(() => {
    const fetchPoItems = async () => {
      if (isEditMode && initialData?.po_number) {
        setIsLoadingItems(true);
        try {
          const authToken = localStorage.getItem("access_token");
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
            }
          );

          // Filter items for this specific PO
          const poItems = (response.data.data || [])
            .filter((item: any) => item.po_number === initialData.po_number)
            .map((item: any) => {
              const totalKey = Object.keys(item).find(
                (key) => key.includes("@unit_price * @quantity") || key.includes("expression")
              );
              const total = totalKey ? item[totalKey] : (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);

              return {
                po_number: String(item.po_number || ''),
                item_code: String(item.item_code || ''),
                item: String(item.item || ''),
                unit_price: Number(item.unit_price) || 0,
                quantity: Number(item.quantity) || 0,
                status: String(item.status || ''),
                step_name: String(item.step_name || ''),
                document: item.document || null,
                work_order_created: item.work_order_created || null,
                remarks: item.remarks || null,
                supplier_id: String(item.supplier_id || ''),
                supplier_name: String(item.supplier_name || ''),
                InfoveaveBatchId: Number(item.InfoveaveBatchId) || 0,
                rowId: item.ROWID,
                total: total,
              };
            });

          // Clear existing items and load new ones
          poStore.clearItems();
          poItems.forEach((item: any) => {
            poStore.addItem(item);
          });
        } catch (error) {
          console.error('Error fetching PO items:', error);
          toast.error('Failed to load PO items');
        } finally {
          setIsLoadingItems(false);
        }
      }
    };

    fetchPoItems();
  }, [isEditMode, initialData?.po_number, poStore]);

  // Filter vendors with is_account_created: true
  const availableVendors = Array.isArray(paginationData)
    ? paginationData.filter(
      (vendor: any) => vendor.is_account_created === "true"
    )
    : [];

  const handleVendorChange = (selectedVendorName: string) => {
    const selectedVendor = availableVendors.find(
      (vendor: any) => vendor.company_name === selectedVendorName
    );
    if (selectedVendor) {
      setFormData((prev) => ({
        ...prev,
        supplier_name: String(selectedVendor.company_name || ''),
        supplier_id: String(selectedVendor.supplier_id || ''),
      }));
    }
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required key-value fields
    const requiredFields = ['po_issue_date', 'supplier_name'];
    const missingFields = requiredFields.filter(
      (field) => !formData[field]
    );

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSaving(true);

    try {
      // Call API to save PO - send only populated key-value pairs
      console.log('Saving PO:', formData);

      const poToSave = toRowData(formData);

      if (isEditMode && formData.ROWID) {
        // Edit existing PO
        const authToken = localStorage.getItem("access_token");
        const updatedData = {
          ...poToSave,
          ROWID: formData.ROWID,
        };

        await axios.put(
          "/api/EditRow",
          updatedData,
          {
            headers: {
              "Content-Type": "application/json",
              ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
          }
        );

        setPoData(formData as KeyValueRecord);
        toast.success('Purchase Order updated successfully!');
      } else {
        // Create new PO
        const result = await nguageStore.AddRowData(
          poToSave,
          41,
          'purchase_orders'
        );

        if (result.error) {
          toast.error(`Failed to save: ${result.error}`);
          return;
        }

        // Get row data using the returned rowId
        const rowId = typeof result.result === 'string' ? result.result : (result.result as any)?.data;
        const rowData = await nguageStore.GetRowData(41, rowId ?? '1', 'purchase_orders');

        if (!rowData) {
          console.warn('Row data fetch returned null');
        } else {
          // Normalize API response to key-value record
          setPoData(rowData as KeyValueRecord);
        }

        setIsSaved(true);
        toast.success('Purchase Order created successfully! Now add items.');
      }

      // Show items section after saving
      // Items section will auto-appear since isSaved is true
    } catch (error) {
      console.error('Error saving PO:', error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(`Failed to save: ${error.response.data.message}`);
      } else {
        toast.error('Failed to save Purchase Order');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditDocumentChange = async (files: any[] | undefined) => {
    if (!files || files.length === 0) return;

    setIsUploadingDocument(true);

    try {
      // Parse existing document paths from formData
      let existingDocPaths: string[] = [];
      if (formData?.document) {
        try {
          const parsed = JSON.parse(String(formData.document));
          if (Array.isArray(parsed)) {
            existingDocPaths = parsed.map((d: any) => String(d));
          } else if (parsed) {
            existingDocPaths = [String(parsed)];
          }
        } catch {
          existingDocPaths = [String(formData.document)];
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
      if (uploadResult) {
        setFormData((prev) => {
          const prevState = prev || {};

          const newDocs: string[] = Array.isArray(uploadResult)
            ? uploadResult.map((d: any) => String(d))
            : [String(uploadResult)];

          const merged = [...existingDocPaths, ...newDocs];

          return {
            ...prevState,
            document: JSON.stringify(merged),
          };
        });

        toast.success('File(s) uploaded successfully');
      } else {
        toast.error('File upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred while uploading the file');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleSaveItems = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    try {
      toast.success('Purchase Order ' + (isEditMode ? 'updated' : 'created') + ' successfully!');
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error saving items:', error);
      toast.error('Failed to save Purchase Order');
    }
  };

  const handleOpenItemModal = () => {
    if (!poData) {
      toast.error('Please wait for PO data to load...');
      return;
    }
    poStore.setEditingItemIndex(null);
    setShowItemModal(true);
  };

  const handleClose = () => {
    setFormData({
      po_issue_date: '',
      supplier_id: '',
      supplier_name: '',
      po_status: 'Pending',
    } as KeyValueRecord);
    poStore.clearItems();
    setIsSaved(false);
    setPoData(null);
    setShowItemModal(false);
    onClose();
  };

  const handleSaveItem = (item: POItem) => {
    if (poStore.editingItemIndex !== null) {
      // Update existing item
      poStore.updateItem(poStore.editingItemIndex, item);
      poStore.setEditingItemIndex(null);
    } else {
      // Add new item
      poStore.addItem(item);
    }
    setShowItemModal(false);
  };

  const handleEditItem = (index: number) => {
    const item = poStore.poItems[index];
    const rowId = item?.rowId ? String(item.rowId) : null;

    if (!rowId) {
      toast.error('Item ID is missing');
      return;
    }

    // Open the edit modal immediately with the cached item to avoid delay
    poStore.setEditingItemIndex(index);
    setItemEdited(false);
    itemEditedRef.current = false;
    setShowItemModal(true);

    // Fetch the latest data in background and update the store only if the user
    // hasn't started editing the item in the modal.
    (async () => {
      setIsFetchingItems(true);
      try {
        const latestData = await nguageStore.GetRowData(
          42,
          rowId,
          'purchase_order_items'
        );

        if (latestData) {
          if (!itemEditedRef.current) {
            const updatedItem: POItem = {
              ...item,
              ...latestData,
              rowId: item.rowId,
            };
            poStore.updateItem(index, updatedItem);
          }
        } else {
          // Keep cached version, notify if user hasn't edited
          if (!itemEditedRef.current) {
            toast.warning('Could not fetch latest data, using cached version');
          }
        }
      } catch (error) {
        console.error('Error fetching latest data:', error);
        if (!itemEditedRef.current) {
          toast.error('Failed to fetch latest item data');
        }
      } finally {
        setIsFetchingItems(false);
      }
    })();
  };

  const handleDeleteItem = (index: number) => {
    poStore.deleteItem(index);
    toast.success('Item removed');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-4/5 h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit Purchase Order' : 'Add Purchase Order'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSavePO} className="space-y-4">
            {/* PO Details Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="grid grid-cols-3 gap-6">
                {/* PO Number - Auto-generated by backend */}
                <div>
                  <TextInput
                    label="PO Number"
                    type="text"
                    disabled
                    value={String(poData?.po_number ?? 'ENG-PO-****')}
                    onValueChange={() => { }}
                  />
                </div>

                {/* PO Issue Date */}
                <div>
                  <DateInput
                    label="Issue Date"
                    placeholder="Select date"
                    value={formData.po_issue_date ? new Date(String(formData.po_issue_date)) : undefined}
                    disabled={isEditMode}
                    onValueChange={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const formattedDate = `${year}-${month}-${day}`;
                        handleInputChange('po_issue_date', formattedDate);
                      }
                    }}
                  />
                </div>

                {/* Supplier Name */}
                <div>
                  <Select
                    label={<>Supplier Name <span className="text-red-500">*</span></>}
                    value={String(formData.supplier_name ?? '')}
                    onChange={(v) => handleVendorChange(v ?? "")}
                    disabled={isEditMode}
                    data={availableVendors.map(v => ({ label: v.company_name, value: v.company_name }))}
                  />
                </div>

                {/*  Supplier ID */}
                <div>
                  <TextInput
                    label={<>Supplier ID <span className="text-red-500">*</span></>}
                    type="text"
                    disabled
                    value={String(formData.supplier_id ?? '')}
                    onValueChange={() => { }}
                  />
                </div>

                {/* Document */}
                <div>
                  <MultiFileInput
                    label="Document"
                    maxFiles={5}
                    accept=".pdf"
                    multiple={true}
                    className="w-full"
                    onValueChange={handleEditDocumentChange}
                  />
                  {formData.document && (
                    <p className="text-xs text-green-600 dark:text-gray-400 mt-1">
                      <span className="text-blue-600 dark:text-blue-400">Current:</span> {(() => {
                        try {
                          const parsed = JSON.parse(formData.document as string);
                          if (Array.isArray(parsed)) {
                            return parsed
                              .map((f: string) => (f ? f.split("/").pop() : ""))
                              .filter(Boolean)
                              .join(", ");
                          }
                          return String(parsed).split("/").pop() || String(parsed);
                        } catch {
                          return String(formData.document);
                        }
                      })()}
                    </p>
                  )}
                </div>

                <div>
                  <TextInput
                    label="Remarks"
                    type="text"
                    placeholder="Enter remarks"
                    value={String(formData.remarks ?? '')}
                    onValueChange={(value) => handleInputChange("remarks", value)}
                  />
                </div>

                {/* PO Status */}
                <div>
                  <TextInput
                    label={<>Status <span className="text-red-500">*</span></>}
                    type="text"
                    disabled
                    value={String(formData.po_status ?? 'Pending')}
                    onValueChange={() => { }}
                  />
                </div>
              </div>
            </div>

            {/* Items Section - Hidden initially, shown in separate modal */}
            {isSaved && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold text-blue-800 dark:text-white">
                    Purchase Order Item Details
                  </h3>
                  <button
                    type="button"
                    onClick={handleOpenItemModal}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    + Add PO Item
                  </button>
                </div>

                <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                  {/* Table Header - Fixed */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.7fr', gap: '0' }}>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">Item Code</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">Item Name</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">Unit Price</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">Qty</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">Total</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">PO #</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">Supplier ID</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-r border-blue-800 dark:border-blue-800">Supplier</div>
                    <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider col-span-1 border-l border-blue-800 dark:border-blue-800">Actions</div>
                  </div>

                  {/* Table Body - Scrollable */}
                  <div ref={tableBodyRef} style={{ height: `${tableBodyHeight}px`, overflowY: 'auto' }}>
                    {isLoadingItems ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.7fr', gap: '0' }}>
                        {/* Loading State */}
                        <div style={{ gridColumn: '1 / -1' }} className="bg-white dark:bg-gray-800">
                          <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </div>
                      </div>
                    ) : poStore.poItems.length === 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.7fr', gap: '0' }}>
                        {/* Empty State - Centered Add Button */}
                        <div style={{ gridColumn: '1 / -1' }} className="bg-white dark:bg-gray-800">
                          <div className="flex flex-col items-center justify-center py-8 px-4">
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No items added yet</p>
                            <button
                              type="button"
                              onClick={handleOpenItemModal}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              + Add PO Item
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.7fr', gap: '0' }}>
                        {poStore.poItems.map((item, index) => (
                          <React.Fragment key={index}>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{item.item_code}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-900 dark:text-white">{item.item}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-900 dark:text-white font-medium">${parseFloat(String(item.unit_price || 0)).toFixed(2)}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{item.quantity}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-900 dark:text-white font-medium">${item.total ? parseFloat(String(item.total)).toFixed(2) : '0.00'}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-700 dark:text-gray-300">{item.po_number || '-'}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-700 dark:text-gray-300">{item.supplier_id || '-'}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                              <p className="text-sm text-gray-700 dark:text-gray-300">{item.supplier_name || '-'}</p>
                            </div>
                            <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-l flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(index)}
                                className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Edit item"
                              >
                                <MdEdit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(index)}
                                className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Delete item"
                              >
                                <MdDelete className="w-4 h-4" />
                              </button>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 px-5 py-3 bg-white dark:bg-gray-900">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isSaved ? 'Close' : 'Cancel'}
          </button>
          {isSaved ? (
            <button
              onClick={handleSaveItems}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {isEditMode ? 'Update Purchase Order' : 'Submit'}
            </button>
          ) : (
            <button
              onClick={handleSavePO}
              disabled={isSaving || isUploadingDocument}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {isEditMode ?
                isSaving ? (
                  <div className='flex items-center gap-2'>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating Purchase Order...
                  </div>
                ) : (
                  "Update Purchase Order"
                ) : isSaving ? (
                  <div className='flex items-center gap-2'>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Purchase Order...
                  </div>
                ) : (
                  "Create Purchase Order"
                )}
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {
        poData && (
          <AddPOItemModal
            isOpen={showItemModal}
            onClose={() => setShowItemModal(false)}
            onSave={(item) => {
              handleSaveItem(item);
            }}
            poData={poData}
            onUserEdit={() => {
              setItemEdited(true);
              itemEditedRef.current = true;
            }}
          />
        )
      }
    </div >
  );
}

export default observer(AddPOModalContent);
