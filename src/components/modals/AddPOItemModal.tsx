'use client';

import { useState } from 'react';
import * as React from 'react';
import { MdClose } from 'react-icons/md';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/store/store-context';
import { v4 as uuidv4 } from 'uuid';
import { POItem, KeyValueRecord, RowData } from '@/types/purchase-order';
import { observer } from 'mobx-react-lite';

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
        vendor_id?: string;
        vendor_name?: string;
    };
}

function AddPOItemModalContent({
    isOpen,
    onClose,
    onSave,
    poData,
}: AddPOItemModalProps) {
    const { nguageStore, poStore } = useStore();
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);

    // Get editing item from store
    const editingItem = poStore.getEditingItem();

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
        status: 'Step 1',
        step_name: '',
        po_status: poData?.po_status || '',
        vendor_id: poData?.vendor_id || '',
        vendor_name: poData?.vendor_name || '',
        remarks: '',
        document: '',
        total: '',
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
    };

    const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const fileNameToUpload = "Ngauge" + uuidv4() + file.name;

            // Call API to upload file immediately
            setIsUploadingDocument(true);

            try {
                console.log("Uploading file:", file.name);
                const uploadResult = await nguageStore.UploadAttachFile(file, fileNameToUpload);
                console.log("Upload result:", uploadResult);

                if (uploadResult) {
                    setFormData((prev) => ({
                        ...prev,
                        document: fileNameToUpload,
                    }));
                    toast.success("File uploaded successfully!");
                } else {
                    toast.error("File upload failed");
                }
            } catch (error) {
                console.error("Upload error:", error);
                toast.error("An error occurred while uploading the file");
            } finally {
                setIsUploadingDocument(false);
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

                const result = await nguageStore.AddDataSourceRow(
                    itemToSave,
                    42,
                    'purchase_order_items'
                );

                //pushing data for work order table
                const itemToSaveForWorkOrder = {
                    ...itemToSave,
                    start_date: new Date().toISOString().split('T')[0],
                    step: itemToSave.status
                };

                await nguageStore.AddDataSourceRow(
                    itemToSaveForWorkOrder,
                    44,
                    'work_order'
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Item Code <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={String(formData.item_code ?? '')}
                                        onChange={(e) => handleInputChange('item_code', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select item code</option>
                                        {isLoading && <option disabled>Loading items...</option>}
                                        {error && <option disabled>Error loading items</option>}
                                        {Array.isArray(paginationData) && paginationData.length > 0 ? (
                                            paginationData.map((item: any) => (
                                                <option key={item.ROWID} value={item.Item_code}>
                                                    {item.Item_code}
                                                </option>
                                            ))
                                        ) : (
                                            !isLoading && <option disabled>No items available</option>
                                        )}
                                    </select>
                                </div>

                                {/* Item Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Item Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={String(formData.item ?? '')}
                                        disabled
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                {/* Unit Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Unit Price <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.unit_price ? `$${parseFloat(String(formData.unit_price)).toFixed(2)}` : '$0.00'}
                                        disabled
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={String(formData.quantity ?? '')}
                                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                        required
                                    />
                                </div>

                                {/* Total */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Total
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={formData.total ? `$${parseFloat(String(formData.total)).toFixed(2)}` : '$0.00'}
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={String(formData.status ?? '')}
                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Step 1">Step 1</option>
                                        <option value="Step 2">Step 2</option>
                                        <option value="Step 3">Step 3</option>
                                        <option value="Step 4">Step 4</option>
                                        <option value="Step 5">Step 5</option>
                                    </select>
                                </div>

                                {/* Step Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Step Name
                                    </label>
                                    <select
                                        value={String(formData.step_name ?? '')}
                                        onChange={(e) => handleInputChange('step_name', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                                {/* Document Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Document
                                    </label>
                                    <input
                                        type="file"
                                        onChange={handleDocumentChange}
                                        disabled={isUploadingDocument}
                                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed dark:file:bg-blue-600 dark:hover:file:bg-blue-700"
                                    />
                                    {isUploadingDocument && (
                                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                                            <span>Uploading file...</span>
                                        </div>
                                    )}
                                    {formData.document && (
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            File: <span className="font-medium">{formData.document}</span>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        PO Number
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={String(formData.po_number ?? '')}
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                {/* PO Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        PO Status
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={String(formData.po_status ?? '')}
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                {/* Vendor ID */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Vendor ID
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={String(formData.vendor_id ?? '')}
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                {/* Vendor Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Vendor Name
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={String(formData.vendor_name ?? '')}
                                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Details Section */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Additional Details</h3>
                            {/* Remarks */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Remarks
                                </label>
                                <textarea
                                    value={String(formData.remarks ?? '')}
                                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                                    placeholder="Enter any remarks or notes"
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
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
