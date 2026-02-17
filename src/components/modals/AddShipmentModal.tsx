"use client";

import { useState } from "react";
import React from "react";
import { MdClose, MdEdit, MdDelete } from "react-icons/md";
import { toast } from "react-toastify";
import { observer } from "mobx-react-lite";
import { v4 as uuidv4 } from "uuid";
import DatePicker from "@/components/form/date-picker";
import { useStore } from "@/store/store-context";
import { KeyValueRecord, RowData, ShipmentItem } from "@/types/purchase-order";
import { useQueryClient } from "@tanstack/react-query";
import AddShipmentItemsModal from "./AddShipmentItemsModal";

/**
 * Convert KeyValueRecord to RowData for API submission
 * Removes undefined values and ensures type compatibility
 */
const toRowData = (record: KeyValueRecord): RowData => {
  const rowData: RowData = {};
  Object.keys(record).forEach((key) => {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") {
      rowData[key] = typeof value === "boolean" ? (value ? 1 : 0) : value;
    }
  });
  return rowData;
};

interface AddShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function AddShipmentModalContent({
  isOpen,
  onClose,
  onSuccess,
}: AddShipmentModalProps) {
  const { nguageStore, shipmentStore } = useStore();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [shipmentData, setShipmentData] = useState<KeyValueRecord | null>(null);
  const [formData, setFormData] = useState<KeyValueRecord>({
    shipment_id: "",
    carrier_name: "",
    shipment_date: "",
    estimated_delivery_date: "",
    actual_delivery_date: "",
    tracking_number: "",
    invoice_id: "",
    document: "",
    remarks: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      "carrier_name",
      "shipment_date",
      "tracking_number",
      "invoice_id",
    ];
    const missingFields = requiredFields.filter((field) => !formData[field]);

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(", ")}`);
      return;
    }

    setIsLoading(true);

    try {
      // Call API to save shipment
      console.log("Saving Shipment:", formData);

      const shipmentToSave = toRowData(formData);

      const result = await nguageStore.AddDataSourceRow(
        shipmentToSave,
        46,
        "shipment_list"
      );

      if (result.error) {
        toast.error(`Failed to save: ${result.error}`);
        return;
      }

      // Get row data using the returned rowId
      const rowId = typeof result.result === 'string' ? result.result : (result.result as any)?.data;
      
      let fetchedData: KeyValueRecord | null = null;
      try {
        const rowDataResponse = await nguageStore.GetRowData(46, rowId ?? '1', 'shipment_list');
        if (rowDataResponse) {
          fetchedData = rowDataResponse as KeyValueRecord;
        }
      } catch (fetchError) {
        console.warn('Failed to fetch row data:', fetchError);
      }

      // Use fetched data if available, otherwise use form data with the generated shipment_id
      const finalShipmentData = fetchedData || { ...formData, shipment_id: rowId || 'SID-****' };
      setShipmentData(finalShipmentData);

      setIsSaved(true);
      toast.success("Shipment created successfully!");

      // Invalidate the query to refresh the table
      onSuccess?.();
    } catch (error) {
      console.error("Error saving shipment:", error);
      toast.error("Failed to save shipment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenItemModal = () => {
    if (!shipmentData) {
      toast.error('Please wait for shipment data to load...');
      return;
    }
    shipmentStore.setEditingItemIndex(null);
    setShowItemModal(true);
  };

  const handleSaveItem = (item: ShipmentItem) => {
    if (shipmentStore.editingItemIndex !== null) {
      // Update existing item
      shipmentStore.updateItem(shipmentStore.editingItemIndex, item);
      shipmentStore.setEditingItemIndex(null);
    } else {
      // Add new item
      shipmentStore.addItem(item);
    }
    setShowItemModal(false);
  };

  const handleEditItem = (index: number) => {
    const item = shipmentStore.shipmentItems[index];
    const rowId = item?.rowId ? String(item.rowId) : null;
    
    if (!rowId) {
      toast.error('Item ID is missing');
      return;
    }

    // Fetch the latest data before opening the edit modal
    const fetchLatestData = async () => {
      try {
        const latestData = await nguageStore.GetRowData(
          47,
          rowId,
          'shipment_list_items'
        );

        if (latestData) {
          // Update the store with the latest data
          const updatedItem: ShipmentItem = {
            ...item,
            ...latestData,
            rowId: item.rowId, // Preserve the rowId
          };
          shipmentStore.updateItem(index, updatedItem);
        } else {
          toast.warning('Could not fetch latest data, using cached version');
        }

        // Set editing index and open modal
        shipmentStore.setEditingItemIndex(index);
        setShowItemModal(true);
      } catch (error) {
        console.error('Error fetching latest data:', error);
        toast.error('Failed to fetch latest item data');
      }
    };

    fetchLatestData();
  };

  const handleDeleteItem = (index: number) => {
    shipmentStore.deleteItem(index);
    toast.success('Item removed');
  };

  const handleClose = () => {
    setFormData({
      shipment_id: "",
      carrier_name: "",
      shipment_date: "",
      estimated_delivery_date: "",
      actual_delivery_date: "",
      tracking_number: "",
      invoice_id: "",
      document: "",
      remarks: "",
    });
    setShipmentData(null);
    shipmentStore.clearItems();
    setIsSaved(false);
    setShowItemModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-4/5 h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add New Shipment
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSaveShipment} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Shipment ID */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Shipment ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={String(shipmentData?.shipment_id ?? 'SID-****')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed"
                  placeholder="Auto-generated"
                />
              </div>

              {/* Carrier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Carrier Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.carrier_name as string}
                  onChange={(e) => handleInputChange("carrier_name", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select carrier</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="FedEx International">FedEx International</option>
                  <option value="UPS International">UPS International</option>
                  <option value="Aramex">Aramex</option>
                  <option value="DTDC">DTDC</option>
                </select>
              </div>

              {/* Shipment Date */}
              <div>
                <DatePicker
                  id="shipment_date"
                  label="Shipment Date"
                  placeholder="Select date"
                  mode="single"
                  defaultDate={
                    formData.shipment_date
                      ? new Date(String(formData.shipment_date))
                      : undefined
                  }
                  required
                  onChange={(selectedDates) => {
                    if (selectedDates.length > 0) {
                      const date = selectedDates[0];
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const day = String(date.getDate()).padStart(2, "0");
                      const formattedDate = `${year}-${month}-${day}`;
                      handleInputChange("shipment_date", formattedDate);
                    }
                  }}
                />
              </div>

              {/* Estimated Delivery Date */}
              <div>
                <DatePicker
                  id="estimated_delivery_date"
                  label="Estimated Delivery Date"
                  placeholder="Select date"
                  mode="single"
                  defaultDate={
                    formData.estimated_delivery_date
                      ? new Date(String(formData.estimated_delivery_date))
                      : undefined
                  }
                  onChange={(selectedDates) => {
                    if (selectedDates.length > 0) {
                      const date = selectedDates[0];
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const day = String(date.getDate()).padStart(2, "0");
                      const formattedDate = `${year}-${month}-${day}`;
                      handleInputChange("estimated_delivery_date", formattedDate);
                    }
                  }}
                />
              </div>

              {/* Actual Delivery Date */}
              <div>
                <DatePicker
                  id="actual_delivery_date"
                  label="Actual Delivery Date"
                  placeholder="Select date"
                  mode="single"
                  defaultDate={
                    formData.actual_delivery_date
                      ? new Date(String(formData.actual_delivery_date))
                      : undefined
                  }
                  onChange={(selectedDates) => {
                    if (selectedDates.length > 0) {
                      const date = selectedDates[0];
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const day = String(date.getDate()).padStart(2, "0");
                      const formattedDate = `${year}-${month}-${day}`;
                      handleInputChange("actual_delivery_date", formattedDate);
                    }
                  }}
                />
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Tracking Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tracking_number as string}
                  onChange={(e) => handleInputChange("tracking_number", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., TK-ENG-123456789"
                />
              </div>

              {/* Invoice ID */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Invoice ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.invoice_id as string}
                  onChange={(e) => handleInputChange("invoice_id", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., AR-IPX-5454"
                />
              </div>

              {/* Document */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Remarks</label>
                <textarea value={formData.remarks as string} onChange={(e) => handleInputChange("remarks", e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Additional remarks" rows={1} />
              </div>
            </div>

            {/* Items Section - Hidden initially, shown in separate modal */}
            {isSaved && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-semibold text-blue-800 dark:text-white">
                    Shipment Item Details
                  </h3>
                  <button
                    type="button"
                    onClick={handleOpenItemModal}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  >
                    + Add Shipment Item
                  </button>
                </div>

                {shipmentStore.shipmentItems.length === 0 ? (
                  <div className="border border-gray-300 dark:border-gray-600">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.8fr 0.7fr', gap: '0' }}>
                      {/* Table Header */}
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Code</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Name</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Unit Price</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Qty</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Total</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">PO #</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Status</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">WO ID</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Document</div>
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
                            + Add Shipment Item
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-600 overflow-x-auto">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.8fr 0.7fr', gap: '0' }}>
                      {/* Table Header */}
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Code</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Item Name</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Unit Price</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Qty</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Total</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">PO #</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Status</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">WO ID</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 col-span-1 border-r border-blue-800 dark:border-blue-800">Document</div>
                      <div className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 right-0 col-span-1 text-right border-l border-blue-800 dark:border-blue-800 z-10">Actions</div>

                      {/* Table Body */}
                      {shipmentStore.shipmentItems.map((item, index) => (
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
                            <p className="text-sm text-gray-900 dark:text-white font-medium">{item.shipment_quantity}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-900 dark:text-white font-medium">${item.total ? parseFloat(String(item.total)).toFixed(2) : '0.00'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.po_number || '-'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.shipment_status || '-'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.work_order_id || '-'}</p>
                          </div>
                          <div className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{item.document || '-'}</p>
                          </div>
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
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isSaved ? 'Close' : 'Cancel'}
          </button>
          {isSaved ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Submit
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              onClick={handleSaveShipment}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                "Save Shipment"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {shipmentData && (
        <AddShipmentItemsModal
          isOpen={showItemModal}
          onClose={() => setShowItemModal(false)}
          onSave={(item) => {
            handleSaveItem(item);
            onSuccess?.();
          }}
          shipmentData={shipmentData}
        />
      )}
    </div>
  );
}

export default observer(AddShipmentModalContent);
