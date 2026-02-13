'use client';

import { useState } from 'react';
import * as React from 'react';
import { MdClose, MdEdit, MdDelete } from 'react-icons/md';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { observer } from 'mobx-react-lite';
import DatePicker from '@/components/form/date-picker';
import { useStore } from '@/store/store-context';
import AddPOItemModal from './AddPOItemModal';
import { POItem, KeyValueRecord, RowData } from '@/types/purchase-order';

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
}

function AddPOModalContent({ isOpen, onClose }: AddPOModalProps) {
  const { nguageStore, poStore } = useStore();
  const [isSaved, setIsSaved] = useState(false);
  const [poData, setPoData] = useState<KeyValueRecord | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [formData, setFormData] = useState<KeyValueRecord>({
    po_issue_date: '',
    vendor_id: '',
    vendor_name: '',
    po_status: 'pending',
  });

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
  React.useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

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
        vendor_name: String(selectedVendor.company_name || ''),
        vendor_id: String(selectedVendor.vendor_id || ''),
      }));
    }
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required key-value fields
    const requiredFields = ['po_issue_date', 'vendor_name'];
    const missingFields = requiredFields.filter(
      (field) => !formData[field]
    );

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      // Call API to save PO - send only populated key-value pairs
      console.log('Saving PO:', formData);

      const poToSave = toRowData(formData);

      const result = await nguageStore.AddDataSourceRow(
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
      toast.success('Purchase Order created successfully!');

      // Show items section after saving
      // Items section will auto-appear since isSaved is true
    } catch (error) {
      console.error('Error saving PO:', error);
      toast.error('Failed to save Purchase Order');
    }
  };

  const handleSaveItems = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      toast.success('Purchase Order items saved successfully!');
      handleClose();
    } catch (error) {
      console.error('Error saving items:', error);
      toast.error('Failed to save items');
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
      vendor_id: '',
      vendor_name: '',
      po_status: 'pending',
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

    // Fetch the latest data before opening the edit modal
    const fetchLatestData = async () => {
      try {
        const latestData = await nguageStore.GetRowData(
          42,
          rowId,
          'purchase_order_items'
        );

        if (latestData) {
          // Update the store with the latest data
          const updatedItem: POItem = {
            ...item,
            ...latestData,
            rowId: item.rowId, // Preserve the rowId
          };
          poStore.updateItem(index, updatedItem);
        } else {
          toast.warning('Could not fetch latest data, using cached version');
        }

        // Set editing index and open modal
        poStore.setEditingItemIndex(index);
        setShowItemModal(true);
      } catch (error) {
        console.error('Error fetching latest data:', error);
        toast.error('Failed to fetch latest item data');
      }
    };

    fetchLatestData();
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
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Purchase Order
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
          <form onSubmit={handleSavePO} className="space-y-4">
            {/* PO Details Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-md font-semibold text-blue-800 dark:text-white mb-4">
                Purchase Order Details
              </h3>
              <div className="grid grid-cols-3 gap-6">
                {/* PO Number - Auto-generated by backend */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    PO Number
                  </label>
                  <input
                    type="text"
                    disabled
                    value={String(poData?.po_number ?? 'ENG-PO-****')}
                    className="w-full px-4 py-1.75 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed"
                  />
                </div>

                {/* PO Issue Date */}
                <div>
                  <DatePicker
                    id="po_issue_date"
                    label="Issue Date"
                    placeholder="Select date"
                    mode="single"
                    defaultDate={formData.po_issue_date ? new Date(String(formData.po_issue_date)) : undefined}
                    required
                    onChange={(selectedDates) => {
                      if (selectedDates.length > 0) {
                        const date = selectedDates[0];
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const formattedDate = `${year}-${month}-${day}`;
                        handleInputChange('po_issue_date', formattedDate);
                      }
                    }}
                  />
                </div>

                {/* Vendor Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={String(formData.vendor_name ?? '')}
                    onChange={(e) => handleVendorChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select vendor</option>
                    {availableVendors.map((vendor: any) => (
                      <option key={vendor.ROWID} value={vendor.company_name}>
                        {vendor.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vendor ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={String(formData.vendor_id ?? '')}
                    disabled
                    className="w-full px-4 py-1.75 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed"
                  />
                </div>

                {/* PO Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={String(formData.po_status ?? '')}
                    onChange={(e) => handleInputChange('po_status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="production">Production</option>
                    <option value="completed">Completed</option>
                  </select>
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

                {poStore.poItems.length === 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 0.7fr', gap: '0' }}>
                      {/* Table Header */}
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Code</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Name</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Unit Price</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Qty</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Total</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Status</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Step</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">PO #</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Vendor ID</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Vendor</div>
                      {/* <div className="bg-blue-600 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-600">Remarks</div> */}
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 right-0 col-span-1 text-right border-l border-blue-800 dark:border-blue-800 z-10">Actions</div>

                      {/* Empty State - Centered Add Button */}
                      <div style={{ gridColumn: '1 / -1' }} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex flex-col items-center justify-center py-10 px-4">
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
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-600">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 0.7fr', gap: '0' }}>
                      {/* Table Header */}
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Code</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Name</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Unit Price</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Qty</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Total</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Status</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Step</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">PO #</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Vendor ID</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Vendor</div>
                      {/* <div className="bg-blue-600 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-600">Remarks</div> */}
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 right-0 col-span-1 text-right border-l border-blue-800 dark:border-blue-800 z-10">Actions</div>

                      {/* Table Body */}
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
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.status || '-'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.step_name || '-'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.po_number || '-'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.vendor_id || '-'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.vendor_name || '-'}</p>
                          </div>
                          {/* <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.remarks || '-'}</p>
                          </div> */}
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-l flex items-center justify-end gap-1 sticky right-0 z-10">
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
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isSaved ? 'Close' : 'Cancel'}
          </button>
          {isSaved ? (
            <></>
          ) : (
            <button
              onClick={handleSavePO}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {poData && (
        <AddPOItemModal
          isOpen={showItemModal}
          onClose={() => setShowItemModal(false)}
          onSave={handleSaveItem}
          poData={poData}
        />
      )}
    </div>
  );
}

export default observer(AddPOModalContent);
