"use client";

import { ShipmentItem } from "@/types/nguage-rowdata";
import { useStore } from "@/store/store-context";
import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";

interface EditShipmentItemModalProps {
  isOpen: boolean;
  item: ShipmentItem | null;
  onClose: () => void;
  onSave: (updates: Partial<ShipmentItem>) => void;
}

export function EditShipmentItemModal({
  isOpen,
  item,
  onClose,
  onSave,
}: EditShipmentItemModalProps) {
  const { nguageStore } = useStore();
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [document, setDocument] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  // Initialize form fields when item changes
  React.useEffect(() => {
    if (item) {
      setDocument(String(item.document || ""));
      setRemarks(String(item.remarks || ""));
      setStatus(String(item.shipment_status || "Pending"));
    }
  }, [item, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileNameToUpload = "Ngauge" + uuidv4() + file.name;

      setIsUploadingDocument(true);

      try {
        console.log("Uploading file:", file.name);
        const uploadResult = await nguageStore.UploadAttachFile(
          file,
          fileNameToUpload
        );
        console.log("Upload result:", uploadResult);

        if (uploadResult) {
          setDocument(fileNameToUpload);
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

  const handleSave = async () => {
    console.log("Editing item:", item);
    
    if (!item?.ROWID) {
      console.warn("Item data:", item);
      toast.error("Item ID not found. Make sure this item was saved to the database first.");
      return;
    }

    try {
      // Fetch the full row data for the item
      const fullItemData = await nguageStore.GetRowData(47, String(item.ROWID), 'shipment_list_items');

      if (!fullItemData) {
        toast.error("Could not fetch item data");
        return;
      }

      // Spread the entire object and update only remarks and document
      const updatedItem = {
        ...fullItemData,
        remarks,
        document,
      };

      // Call UpdateRowDataDynamic to save to API
      const result = await nguageStore.UpdateRowDataDynamic(
        updatedItem,
        String(item.ROWID),
        47,
        'shipment_list_items'
      );

      if (!result.result) {
        toast.error(`Failed to update item: ${result.error}`);
        return;
      }

      // Update local store
      onSave({
        document,
        remarks,
        shipment_status: status,
      });

      toast.success("Item updated successfully");
      handleClose();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const handleClose = () => {
    setDocument("");
    setRemarks("");
    setStatus("");
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-4/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Item Details : {item.item_code}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Read-Only Section */}
          <div>
            <div className="grid grid-cols-3 gap-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={String(item.item || "")}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed opacity-75"
                />
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Unit Price
                </label>
                <input
                  type="number"
                  value={Number(item.unit_price || 0)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed opacity-75"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={Number(item.shipment_quantity || 0)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed opacity-75"
                />
              </div>

              {/* Total */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total
                </label>
                <input
                  type="number"
                  value={Number(item.total || 0)}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed opacity-75"
                />
              </div>

              {/* PO Number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  PO Number
                </label>
                <input
                  type="text"
                  value={String(item.po_number || "")}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed opacity-75"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Status
                </label>
                <input
                  type="text"
                  value={String(status || "")}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed opacity-75"
                />
              </div>

               {/* Document */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    disabled={isUploadingDocument}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                  />
                  {document && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      Current: {document}
                    </p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Add any remarks about this item"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploadingDocument}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
