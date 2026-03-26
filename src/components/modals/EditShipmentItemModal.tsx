"use client";

import { TextInput } from "@/components/ui";
import { useStore } from "@/store/store-context";
import { ShipmentItem } from "@/types/nguage-rowdata";
import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import MultiFileInput from '@/components/ui/infoveave-components/MultiFileInput';
import { toast } from "react-toastify";

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

  // Handler for MultiFileInput which provides an array of files or file-like objects
  const handleDocumentChange = async (files: any[] | undefined) => {
    if (!files || files.length === 0) return;

    setIsUploadingDocument(true);

    try {
      const fileArray: File[] = files.map((f: any) => (f?.file ? f.file : f)).filter(Boolean);

      const uploadResult = await nguageStore.UploadMultipleMedia(fileArray);
      console.log("Upload result:", uploadResult);

      if (uploadResult) {
        // Merge with any previously stored documents instead of overwriting
        let existing: any[] = [];
        try {
          const raw = String(document || "[]");
          const parsed = JSON.parse(raw);
          existing = Array.isArray(parsed) ? parsed : [parsed];
        } catch (err) {
          existing = [];
        }

        const newFiles = Array.isArray(uploadResult) ? uploadResult : [uploadResult];
        const merged = [...existing, ...newFiles];

        setDocument(JSON.stringify(merged));
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
      const fullItemData = await nguageStore.GetRowData(72, String(item.ROWID), 'shipment_list_items');

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
        72,
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
                <TextInput
                  label="Item Name"
                  type="text"
                  value={String(item.item || "")}
                  disabled
                  onValueChange={() => {}}
                />
              </div>

              {/* Unit Price */}
              <div>
                <TextInput
                  label="Unit Price"
                  type="number"
                  value={String(Number(item.unit_price || 0))}
                  disabled
                  onValueChange={() => {}}
                />
              </div>

              {/* Quantity */}
              <div>
                <TextInput
                  label="Quantity"
                  type="number"
                  value={String(Number(item.shipment_quantity || 0))}
                  disabled
                  onValueChange={() => {}}
                />
              </div>

              {/* Total */}
              <div>
                <TextInput
                  label="Total"
                  type="number"
                  value={String(Number(item.total || 0))}
                  disabled
                  onValueChange={() => {}}
                />
              </div>

              {/* PO Number */}
              <div>
                <TextInput
                  label="PO Number"
                  type="text"
                  value={String(item.po_number || "")}
                  disabled
                  onValueChange={() => {}}
                />
              </div>

              {/* Status */}
              <div>
                <TextInput
                  label="Status"
                  type="text"
                  value={String(status || "")}
                  disabled
                  onValueChange={() => {}}
                />
              </div>

               {/* Document */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document
                </label>
                <div className="space-y-2">
                  <MultiFileInput
                    label={null}
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    multiple
                    maxFiles={5}
                    onValueChange={handleDocumentChange}
                    className=""
                  />

                  {document && (
                    <p className="text-xs text-green-600 dark:text-gray-400 truncate">
                      <span className="text-blue-600">Current:</span> {(() => {
                        try {
                          const parsed = JSON.parse(document as string);
                          if (Array.isArray(parsed)) {
                            return parsed
                              .map((f: string) => (f ? f.split("/").pop() : ""))
                              .filter(Boolean)
                              .join(", ");
                          }
                          return String(parsed).split("/").pop() || String(parsed);
                        } catch {
                          return String(document);
                        }
                      })()}
                    </p>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <TextInput
                  label="Remarks"
                  type="text"
                  value={remarks}
                  onValueChange={(value) => setRemarks(value)}
                  placeholder="Add any remarks about this item"
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
