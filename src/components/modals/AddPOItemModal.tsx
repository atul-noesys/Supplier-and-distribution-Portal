'use client';

import { useStore } from '@/store/store-context';
import { KeyValueRecord, POItem, RowData } from '@/types/nguage-rowdata';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import * as React from 'react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { toast } from 'react-toastify';
import { Select, TextInput } from "@/components/ui";

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

interface AddPOItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: POItem) => void;
    poData?: {
        po_number?: string;
        po_status?: string;
        supplier_id?: string;
        supplier_name?: string;
    };
    onUserEdit?: () => void;
}

function AddPOItemModalContent({
    isOpen,
    onClose,
    onSave,
    poData,
    onUserEdit,
}: AddPOItemModalProps) {
    const queryClient = useQueryClient();
    const { nguageStore, poStore } = useStore();

    // Get editing item from store
    const editingItem = poStore.getEditingItem();

    const [isUploadingDocument, setIsUploadingDocument] = useState(false);

    // Fetch pagination data using TanStack Query
    const { data: paginationData, isLoading, error } = useQuery({
        queryKey: ["paginationData", "item", "33"],
        queryFn: () =>
            nguageStore.GetPaginationData({
                table: "item",
                skip: 0,
                take: 200,
                NGaugeId: "33",
            }),
        enabled: true,
        staleTime: Infinity,
    });

    /**
     * Initialize form with key-value record structure
     * All form data treated as a flexible key-value record
     */
    const getDefaultFormData = React.useCallback((): KeyValueRecord => ({
        po_number: poData?.po_number || '',
        item_code: '',
        item: '',
        unit_price: '',
        quantity: '',
        po_status: poData?.po_status || '',
        supplier_id: poData?.supplier_id || '',
        supplier_name: poData?.supplier_name || '',
        total: '',
        work_order_created: "No",
        document: '',
        remarks: ''
    }), [poData]);

    const [formData, setFormData] = useState<KeyValueRecord>(getDefaultFormData());

    // Update form data when modal opens or when editingItem changes
    React.useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                // Populate with editing item data
                setFormData(editingItem);
            } else {
                // Reset to default for new item
                setFormData(getDefaultFormData());
            }
        }
    }, [isOpen, editingItem, getDefaultFormData, poData]);

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => {
            const updated = {
                ...prev,
                [field]: value,
            };

            // Auto-populate item name and unit price when item code is selected
            if (field === 'item_code' && Array.isArray(paginationData)) {
                const selectedItem = paginationData.find((item: any) => item.Item_code === value);
                if (selectedItem) {
                    updated.item = selectedItem.Item_name;
                    updated.unit_price = String(selectedItem.Unit_price);
                }
            }

            // Auto-calculate total when unit_price or quantity changes
            if (field === 'unit_price' || field === 'quantity') {
                const unitPrice = parseFloat(String(updated.unit_price || 0)) || 0;
                const quantity = parseFloat(String(updated.quantity || 0)) || 0;
                updated.total = (unitPrice * quantity).toFixed(2);
            }
            return updated;
        });
        // Notify parent modal that the user has edited the form
        onUserEdit?.();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            
            setIsUploadingDocument(true);
            
            try {
                const uploadFiles = async () => {
                    const uploadResult = await nguageStore.UploadMultipleMedia(fileArray);
                    console.log("Upload result:", uploadResult);

                    if (uploadResult) {
                        setFormData((prev) => {
                            // Normalize new upload result to an array of strings
                            const newDocs: string[] = Array.isArray(uploadResult)
                                ? uploadResult.map((d: any) => String(d))
                                : [String(uploadResult)];

                            let existingDocs: string[] = [];
                            try {
                                if (prev.document) {
                                    const parsed = JSON.parse(String(prev.document));
                                    if (Array.isArray(parsed)) {
                                        existingDocs = parsed.map((d: any) => String(d));
                                    } else if (parsed) {
                                        existingDocs = [String(parsed)];
                                    }
                                }
                            } catch {
                                if (prev.document) {
                                    existingDocs = [String(prev.document)];
                                }
                            }

                            const merged = [...existingDocs, ...newDocs];

                            return {
                                ...prev,
                                document: JSON.stringify(merged),
                            };
                        });
                    }
                };

                uploadFiles();
            } catch (error) {
                console.error("Upload error:", error);
            } finally {
                setIsUploadingDocument(false);
                onUserEdit?.();
            }
        }
    };

    const handleClose = () => {
        setFormData(getDefaultFormData());
        poStore.setEditingItemIndex(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields using key-value approach
        const requiredFields = ['item_code', 'item', 'unit_price', 'quantity'];
        const missingFields = requiredFields.filter((field) => !formData[field]);

        if (missingFields.length > 0) {
            toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            const saveItem = async () => {
                // Extract only fields that have values (dynamic key-value approach)
                const itemToSave = toRowData(formData);

                const result = await nguageStore.AddRowData(
                    itemToSave,
                    42,
                    'purchase_order_items'
                );

                if (result.error) {
                    toast.error(`Failed to save: ${result.error}`);
                    return;
                }

                // Store the rowId from response
                // API returns { data: rowId, message: "..." }
                const rowId = typeof result.result === 'object' && result.result !== null 
                  ? (result.result as any).data 
                  : result.result;

                const itemWithRowId: POItem = {
                    ...formData,
                    rowId: rowId || undefined,
                } as POItem;

                console.log('Item saved with rowId:', itemWithRowId.rowId, 'Full item:', itemWithRowId);
                onSave(itemWithRowId);
                toast.success('Item added successfully!');
                handleClose();
            };

            saveItem();
        } catch (error) {
            console.error('Error saving item:', error);
            toast.error('Failed to save item');
        }
    };

    const handleUpdateItem = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        const requiredFields = ['item_code', 'item', 'unit_price', 'quantity'];
        const missingFields = requiredFields.filter((field) => !formData[field]);

        if (missingFields.length > 0) {
            toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            const updateItem = async () => {
                if (!formData.rowId) {
                    toast.error('Item ID is missing');
                    return;
                }

                // Extract key-value data excluding rowId
                const itemToUpdate = toRowData({...formData, rowId: undefined});

                const rowIdString = typeof formData.rowId === 'string' || typeof formData.rowId === 'number' 
                    ? String(formData.rowId) 
                    : '';

                if (!rowIdString) {
                    toast.error('Invalid Item ID');
                    return;
                }

                const result = await nguageStore.UpdateRowData(
                    itemToUpdate,
                    rowIdString
                );

                if (!result.result) {
                    toast.error(`Failed to update: ${result.error}`);
                    return;
                }

                onSave(formData as POItem);
                toast.success('Item updated successfully!');
                queryClient.invalidateQueries({ queryKey: ["poItems"] });
                handleClose();
            };

            updateItem();
        } catch (error) {
            console.error('Error updating item:', error);
            toast.error('Failed to update item');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-4/5 max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {poStore.editingItemIndex !== null ? 'Edit PO Item' : 'Add New PO Item'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <MdClose className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Item Details Section */}
                        <div>
                            <div className="grid grid-cols-3 gap-6">
                                {/* Item Code */}
                                <div>
                                    <Select
                                        label={<>Item Code <span className="text-red-500">*</span></>}
                                        value={String(formData.item_code ?? '')}
                                        onChange={(v) => handleInputChange('item_code', v ?? '')}
                                        disabled={poStore.editingItemIndex !== null}
                                        data={Array.isArray(paginationData) && paginationData.length > 0 ? paginationData.map((item: any) => ({
                                            label: item.Item_code,
                                            value: item.Item_code
                                        })) : []}
                                    />
                                </div>

                                {/* Item Name */}
                                <div>
                                    <TextInput
                                        label={<>Item Name <span className="text-red-500">*</span></>}
                                        type="text"
                                        value={String(formData.item ?? '')}
                                        disabled
                                        onValueChange={() => {}}
                                    />
                                </div>

                                {/* Unit Price */}
                                <div>
                                    <TextInput
                                        label={<>Unit Price <span className="text-red-500">*</span></>}
                                        type="text"
                                        value={formData.unit_price ? `$${parseFloat(String(formData.unit_price)).toFixed(2)}` : '$0.00'}
                                        disabled
                                        onValueChange={() => {}}
                                    />
                                </div>

                                {/* Quantity */}
                                <div>
                                    <TextInput
                                        label={<>Quantity <span className="text-red-500">*</span></>}
                                        type="number"
                                        value={String(formData.quantity ?? '')}
                                        placeholder="0"
                                        onValueChange={(value) => handleInputChange('quantity', value)}
                                    />
                                </div>

                                {/* Total */}
                                <div>
                                    <TextInput
                                        label="Total"
                                        type="text"
                                        disabled
                                        value={formData.total ? `$${parseFloat(String(formData.total)).toFixed(2)}` : '$0.00'}
                                        onValueChange={() => {}}
                                    />
                                </div>

                                <div>
                                    <TextInput
                                        label="PO Number"
                                        type="text"
                                        disabled
                                        value={String(formData.po_number ?? '')}
                                        onValueChange={() => {}}
                                    />
                                </div>

                                {/* PO Status */}
                                <div>
                                    <TextInput
                                        label="PO Status"
                                        type="text"
                                        disabled
                                        value={String(formData.po_status ?? '')}
                                        onValueChange={() => {}}
                                    />
                                </div>

                                {/* Supplier ID */}
                                <div>
                                    <TextInput
                                        label="Supplier ID"
                                        type="text"
                                        disabled
                                        value={String(formData.supplier_id ?? '')}
                                        onValueChange={() => {}}
                                    />
                                </div>

                                {/* Supplier Name */}
                                <div>
                                    <TextInput
                                        label="Supplier Name"
                                        type="text"
                                        disabled
                                        value={String(formData.supplier_name ?? '')}
                                        onValueChange={() => {}}
                                    />
                                </div>

                                {/* Document */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Document
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        disabled={isUploadingDocument}
                                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        accept=".pdf,.doc,.docx,.jpg,.png"
                                    />
                                    {formData.document && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Remarks
                                    </label>
                                    <textarea
                                        value={String(formData.remarks ?? '')}
                                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Enter remarks"
                                        rows={1}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={poStore.editingItemIndex !== null ? handleUpdateItem : handleSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        {poStore.editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default observer(AddPOItemModalContent);
