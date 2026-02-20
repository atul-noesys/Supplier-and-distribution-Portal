"use client";

import { useStore } from "@/store/store-context";
import { RowData } from "@/types/nguage-rowdata";
import { useQuery } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { MdClose, MdDelete, MdAdd } from "react-icons/md";
import { useState } from "react";
import { toast } from "react-toastify";

interface ReadyToShipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeliveryFormData {
  delivery_id: string;
  shipment_id: string;
  vendor_id: string;
  vendor_name: string;
  invoice_id: string;
  document: string;
  remarks: string;
}

function AddDeliveryModalContent({
  isOpen,
  onClose,
}: ReadyToShipModalProps) {
  const { nguageStore } = useStore();
  const [step, setStep] = useState(1); // 1: Items list, 2: Delivery form
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedDeliveryItems, setSelectedDeliveryItems] = useState<RowData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [deliveryFormData, setDeliveryFormData] = useState<DeliveryFormData>({
    delivery_id: "DID-****",
    shipment_id: "",
    vendor_id: "",
    vendor_name: "",
    invoice_id: "",
    document: "",
    remarks: "",
  });

  // Clear all states when closing modal
  const handleCloseModal = () => {
    setStep(1);
    setSelectedItems(new Set());
    setSelectedDeliveryItems([]);
    setIsSaving(false);
    setIsAddItemModalOpen(false);
    setDeliveryFormData({
      delivery_id: "DID-****",
      shipment_id: "",
      vendor_id: "",
      vendor_name: "",
      invoice_id: "",
      document: "",
      remarks: "",
    });
    onClose();
  };

  // Fetch shipment list data
  const { data: shipmentListData = [] } = useQuery({
    queryKey: ["shipmentList", isOpen],
    queryFn: async (): Promise<RowData[]> => {
      try {
        const response = await nguageStore.GetPaginationData({
          table: "shipment_list",
          skip: 0,
          take: null,
          NGaugeId: "52",
        });

        const result = Array.isArray(response) ? response : (response?.data || []);
        return result as RowData[];
      } catch (error) {
        console.error("Error fetching shipment list:", error);
        return [];
      }
    },
    staleTime: 0,
    enabled: isOpen,
  });

  // Fetch shipment items data
  const { data: shipmentItemsData = [] } = useQuery({
    queryKey: ["shipmentItems", isOpen],
    queryFn: async (): Promise<RowData[]> => {
      try {
        const response = await nguageStore.GetPaginationData({
          table: "shipment_list_items",
          skip: 0,
          take: null,
          NGaugeId: "47",
        });

        const result = Array.isArray(response) ? response : (response?.data || []);
        return result as RowData[];
      } catch (error) {
        console.error("Error fetching shipment items:", error);
        return [];
      }
    },
    staleTime: 0,
    enabled: isOpen,
  });

  // Create a map of shipments by ID with their full details
  const shipmentDetailMap = shipmentListData.reduce(
    (map: Record<string, RowData>, shipment: RowData) => {
      const shipmentId = String(shipment.shipment_id || "");
      map[shipmentId] = shipment;
      return map;
    },
    {}
  );

  // Create a map of shipments by ID with their status
  const shipmentStatusMap = shipmentListData.reduce(
    (map: Record<string, string>, shipment: RowData) => {
      const shipmentId = String(shipment.shipment_id || "");
      map[shipmentId] = String(shipment.shipment_status || "");
      return map;
    },
    {}
  );

  // Filter shipment items to only show those whose parent shipment has "Ready to ship" status
  const readyToShipItems = shipmentItemsData.filter((item) => {
    const shipmentId = String(item.shipment_id || "");
    const shipmentStatus = shipmentStatusMap[shipmentId];
    return (
      shipmentStatus &&
      shipmentStatus.toLowerCase() === "ready to ship"
    );
  });

  const filteredItems = readyToShipItems;

  const handleToggleItemSelection = (index: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAllItems = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map((_, idx) => idx)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleProceedToNextStep = () => {
    if (selectedItems.size === 0) return;

    const firstSelectedIdx = Array.from(selectedItems)[0];
    const firstSelectedItem = filteredItems[firstSelectedIdx];
    const shipmentId = String(firstSelectedItem.shipment_id || "");
    const shipmentDetails = shipmentDetailMap[shipmentId] || {};

    // Store all selected items
    const selected = Array.from(selectedItems).map(idx => filteredItems[idx]);
    setSelectedDeliveryItems(selected);

    setDeliveryFormData({
      delivery_id: "DID-****",
      shipment_id: String(firstSelectedItem.shipment_id || ""),
      vendor_id: String(shipmentDetails.vendor_id || ""),
      vendor_name: String(shipmentDetails.vendor_name || ""),
      invoice_id: String(shipmentDetails.invoice_id || ""),
      document: "",
      remarks: "",
    });
    setStep(2);
  };

  const handleBackStep = () => {
    setStep(1);
    setSelectedDeliveryItems([]);
    setIsAddItemModalOpen(false);
    setDeliveryFormData({
      delivery_id: "DID-****",
      shipment_id: "",
      vendor_id: "",
      vendor_name: "",
      invoice_id: "",
      document: "",
      remarks: "",
    });
  };

  const handleInputChange = (field: keyof DeliveryFormData, value: string) => {
    setDeliveryFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleInputChange("document", file.name);
    }
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = selectedDeliveryItems.filter((_, idx) => idx !== index);
    setSelectedDeliveryItems(updatedItems);
    toast.success("Item removed");
  };

  const handleAddItem = (item: RowData) => {
    // Check if item already exists
    const itemExists = selectedDeliveryItems.some(
      (existingItem) => existingItem.ROWID === item.ROWID
    );
    if (itemExists) {
      toast.warning("Item already added");
      return;
    }
    setSelectedDeliveryItems([...selectedDeliveryItems, item]);
    toast.success("Item added successfully");
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deliveryFormData.shipment_id) {
      toast.error("Shipment ID is required");
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data for API submission
      const deliveryData = {
        delivery_id: deliveryFormData.delivery_id,
        shipment_id: deliveryFormData.shipment_id,
        vendor_id: deliveryFormData.vendor_id,
        vendor_name: deliveryFormData.vendor_name,
        invoice_id: deliveryFormData.invoice_id,
        document: deliveryFormData.document,
        remarks: deliveryFormData.remarks,
      };

      // TODO: Submit delivery data to API
      console.log("Saving delivery:", deliveryData);

      toast.success("Delivery created successfully");
      handleCloseModal();
    } catch (error) {
      console.error("Error saving delivery:", error);
      toast.error("Failed to save delivery");
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = shipmentListData.length === 0 && shipmentItemsData.length === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="w-4/5 h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {step === 1 ? "Create new delivery list" : "Create Delivery"}
          </h2>
          <button
            onClick={handleCloseModal}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ready to Ship Items
              </h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin">
                    <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-gray-600 dark:text-gray-400">
                    No items ready to ship
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-950">
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                              onChange={(e) => handleSelectAllItems(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Shipment ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Item Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Item Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            PO #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredItems.map((item, index) => {
                          const isSelected = selectedItems.has(index);
                          return (
                            <tr
                              key={index}
                              className={`transition-colors ${isSelected
                                  ? "bg-blue-50 dark:bg-blue-900/30"
                                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleItemSelection(index)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {item.shipment_id || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {item.item_code || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                {item.item || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                ${parseFloat(String(item.unit_price || 0)).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {item.shipment_quantity || 0}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                ${
                                  item.total
                                    ? parseFloat(String(item.total)).toFixed(2)
                                    : "0.00"
                                }
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {item.po_number || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                {item.remarks || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Step 2: Delivery Form
            <form onSubmit={handleSaveDelivery} className="space-y-6">
              <div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Delivery ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Delivery ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={deliveryFormData.delivery_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed text-sm"
                      placeholder="Auto-generated"
                    />
                  </div>

                  {/* Shipment ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Shipment ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={deliveryFormData.shipment_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed text-sm"
                      placeholder="Auto-populated"
                    />
                  </div>

                  {/* Vendor ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vendor ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={deliveryFormData.vendor_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed text-sm"
                      placeholder="Auto-populated"
                    />
                  </div>

                  {/* Vendor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={deliveryFormData.vendor_name}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed text-sm"
                      placeholder="Auto-populated"
                    />
                  </div>

                  {/* Invoice ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Invoice ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={deliveryFormData.invoice_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed text-sm"
                      placeholder="Auto-populated"
                    />
                  </div>

                  {/* Document */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Document
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                    />
                  </div>

                  {/* Remarks Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={deliveryFormData.remarks}
                      onChange={(e) => handleInputChange("remarks", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      placeholder="Additional remarks"
                      rows={1}
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Items Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delivery Items
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="px-3 py-1.25 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <MdAdd className="w-5 h-5" />
                    Add Item
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-950">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Item Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Item Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            PO #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedDeliveryItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                  No items selected for delivery
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setIsAddItemModalOpen(true)}
                                  className="px-3 py-1.25 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                                >
                                  <MdAdd className="w-5 h-5" />
                                  Add Item
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          selectedDeliveryItems.map((item, index) => (
                            <tr
                              key={index}
                              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {item.item_code || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                {item.item || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                ${parseFloat(String(item.unit_price || 0)).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {item.shipment_quantity || 0}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                ${
                                  item.total
                                    ? parseFloat(String(item.total)).toFixed(2)
                                    : "0.00"
                                }
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {item.po_number || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                                {item.remarks || "-"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(index)}
                                  className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  title="Delete item"
                                >
                                  <MdDelete className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-end items-center gap-3 rounded-b-lg">
          {step === 1 ? (
            <>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                disabled={selectedItems.size === 0}
                onClick={handleProceedToNextStep}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Selected Items ({selectedItems.size})
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBackStep}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveDelivery}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  "Save Delivery"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const ReadyToShipModal = observer(AddDeliveryModalContent);
