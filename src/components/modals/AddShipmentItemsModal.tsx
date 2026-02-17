'use client';

import { useStore } from '@/store/store-context';
import { KeyValueRecord, ShipmentItem, RowData } from '@/types/purchase-order';
import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import * as React from 'react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

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

    // Fetch work order data using TanStack Query
    const { data: workOrderData, isLoading: isLoadingWorkOrders } = useQuery({
        queryKey: ["workOrderItems"],
        queryFn: async (): Promise<any[]> => {
            const response = await nguageStore.GetPaginationData({
                table: "work_order",
                skip: 0,
                take: 500,
                NGaugeId: "44",
            });
            
            // Handle response - GetPaginationData returns array or object with data property
            const items = response?.data || response || [];
            return Array.isArray(items) ? items : [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch PO items data using TanStack Query
    const { data: poItemsData, isLoading: isLoadingPOItems } = useQuery({
        queryKey: ["poItemsData"],
        queryFn: async (): Promise<any[]> => {
            const response = await nguageStore.GetPaginationData({
                table: "purchase_order_items",
                skip: 0,
                take: 500,
                NGaugeId: "42",
            });
            
            // Handle response - GetPaginationData returns array or object with data property
            const items = response?.data || response || [];
            return Array.isArray(items) ? items : [];
        },
        staleTime: 5 * 60 * 1000,
    });

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
        shipment_status: shipmentData?.shipment_status || 'Pending',
        document: '',
        remarks: '',
    }), [shipmentData]);

    const [formData, setFormData] = useState<KeyValueRecord>(getDefaultFormData());
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const fileNameToUpload = "Ngauge" + uuidv4() + file.name;

            setIsUploadingDocument(true);

            try {
                console.log("Uploading file:", file.name);
                const uploadResult = await nguageStore.UploadAttachFile(file, fileNameToUpload);
                console.log("Upload result:", uploadResult);

                if (uploadResult) {
                    handleInputChange("document", fileNameToUpload);
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

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => {
            const updated = {
                ...prev,
                [field]: value,
            };

            // Handle work order selection - auto-populate related fields
            if (field === 'work_order_id' && Array.isArray(workOrderData)) {
                const woRowId = value;
                const selectedWorkOrder = workOrderData.find((wo: any) => String(wo.ROWID) === woRowId);
                
                if (selectedWorkOrder) {
                    const { po_number, item_code } = selectedWorkOrder;
                    
                    // Keep work_order_id as ROWID for select UI to work properly
                    // The composite key can be constructed at save time if needed
                    updated.work_order_id = woRowId;
                    
                    // Find matching PO item
                    const matchingPOItem = Array.isArray(poItemsData) && poItemsData.find((poi: any) => 
                        poi.po_number === po_number && poi.item_code === item_code
                    );
                    
                    if (matchingPOItem) {
                        // Auto-populate fields from work order and PO item
                        updated.item_code = item_code;
                        updated.item = matchingPOItem.item || selectedWorkOrder.item || '';
                        updated.unit_price = String(matchingPOItem.unit_price || 0);
                        updated.shipment_quantity = String(matchingPOItem.quantity || 0);
                        updated.po_number = po_number;
                        
                        // Auto-calculate total
                        const unitPrice = parseFloat(String(matchingPOItem.unit_price || 0)) || 0;
                        const quantity = parseFloat(String(matchingPOItem.quantity || 0)) || 0;
                        updated.total = (unitPrice * quantity).toFixed(2);
                    } else {
                        // Populate from work order if PO item not found
                        updated.item_code = item_code;
                        updated.item = selectedWorkOrder.item || '';
                        updated.po_number = po_number;
                        updated.unit_price = '';
                        updated.shipment_quantity = '';
                        updated.total = '';
                    }
                }
            }

            // Auto-populate item name and unit price when item code is selected (fallback if not from work order)
            if (field === 'item_code' && Array.isArray(paginationData) && !updated.unit_price) {
                const selectedItem = paginationData.find((item: any) => item.Item_code === value);
                if (selectedItem) {
                    updated.item = selectedItem.Item_name;
                    updated.unit_price = String(selectedItem.Unit_price);
                }
            }

            // Auto-calculate total when unit_price or shipment_quantity changes (manual changes)
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
        const requiredFields = ['work_order_id', 'item_code', 'item', 'unit_price', 'shipment_quantity'];
        const missingFields = requiredFields.filter((field) => !formData[field]);

        if (missingFields.length > 0) {
            toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
            return;
        }

        try {
            const saveItem = async () => {
                // Construct work_order_id as composite key (po_number-item_code)
                const woRowId = formData.work_order_id;
                const selectedWO = workOrderData?.find((wo: any) => String(wo.ROWID) === String(woRowId));
                const workOrderIdToSend = selectedWO ? `${selectedWO.po_number}-${selectedWO.item_code}` : woRowId;

                // Extract only fields that have values (dynamic key-value approach)
                const itemToSave = toRowData({
                    ...formData,
                    work_order_id: workOrderIdToSend,
                });

                const result = await nguageStore.AddDataSourceRow(
                    itemToSave,
                    47,
                    'shipment_list_items'
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
                    work_order_id: workOrderIdToSend,
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
        const requiredFields = ['work_order_id', 'item_code', 'item', 'unit_price', 'shipment_quantity'];
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

                // Construct work_order_id as composite key (po_number-item_code)
                const woRowId = formData.work_order_id;
                const selectedWO = workOrderData?.find((wo: any) => String(wo.ROWID) === String(woRowId));
                const workOrderIdToSend = selectedWO ? `${selectedWO.po_number}-${selectedWO.item_code}` : woRowId;

                // Extract key-value data excluding rowId
                const itemToUpdate = toRowData({
                    ...formData,
                    work_order_id: workOrderIdToSend,
                    rowId: undefined,
                });

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

                const updatedItem: ShipmentItem = {
                    ...formData,
                    work_order_id: workOrderIdToSend,
                } as ShipmentItem;
                onSave(updatedItem);
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
                                {/* Work Order ID */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Work Order ID <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={String(formData.work_order_id ?? '')}
                                        onChange={(e) => handleInputChange('work_order_id', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select work order</option>
                                        {isLoadingWorkOrders && <option disabled>Loading work orders...</option>}
                                        {Array.isArray(workOrderData) && workOrderData.length > 0 ? (
                                            workOrderData.map((wo: any) => {
                                                const woId = wo.po_number && wo.item_code ? `${wo.po_number}-${wo.item_code}` : `${wo.ROWID}`;
                                                return (
                                                    <option key={wo.ROWID} value={String(wo.ROWID)}>
                                                        {woId}
                                                    </option>
                                                );
                                            })
                                        ) : (
                                            !isLoadingWorkOrders && <option disabled>No work orders available</option>
                                        )}
                                    </select>
                                </div>

                                {/* Item Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Item Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={String(formData.item_code ?? '')}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
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
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
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
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
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
                                        disabled
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                        min="0"
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
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
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
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                </div>

                                {/* Shipment Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Shipment Status
                                    </label>
                                    <select
                                        value={String(formData.shipment_status ?? 'Pending')}
                                        onChange={(e) => handleInputChange('shipment_status', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Ready to Ship">Ready to Ship</option>
                                    </select>
                                </div>

                                {/* Document */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Document
                                    </label>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        disabled={isUploadingDocument}
                                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        accept=".pdf,.doc,.docx,.jpg,.png"
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
                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Enter remarks"
                                        rows={5}
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
                        className="px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={shipmentStore.editingItemIndex !== null ? handleUpdateItem : handleSubmit}
                        className="px-4 py-2.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        {shipmentStore.editingItemIndex !== null ? 'Update Shipment Item' : 'Add Shipment Item'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default observer(AddShipmentItemsModalContent);
