'use client';

import { useState } from 'react';
import * as React from 'react';
import { MdClose, MdEdit, MdDelete } from 'react-icons/md';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import DatePicker from '@/components/form/date-picker';
import { useStore } from '@/store/store-context';
import AddPOItemModal from './AddPOItemModal';

interface POItem {
  item_code: string;
  item: string;
  unit_price: string;
  quantity: string;
  status: string;
  step_name: string;
}

interface AddPOModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPOModal({ isOpen, onClose }: AddPOModalProps) {
  const { nguageStore } = useStore();
  const [isSaved, setIsSaved] = useState(false);
  const [poData, setPoData] = useState<any>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    po_issue_date: '',
    vendor_id: '',
    vendor_name: '',
    po_status: 'pending',
  });
  const [items, setItems] = useState<POItem[]>([]);

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

    // Validate required fields
    if (!formData.po_issue_date || !formData.vendor_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Call API to save PO
      console.log('Saving PO:', formData);

      const result = await nguageStore.AddDataSourceRow(
        formData,
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
        setPoData(rowData);
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
      // TODO: Call API to save items
      console.log('Saving Items:', items);
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
    setEditingItemIndex(null);
    setShowItemModal(true);
  };

  const handleClose = () => {
    setFormData({
      po_issue_date: '',
      vendor_id: '',
      vendor_name: '',
      po_status: 'pending',
    });
    setItems([]);
    setIsSaved(false);
    setPoData(null);
    setShowItemModal(false);
    setEditingItemIndex(null);
    onClose();
  };

  const handleSaveItem = (item: POItem) => {
    if (editingItemIndex !== null) {
      // Update existing item
      const newItems = [...items];
      newItems[editingItemIndex] = item;
      setItems(newItems);
      setEditingItemIndex(null);
    } else {
      // Add new item
      setItems((prev) => [...prev, item]);
    }
    setShowItemModal(false);
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setShowItemModal(true);
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
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
                    value="ENG-PO-****"
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
                    defaultDate={formData.po_issue_date || undefined}
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
                    value={formData.vendor_name}
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
                    value={formData.vendor_id}
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
                    value={formData.po_status}
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

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">No items</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Click the &quot;+ Add PO Item&quot; button above to start adding items</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="grid grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Item Code</p>
                              <p className="text-gray-900 dark:text-white font-medium">{item.item_code}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Item Name</p>
                              <p className="text-gray-900 dark:text-white font-medium">{item.item}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Unit Price</p>
                              <p className="text-gray-900 dark:text-white font-medium">${parseFloat(item.unit_price).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Qty</p>
                              <p className="text-gray-900 dark:text-white font-medium">{item.quantity}</p>
                            </div>
                          </div>
                          {item.step_name && (
                            <p className="text-gray-600 dark:text-gray-400 text-xs mt-2">
                              Step: <span className="font-medium">{item.step_name}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            type="button"
                            onClick={() => handleEditItem(index)}
                            className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Edit item"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete item"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
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
          initialData={editingItemIndex !== null ? items[editingItemIndex] : null}
          itemIndex={editingItemIndex}
          poData={poData}
        />
      )}
    </div>
  );
}
