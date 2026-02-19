"use client";

import DatePicker from "@/components/form/date-picker";
import { useStore } from "@/store/store-context";
import { KeyValueRecord, RowData, ShipmentItem } from "@/types/nguage-rowdata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { observer } from "mobx-react-lite";
import React, { useState, useEffect } from "react";
import { MdAdd, MdClose, MdDelete, MdEdit } from "react-icons/md";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { EditShipmentItemModal } from "./EditShipmentItemModal";
import { AddItemFromWorkOrderModal } from "./AddItemFromWorkOrderModal";
import Badge from "@/components/ui/badge/Badge";

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

const getStatusColor = (
  status: "Pending" | "Shipped" | "Production" | "Completed" | "pending" | "approved" | "delivered" | "cancelled",
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case "completed":
    case "delivered":
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "shipped":
    case "production":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "primary";
  }
};

function AddShipmentModalContent({
  isOpen,
  onClose,
  onSuccess,
}: AddShipmentModalProps) {
  const { nguageStore, shipmentStore } = useStore();
  const queryClient = useQueryClient();

  // State Management
  const [step, setStep] = useState(1); // 1: Work Order Selection, 2: Shipment Form
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shipmentData, setShipmentData] = useState<KeyValueRecord | null>(null);
  const [selectedWorkOrders, setSelectedWorkOrders] = useState<RowData[]>([]);
  const [workOrderSelections, setWorkOrderSelections] = useState<Set<string>>(new Set());
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isAddItemFromWOModalOpen, setIsAddItemFromWOModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReadyToShipSaving, setIsReadyToShipSaving] = useState(false);

  // Fetch pagination data using TanStack Query
  const { data: paginationData, refetch, isLoading: isLoadingVendor } = useQuery({
    queryKey: ["paginationData", "userregistration"],
    queryFn: () =>
      nguageStore.GetPaginationData({
        table: "userregistration",
        skip: 0,
        take: 200,
        NGaugeId: "31",
      }),
    staleTime: 0,
    enabled: isOpen,
  });

  const user = nguageStore.currentUser;
  const vendorList = Array.isArray(paginationData) ? paginationData : paginationData?.data || [];
  const currentLoggedInVendor = vendorList.find(
    (vendor) =>
      vendor.business_email === user?.email &&
      vendor.first_name === user?.firstName &&
      vendor.last_name === user?.lastName &&
      vendor.is_account_created === "true"
  );

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

  // Check if modal is opened in edit mode and initialize accordingly
  useEffect(() => {
    if (isOpen) {
      const currentShipment = shipmentStore.getCurrentShipment();
      const currentItems = shipmentStore.getCurrentShipmentItems();

      if (currentShipment) {
        // Edit mode: populate form with existing shipment data
        setFormData({
          shipment_id: currentShipment.shipment_id || "",
          carrier_name: currentShipment.carrier_name || "",
          shipment_date: currentShipment.shipment_date || "",
          estimated_delivery_date: currentShipment.estimated_delivery_date || "",
          actual_delivery_date: currentShipment.actual_delivery_date || "",
          tracking_number: currentShipment.tracking_number || "",
          invoice_id: currentShipment.invoice_id || "",
          document: currentShipment.document || "",
          remarks: currentShipment.remarks || "",
        });

        // Load shipment items from currentShipmentItems
        shipmentStore.clearItems();
        currentItems.forEach((item) => {
          const shipmentItem: ShipmentItem = {
            item_code: item.item_code || "",
            item: item.item || "",
            unit_price: item.unit_price || 0,
            shipment_quantity: item.shipment_quantity || 0,
            total: item.total || 0,
            po_number: item.po_number || "",
            shipment_status: item.shipment_status || "Pending",
            work_order_id: item.work_order_id || "",
            document: item.document || "",
            ROWID: item.ROWID || "",
          };
          shipmentStore.addItem(shipmentItem);
        });

        // Set shipmentData so it shows the items step
        setShipmentData(currentShipment as KeyValueRecord);
        setIsEditMode(true);

        // Go directly to step 2 (shipment form with items)
        setStep(2);
      } else {
        setIsEditMode(false);
      }
    }
  }, [isOpen, shipmentStore]);

  // Fetch work orders
  const { data: workOrders = [], isLoading: isLoadingWorkOrders, refetch: refetchWorkOrders } = useQuery({
    queryKey: ["workOrders", isOpen],
    queryFn: async (): Promise<RowData[]> => {
      const response = await nguageStore.GetPaginationData({
        table: "work_order",
        skip: 0,
        take: 500,
        NGaugeId: "44",
      });

      let items = response?.data || response || [];

      //filter only those which are in Step 5 (Completed)
      if (Array.isArray(items)) {
        items = items.filter((e) => e.step === "Step 5");
      }
      return Array.isArray(items) ? (items as RowData[]) : [];
    },
    staleTime: 0,
    enabled: isOpen,
  });

  // Fetch PO items for mapping quantity, unit_price, and total
  const { data: poItems = [], refetch: refetchPoItems } = useQuery({
    queryKey: ["poItems", isOpen],
    queryFn: async (): Promise<RowData[]> => {
      try {
        const authToken = localStorage.getItem("access_token");
        const response = await axios.post(
          "/api/GetPOItems",
          {
            table: "PurchaseOrder",
            skip: 0,
            take: 500,
            NGaugeId: undefined,
          },
          {
            headers: {
              "Content-Type": "application/json",
              ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
          }
        );

        const items = response.data.data || [];
        console.log("PO Items fetched:", items);
        return Array.isArray(items) ? items : [];
      } catch (error) {
        console.error("Error fetching PO items:", error);
        return [];
      }
    },
    staleTime: 0,
    enabled: isOpen,
  });

  // Helper function to get the work order ID from expression field
  const getWorkOrderId = (workOrder: RowData): string => {
    // Find the expression key that contains the computed work order ID
    const expressionKey = Object.keys(workOrder).find(
      (key) => key.includes("expression") && key.includes("po_number") && key.includes("item_code")
    );
    if (expressionKey) {
      return String(workOrder[expressionKey] || "");
    }
    return `${workOrder.po_number || ""}-${workOrder.item_code || ""}`;
  };

  // Helper function to get the total from the expression field
  const getTotalFromExpression = (item: RowData): number => {
    const expressionKey = Object.keys(item).find(
      (key) => key.includes("expression") && key.includes("unit_price") && key.includes("quantity")
    );
    if (expressionKey) {
      return Number(item[expressionKey] || 0);
    }
    return Number(item.unit_price || 0) * Number(item.quantity || 0);
  };

  // Merge work orders with PO items data
  const enrichedWorkOrders: (RowData & { quantity?: string | number; unit_price?: string | number; total?: number; workOrderId?: string })[] = workOrders.map((workOrder) => {
    // Find matching PO item by po_number and item_code
    const matchingPoItem = poItems.find(
      (poItem) =>
        String(poItem.po_number).trim() === String(workOrder.po_number).trim() &&
        String(poItem.item_code).trim() === String(workOrder.item_code).trim()
    );

    const quantity = matchingPoItem?.quantity ? Number(matchingPoItem.quantity) : 0;
    const unitPrice = matchingPoItem?.unit_price ? Number(matchingPoItem.unit_price) : 0;
    const total = quantity && unitPrice ? quantity * unitPrice : 0;

    console.log(`WO: ${workOrder.po_number} - ${workOrder.item_code} => Matched: ${!!matchingPoItem}, Qty: ${quantity}, Price: ${unitPrice}, Total: ${total}`);

    return {
      ...workOrder,
      quantity,
      unit_price: unitPrice,
      total,
      workOrderId: getWorkOrderId(workOrder),
    } as RowData & { quantity?: string | number; unit_price?: string | number; total?: number; workOrderId?: string };
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

  const handleToggleWorkOrder = (workOrderId: string) => {
    const newSelections = new Set(workOrderSelections);
    if (newSelections.has(workOrderId)) {
      newSelections.delete(workOrderId);
    } else {
      newSelections.add(workOrderId);
    }
    setWorkOrderSelections(newSelections);
  };

  const handleAddSelectedWorkOrders = () => {
    if (workOrderSelections.size === 0) {
      toast.warning("Please select at least one work order");
      return;
    }

    const selected = enrichedWorkOrders.filter((wo) => {
      const woId = getWorkOrderId(wo);
      return workOrderSelections.has(woId);
    });

    setSelectedWorkOrders(selected);
    shipmentStore.clearItems();

    // Convert work orders to shipment items format
    selected.forEach((wo) => {
      const item: ShipmentItem = {
        item_code: wo.item_code || "",
        item: wo.item || "",
        unit_price: wo.unit_price || 0,
        shipment_quantity: wo.quantity || 0,
        total: (Number(wo.unit_price || 0) * Number(wo.quantity || 0)),
        po_number: wo.po_number || "",
        shipment_status: "Pending",
        work_order_id: getWorkOrderId(wo),
        document: "",
      };
      shipmentStore.addItem(item);
    });

    setWorkOrderSelections(new Set());
    setStep(2);
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

    setIsSaving(true);

    try {
      let shipmentToSave = toRowData(formData);

      // Get the current shipment for ROWID
      const currentShipment = shipmentStore.getCurrentShipment();
      const isInEditMode = isEditMode && currentShipment?.ROWID;

      if (isInEditMode) {
        // Edit mode: Update existing shipment using UpdateRowDataDynamic
        console.log("Updating Shipment (Edit Mode):", formData, "ROWID:", currentShipment.ROWID);

        shipmentToSave = {
          ...shipmentToSave,
          shipment_status: "In draft",
          vendor_id: currentLoggedInVendor?.vendor_id || "",
          vendor_name: currentLoggedInVendor?.company_name || "",
        }

        const result = await nguageStore.UpdateRowDataDynamic(
          shipmentToSave,
          String(currentShipment.ROWID),
          52,
          "shipment_list"
        );

        if (!result.result) {
          toast.error(`Failed to update: ${result.error}`);
          return;
        }

        toast.success("Shipment updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["shipmentList"] });
        queryClient.invalidateQueries({ queryKey: ["shipmentItems"] });
      } else {
        // Create mode: Add new shipment
        console.log("Saving Shipment (Create Mode):", formData);

        shipmentToSave = {
          ...shipmentToSave,
          shipment_status: "In draft",
          vendor_id: currentLoggedInVendor?.vendor_id || "",
          vendor_name: currentLoggedInVendor?.company_name || "",
        }

        const result = await nguageStore.AddDataSourceRow(
          shipmentToSave,
          52,
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
          const rowDataResponse = await nguageStore.GetRowData(52, rowId ?? '1', 'shipment_list');
          if (rowDataResponse) {
            fetchedData = rowDataResponse as KeyValueRecord;
          }
        } catch (fetchError) {
          console.warn('Failed to fetch row data:', fetchError);
        }

        // Use fetched data if available, otherwise use form data with the generated shipment_id
        const finalShipmentData = fetchedData || { ...formData, shipment_id: rowId || 'SID-****' };
        setShipmentData(finalShipmentData);

        // Update all items in store with shipment_id
        const shipmentIdToUse = String(finalShipmentData.shipment_id || rowId || 'SID-****');
        shipmentStore.shipmentItems.forEach((item, index) => {
          shipmentStore.updateItem(index, {
            ...item,
            shipment_id: shipmentIdToUse,
          });
        });

        toast.success("Shipment saved successfully! Now you can add items.");
      }
    } catch (error) {
      console.error("Error saving shipment:", error);
      toast.error("Failed to save shipment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReadyToShip = async () => {
    setIsReadyToShipSaving(true);
    try {
      const currentShipment = shipmentStore.getCurrentShipment();
      if (!currentShipment?.ROWID) {
        toast.error("Shipment not found");
        return;
      }

      let shipmentToSave = toRowData(formData);

      shipmentToSave = {
        ...shipmentToSave,
        shipment_status: "Ready to ship",
        vendor_id: currentLoggedInVendor?.vendor_id || "",
        vendor_name: currentLoggedInVendor?.company_name || "",
      }

      const result = await nguageStore.UpdateRowDataDynamic(
        shipmentToSave,
        String(currentShipment.ROWID),
        52,
        "shipment_list"
      );

      if (!result.result) {
        toast.error(`Failed to update: ${result.error}`);
        return;
      }

      toast.success("Shipment status updated to 'Ready to ship'!");
      queryClient.invalidateQueries({ queryKey: ["shipmentList"] });
      queryClient.invalidateQueries({ queryKey: ["shipmentItems"] });
      handleClose();
    } catch (error) {
      console.error("Error updating shipment status:", error);
      toast.error("Failed to update shipment status");
    } finally {
      setIsReadyToShipSaving(false);
    }
  };

  const handleSubmitItems = async () => {
    setIsLoading(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      // Save each item one by one
      for (const item of shipmentStore.shipmentItems) {
        try {
          const itemToSave = toRowData(item);

          const result = await nguageStore.AddDataSourceRow(
            itemToSave,
            47,
            "shipment_list_items"
          );

          if (!result.error) {
            successCount++;
          } else {
            failureCount++;
            console.error(`Failed to save item ${item.item_code}:`, result.error);
          }
        } catch (itemError) {
          failureCount++;
          console.error(`Error saving item ${item.item_code}:`, itemError);
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully saved ${successCount} shipment item${successCount !== 1 ? 's' : ''}${failureCount > 0 ? ` (${failureCount} failed)` : ''
          }`
        );
        handleClose();
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: ["workOrderItems"] });
        queryClient.invalidateQueries({ queryKey: ["shipmentItems"] });
      }

      if (failureCount > 0 && successCount === 0) {
        toast.error("Failed to save shipment items");
      }
    } catch (error) {
      console.error("Error submitting items:", error);
      toast.error("Failed to submit shipment items");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenItemModal = () => {
    // Open the work order selection modal
    setIsAddItemFromWOModalOpen(true);
  };

  const handleAddItemFromWorkOrder = (item: ShipmentItem) => {
    // Add the item to the store
    shipmentStore.addItem(item);
    toast.success("Item added successfully!");
  };

  const handleSaveItem = (updates: Partial<ShipmentItem>) => {
    if (editingItemIndex !== null) {
      // Update existing item
      const currentItem = shipmentStore.shipmentItems[editingItemIndex];
      const updatedItem: ShipmentItem = {
        ...currentItem,
        ...updates,
      } as ShipmentItem;
      shipmentStore.updateItem(editingItemIndex, updatedItem);
      // Close modal after saving
      setEditingItemIndex(null);
    }
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
  };

  const handleDeleteItem = (index: number) => {
    shipmentStore.deleteItem(index);
    toast.success('Item removed');
  };

  const handleClose = () => {
    setStep(1);
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
    setSelectedWorkOrders([]);
    setWorkOrderSelections(new Set());
    shipmentStore.clearItems();
    shipmentStore.clearCurrentShipment();
    setEditingItemIndex(null);
    setIsEditMode(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-4/5 h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {shipmentStore.getCurrentShipment() ? "Edit Shipment" : "Add New Shipment"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-900"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {step === 1 ? (
            // Work Order Selection Step
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Available Work Orders
                </h3>
              </div>

              {isLoadingWorkOrders ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin">
                    <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                </div>
              ) : enrichedWorkOrders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-gray-600 dark:text-gray-400">No work orders available</p>
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
                              checked={workOrderSelections.size === enrichedWorkOrders.length && enrichedWorkOrders.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWorkOrderSelections(
                                    new Set(enrichedWorkOrders.map((wo) => getWorkOrderId(wo)))
                                  );
                                } else {
                                  setWorkOrderSelections(new Set());
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">WO ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Code</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">PO #</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Unit Price</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Vendor</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Step</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {enrichedWorkOrders.map((workOrder) => {
                          const woId = getWorkOrderId(workOrder);
                          const isSelected = workOrderSelections.has(woId);
                          return (
                            <tr
                              key={woId}
                              className={`transition-colors ${isSelected
                                ? "bg-blue-50 dark:bg-blue-900/30"
                                : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleWorkOrder(woId)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{woId}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{workOrder.item_code || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{workOrder.item || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{workOrder.po_number || '-'}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{workOrder.quantity || 0}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${Number(workOrder.unit_price || 0).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                ${(Number(workOrder.unit_price || 0) * Number(workOrder.quantity || 0)).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{workOrder.vendor_name || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                <Badge color={getStatusColor("Completed")} variant="solid">
                                  {workOrder.step || '-'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Shipment Form Step
            <form onSubmit={handleSaveShipment} className="space-y-8">
              {/* Shipment Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Shipment Details
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  {/* Shipment ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Shipment ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={String(shipmentData?.shipment_id ?? 'SID-****')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed text-sm"
                      placeholder="Auto-generated"
                    />
                  </div>

                  {/* Carrier Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Carrier Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.carrier_name as string}
                      onChange={(e) => handleInputChange("carrier_name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Shipment Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      id="shipment_date"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Est. Delivery Date
                    </label>
                    <DatePicker
                      id="estimated_delivery_date"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Actual Delivery Date
                    </label>
                    <DatePicker
                      id="actual_delivery_date"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tracking Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tracking_number as string}
                      onChange={(e) => handleInputChange("tracking_number", e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="e.g., TK-ENG-123456789"
                    />
                  </div>

                  {/* Invoice ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Invoice ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.invoice_id as string}
                      onChange={(e) => handleInputChange("invoice_id", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="e.g., AR-IPX-5454"
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
                      disabled={isUploadingDocument}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      accept=".pdf,.doc,.docx,.jpg,.png"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks as string}
                      onChange={(e) => handleInputChange("remarks", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      placeholder="Additional remarks"
                      rows={1}
                    />
                  </div>
                </div>
              </div>

              {/* Shipment Items Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Shipment Items ({shipmentStore.shipmentItems.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleOpenItemModal}
                    className="inline-flex items-center gap-2 px-3 py-1.25 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <MdAdd className="w-5 h-5" />
                    Add Item
                  </button>
                </div>

                {shipmentStore.shipmentItems.length === 0 ? (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-950">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Code</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Unit Price</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">PO #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Document</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Remarks</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={10}>
                              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800">
                                <p className="text-gray-600 dark:text-gray-400 mb-4">No items added yet</p>
                                <button
                                  type="button"
                                  onClick={handleOpenItemModal}
                                  className="inline-flex items-center gap-2 px-3 py-1.25 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <MdAdd className="w-4 h-4" />
                                  Add Item
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-900 dark:to-blue-950">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Code</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Item Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Unit Price</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">PO #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Document</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">Remarks</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {shipmentStore.shipmentItems.map((item, index) => (
                            <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.item_code}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{item.item}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${parseFloat(String(item.unit_price || 0)).toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.shipment_quantity}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${item.total ? parseFloat(String(item.total)).toFixed(2) : '0.00'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.po_number || '-'}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                                  {item.shipment_status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.document || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{item.remarks || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditItem(index)}
                                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                    title="Edit item"
                                  >
                                    <MdEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(index)}
                                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                    title="Delete item"
                                  >
                                    <MdDelete className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Edit Item Modal */}
        <EditShipmentItemModal
          isOpen={editingItemIndex !== null}
          item={editingItemIndex !== null ? shipmentStore.shipmentItems[editingItemIndex] : null}
          onClose={() => setEditingItemIndex(null)}
          onSave={handleSaveItem}
        />

        {/* Add Item From Work Order Modal */}
        <AddItemFromWorkOrderModal
          isOpen={isAddItemFromWOModalOpen}
          onClose={() => setIsAddItemFromWOModalOpen(false)}
          onAddItem={handleAddItemFromWorkOrder}
          availableWorkOrders={enrichedWorkOrders}
          selectedWorkOrderIds={shipmentStore.shipmentItems
            .map(item => String(item.work_order_id))
            .filter(id => id !== 'undefined' && id !== 'null')}
          shipmentId={String(shipmentData?.shipment_id || "")}
        />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-8 py-4 bg-gray-50 dark:bg-gray-800">
          {!isEditMode && <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            {step === 1 ? "Cancel" : "Close"}
          </button>}
          {step === 1 ? (
            <button
              type="button"
              disabled={workOrderSelections.size === 0 || isLoadingWorkOrders}
              onClick={handleAddSelectedWorkOrders}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              <MdAdd className="w-5 h-5" />
              Add Selected ({workOrderSelections.size})
            </button>
          ) : (
            <>
              {isEditMode ? (
                // Edit mode: Show Ready to Ship and Update Shipment buttons
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveShipment}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      "Update Draft"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleReadyToShip}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                  >
                    {isReadyToShipSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Preparing to Ship...
                      </>
                    ) : (
                      "Ready to Ship"
                    )}
                  </button>
                </>
              ) : !shipmentData ? (
                // Step 1: Save the shipment master record
                <button
                  type="button"
                  disabled={isSaving || shipmentStore.shipmentItems.length === 0}
                  onClick={handleSaveShipment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving Draft...
                    </>
                  ) : (
                    "Save Draft"
                  )}
                </button>
              ) : (
                // Step 2: Save the shipment items (after shipment is saved)
                <button
                  type="button"
                  disabled={isLoading || shipmentStore.shipmentItems.length === 0}
                  onClick={handleSubmitItems}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving Items...
                    </>
                  ) : (
                    "Save Items"
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default observer(AddShipmentModalContent);
