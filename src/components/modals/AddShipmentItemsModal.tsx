'use client';

import { useStore } from '@/store/store-context';
import { KeyValueRecord, ShipmentItem, RowData } from '@/types/purchase-order';
import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import * as React from 'react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { toast } from 'react-toastify';

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

interface AddShipmentItemsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: ShipmentItem) => void;
    shipmentData?: {
        shipment_id?: string;
        po_number?: string;
        shipment_status?: string;
    };
}

function AddShipmentItemsModalContent({
    isOpen,
    onClose,
    onSave,
    shipmentData,
}: AddShipmentItemsModalProps) {
    const { nguageStore, shipmentStore } = useStore();

    // Get editing item from store
    const editingItem = shipmentStore.getEditingItem();

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
        shipment_id: shipmentData?.shipment_id || '',
        work_order_id: '',
        item_code: '',
        item: '',
        unit_price: '',
        shipment_quantity: '',
        total: '',
        po_number: shipmentData?.po_number || '',
        shipment_status: shipmentData?.shipment_status || '',
        document: '',
        remarks: '',
    }), [shipmentData]);

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
    }, [isOpen, editingItem, getDefaultFormData, shipmentData]);

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

            // Auto-calculate total when unit_price or shipment_quantity changes
            if (field === 'unit_price' || field === 'shipment_quantity') {
                const unitPrice = parseFloat(String(updated.unit_price || 0)) || 0;
                const quantity = parseFloat(String(updated.shipment_quantity || 0)) || 0;
                updated.total = (unitPrice * quantity).toFixed(2);
            }
            return updated;
        });
    };

    const handleClose = () => {
        setFormData(getDefaultFormData());
        shipmentStore.setEditingItemIndex(null);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields using key-value approach
        const requiredFields = ['item_code', 'item', 'unit_price', 'shipment_quantity'];
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
                    47,
                    'shipment_items'
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

                const itemWithRowId: ShipmentItem = {
                    ...formData,
                    rowId: rowId || undefined,
                } as ShipmentItem;

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
        const requiredFields = ['item_code', 'item', 'unit_price', 'shipment_quantity'];
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

                onSave(formData as ShipmentItem);
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
                        {shipmentStore.editingItemIndex !== null ? 'Edit Shipment Item' : 'Add New Shipment Item'}
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

                                {/* Shipment Quantity */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Shipment Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={String(formData.shipment_quantity ?? '')}
                                        onChange={(e) => handleInputChange('shipment_quantity', e.target.value)}
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

                                {/* Work Order ID */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Work Order ID
                                    </label>
                                    <input
                                        type="text"
                                        value={String(formData.work_order_id ?? '')}
                                        onChange={(e) => handleInputChange('work_order_id', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., ENG-PO-0011LE-CU-900"
                                    />
                                </div>

                                {/* PO Number */}
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

                                {/* Shipment Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Shipment Status
                                    </label>
                                    <input
                                        type="text"
                                        value={String(formData.shipment_status ?? '')}
                                        onChange={(e) => handleInputChange('shipment_status', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter status"
                                    />
                                </div>

                                {/* Document */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Document
                                    </label>
                                    <input
                                        type="text"
                                        value={String(formData.document ?? '')}
                                        onChange={(e) => handleInputChange('document', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter document reference"
                                    />
                                </div>

                                {/* Remarks */}
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Remarks
                                    </label>
                                    <textarea
                                        value={String(formData.remarks ?? '')}
                                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Enter remarks"
                                        rows={3}
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
                        onClick={shipmentStore.editingItemIndex !== null ? handleUpdateItem : handleSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        {shipmentStore.editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default observer(AddShipmentItemsModalContent);
