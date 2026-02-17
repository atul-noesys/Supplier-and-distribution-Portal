"use client";

import { useState } from "react";
import React from "react";
import { MdClose } from "react-icons/md";
import { toast } from "react-toastify";
import { observer } from "mobx-react-lite";
import { v4 as uuidv4 } from "uuid";
import DatePicker from "@/components/form/date-picker";
import { useStore } from "@/store/store-context";
import { KeyValueRecord, RowData } from "@/types/purchase-order";
import { useQueryClient } from "@tanstack/react-query";

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
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [shipmentData, setShipmentData] = useState<KeyValueRecord | null>(null);
  const [formData, setFormData] = useState<KeyValueRecord>({
    shipment_id: "",
    carrier_name: "",
    shipment_date: "",
    estimated_arrival_date: "",
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
      const rowDataResponse = await nguageStore.GetRowData(46, rowId ?? '1', 'shipment_list');

      if (!rowDataResponse) {
        console.warn('Row data fetch returned null');
      } else {
        // Extract the data from the response object
        const rowData =  rowDataResponse;
        // Normalize API response to key-value record
        setShipmentData(rowData as KeyValueRecord);
      }

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

  const handleClose = () => {
    setFormData({
      shipment_id: "",
      carrier_name: "",
      shipment_date: "",
      estimated_arrival_date: "",
      actual_delivery_date: "",
      tracking_number: "",
      invoice_id: "",
      document: "",
      remarks: "",
    });
    setShipmentData(null);
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

              {/* Estimated Arrival Date */}
              <div>
                <DatePicker
                  id="estimated_arrival_date"
                  label="Estimated Arrival Date"
                  placeholder="Select date"
                  mode="single"
                  defaultDate={
                    formData.estimated_arrival_date
                      ? new Date(String(formData.estimated_arrival_date))
                      : undefined
                  }
                  onChange={(selectedDates) => {
                    if (selectedDates.length > 0) {
                      const date = selectedDates[0];
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const day = String(date.getDate()).padStart(2, "0");
                      const formattedDate = `${year}-${month}-${day}`;
                      handleInputChange("estimated_arrival_date", formattedDate);
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
            </div>
            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks as string}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Additional remarks (optional)"
                rows={4}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
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
        </div>
      </div>
    </div>
  );
}

export default observer(AddShipmentModalContent);
