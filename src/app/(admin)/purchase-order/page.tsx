"use client";

import AddPOModal from "@/components/modals/AddPOModal";
import Badge from "@/components/ui/badge/Badge";
import { useStore } from "@/store/store-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { observer } from "mobx-react-lite";
import { Fragment, useEffect, useState } from "react";
import { AiOutlineCheck } from "react-icons/ai";
import { MdArrowDropDown, MdClose } from "react-icons/md";
import { toast } from "react-toastify";

interface PurchaseOrder {
  po_number: string;
  po_issue_date: string;
  po_status: "Pending" | "Shipped" | "Production" | "Completed";
  vendor_id: string;
  vendor_name?: string;
  InfoveaveBatchId: number;
  ROWID: number;
}

interface PurchaseOrderItem {
  po_number: string;
  item_code: string;
  item: string;
  unit_price: number;
  quantity: number;
  status: string;
  step_name: string;
  document: string;
  work_order_created: string;
  InfoveaveBatchId: number;
  ROWID: number;
  total?: number;
  po_status?: string;
  vendor_id?: string;
  remarks?: string;
  vendor_name?: string;
  step_history?: string;
  [key: string]: any;
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

export default observer(function PurchaseOrderPage() {
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const [expandedPOs, setExpandedPOs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isAddPOModalOpen, setIsAddPOModalOpen] = useState(false);

  // Fetch auth token - refresh on component mount
  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  // Get the current user from the store
  const user = nguageStore.currentUser;

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading, error } = useQuery({
    queryKey: ["purchaseOrders", authToken],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const response = await axios.post(
        "/api/GetAllData",
        {
          table: "PurchaseOrder",
          skip: 0,
          take: null,
          NGaugeId: undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        },
      );
      return response.data.data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken,
  });

  // Fetch PO items
  const { data: poItems = [] } = useQuery({
    queryKey: ["poItems", authToken],
    queryFn: async (): Promise<PurchaseOrderItem[]> => {
      const response = await axios.post(
        "/api/GetPOItems",
        {
          table: "PurchaseOrder",
          skip: 0,
          take: null,
          NGaugeId: undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        },
      );
      return (response.data.data || []).map((item: Record<string, unknown>) => {
        // Find the calculated total field from the API response
        const totalKey = Object.keys(item).find(
          (key) => key.includes("@unit_price * @quantity") || key.includes("expression")
        );
        const total = totalKey ? (item[totalKey] as number) : (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
        
        return {
          po_number: item.po_number as string,
          item_code: item.item_code as string,
          item: item.item as string,
          unit_price: Number(item.unit_price) || 0,
          quantity: Number(item.quantity) || 0,
          status: item.status as string,
          step_name: item.step_name as string,
          document: (item.document as string) || null,
          work_order_created: (item.work_order_created as string) || null,
          vendor_name: (item.vendor_name as string) || null,
          InfoveaveBatchId: item.InfoveaveBatchId as number,
          ROWID: item.ROWID as number,
          total: total,
        };
      });
    },
    staleTime: 0,
    gcTime: 0,
    enabled: !!authToken,
  });

  // Function to highlight search term in text
  const highlightText = (text: string | null | undefined, highlight: string) => {
    if (!text) return text;
    if (!highlight.trim()) return text;
    
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-300 dark:bg-yellow-400 dark:text-gray-900 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const formatNumber = (num: number) => {
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Filter items based on search term
  const filteredPoItems = searchTerm.trim() === ""
    ? poItems
    : poItems.filter((item) =>
        (item.item && item.item.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.vendor_name && item.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.po_number && item.po_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  const itemsByPO = filteredPoItems.reduce(
    (acc, item) => {
      if (!acc[item.po_number]) {
        acc[item.po_number] = [];
      }
      acc[item.po_number].push(item);
      return acc;
    },
    {} as Record<string, PurchaseOrderItem[]>,
  );

  // Auto-expand accordion when search term exists
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      // Expand all POs that have matching items
      const matchingPOs = new Set(filteredPoItems.map((item) => item.po_number));
      setExpandedPOs(matchingPOs);
    } else {
      // Collapse all when search is cleared
      setExpandedPOs(new Set());
    }
  }, [searchTerm]);

  const togglePO = (poNumber: string) => {
    const newExpandedPOs = new Set(expandedPOs);
    if (newExpandedPOs.has(poNumber)) {
      newExpandedPOs.delete(poNumber);
    } else {
      // If no search term, only allow one accordion open at a time
      if (searchTerm.trim() === "") {
        newExpandedPOs.clear();
      }
      newExpandedPOs.add(poNumber);
    }
    setExpandedPOs(newExpandedPOs);
  };

  const handleCreateWorkOrder = async (item: PurchaseOrderItem) => {
    if (!authToken) {
      toast.error("No auth token available");
      return;
    }

    try {
      // Fetch the latest row data
      const response = await axios.post(
        "/api/GetRowData",
        {
          ROWID: item.ROWID,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const latestRowData = response.data.data;

      // Update work_order_created to "Yes"
      const updatedData = {
        ...latestRowData,
        ROWID: item.ROWID,
        work_order_created: "Yes",
      };

      // Save the updated data
      const saveResponse = await axios.put(
        "/api/EditRow",
        updatedData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      const payloadForWorkOrder = {
        ...latestRowData,
        step: "Step 1",
        step_name: null,
        document: null,
        remarks: "",
        start_date: new Date().toISOString().split('T')[0]
      }

      // Add work order row to work_order table
      await nguageStore.AddDataSourceRow(
        payloadForWorkOrder,
        44,
        "work_order"
      );

      toast.success(
        <span>
          Work order created for <b>{item.item}</b>!
        </span>
      );

      // Refetch the updated data
      await queryClient.invalidateQueries({ queryKey: ["poItems"] });
      await queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    } catch (error) {
      console.error("Failed to create work order:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response error details:", error.response.data);
        toast.error(`Failed to create work order: ${error.response.data?.message || "Unknown error"}`);
      } else {
        toast.error("Failed to create work order");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        {/* Header with Title and Search */}
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
            <div className="flex items-center gap-3 flex-1 max-w-[460px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by PO number/Item name/Vendor name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.25 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Clear search"
                  >
                    <MdClose className="w-5 h-5" />
                  </button>
                )}
              </div>
              {user?.roleId === 5 && (
                <button
                  onClick={() => setIsAddPOModalOpen(true)}
                  className="px-4 py-2.25 bg-blue-800 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  + ADD PO
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin">
                <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          ) : error ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-error-600 dark:text-error-400">
              Failed to fetch purchase orders
            </p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-600 dark:text-gray-400">No purchase orders found</p>
          </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-900 bg-blue-800 dark:bg-blue-700">
                    <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                      PO Number
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                      Issue Date
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">
                      Vendor Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po: PurchaseOrder) => (
                    <Fragment key={po.po_number}>
                      <tr
                        key={po.po_number}
                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors cursor-pointer group"
                        onClick={() => togglePO(po.po_number)}
                      >
                        <td className="pl-1 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                          <div className="flex items-center gap-1">
                            <MdArrowDropDown 
                              className={`w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-transform duration-200 ${expandedPOs.has(po.po_number) ? '' : '-rotate-90'}`}
                            />
                            {searchTerm ? highlightText(po.po_number, searchTerm) : po.po_number}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                          {po.po_issue_date ? new Date(po.po_issue_date).toLocaleDateString() : ""}
                        </td>
                        <td className="px-5 py-4">
                          <Badge color={getStatusColor(po.po_status)} variant="solid">
                            {po.po_status.charAt(0).toUpperCase() + po.po_status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                          {searchTerm ? highlightText(po.vendor_name || po.vendor_id, searchTerm) : (po.vendor_name || po.vendor_id)}
                        </td>
                      </tr>

                      {expandedPOs.has(po.po_number) && itemsByPO[po.po_number] && itemsByPO[po.po_number].length > 0 && (
                        <>
                          <tr className="border-b border-gray-100 dark:border-white/5 bg-blue-100 dark:bg-blue-900/40">
                            <td colSpan={4} className="px-5 py-3">
                              <div className="grid gap-6" style={{ gridTemplateColumns: '1.2fr 2fr 1fr 0.6fr 1fr 0.9fr' }}>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Code</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Name</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Unit Price</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Qty</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Total</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">WO Created</div>
                              </div>
                            </td>
                          </tr>
                          {itemsByPO[po.po_number].map((item: PurchaseOrderItem) => (
                            <tr
                              key={item.ROWID}
                              className="border-b border-gray-100 dark:border-white/5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <td colSpan={4} className="px-5 py-4">
                                <div className="grid gap-6 text-sm" style={{ gridTemplateColumns: '1.2fr 2fr 1fr 0.6fr 1fr 0.9fr' }}>
                                  <div className="text-gray-700 dark:text-gray-300">{item.item_code}</div>
                                  <div className="text-gray-700 dark:text-gray-300">
                                    {searchTerm ? highlightText(item.item, searchTerm) : item.item}
                                  </div>
                                  <div className="text-gray-700 dark:text-gray-300">$ {formatNumber(item.unit_price)}</div>
                                  <div className="text-gray-700 dark:text-gray-300">{item.quantity}</div>
                                  <div className="text-gray-700 dark:text-gray-300 font-semibold">$ {formatNumber(item.total || 0)}</div>
                                  <div>
                                    {item.work_order_created === "Yes" ? (
                                      <Badge color="success" variant="solid" size="sm">
                                        Yes
                                      </Badge>
                                    ) : (
                                      <>
                                        {user?.roleId !== 5 ? (
                                          <button
                                            onClick={() => handleCreateWorkOrder(item)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                            title="Create Work Order"
                                          >
                                            <AiOutlineCheck className="w-4 h-4" />
                                            Create WO
                                          </button>
                                        ) : (
                                          <Badge color="error" variant="solid" size="sm">
                                            No
                                          </Badge>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Add PO Modal */}
      <AddPOModal
        isOpen={isAddPOModalOpen}
        onClose={() => setIsAddPOModalOpen(false)}
      />
    </div>
  );
});

