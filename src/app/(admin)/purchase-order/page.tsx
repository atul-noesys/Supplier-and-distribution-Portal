"use client";

import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import axios from "axios";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface PurchaseOrder {
  po_number: string;
  po_issue_date: string;
  po_status: "pending" | "approved" | "delivered" | "cancelled";
  vendor_id: string;
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
  InfoveaveBatchId: number;
  ROWID: number;
  total?: number;
}

const getStatusColor = (
  status: "pending" | "approved" | "delivered" | "cancelled",
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  switch (status.toLowerCase()) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "delivered":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "primary";
  }
};

let authToken: string | null = null;

const fetchPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
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
};

const fetchPOItems = async (): Promise<PurchaseOrderItem[]> => {
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

  return (response.data.data || []).map((item: Record<string, unknown>) => ({
    po_number: item.po_number as string,
    item_code: item.item_code as string,
    item: item.item as string,
    unit_price: item.unit_price as number,
    quantity: item.quantity as number,
    status: item.status as string,
    InfoveaveBatchId: item.InfoveaveBatchId as number,
    ROWID: item.ROWID as number,
    total: (item.unit_price as number) * (item.quantity as number),
  }));
};

export default function PurchaseOrderPage() {
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  // Initialize auth token on client mount
  useEffect(() => {
    authToken = localStorage.getItem("access_token");
  }, []);

  const { data: purchaseOrders = [], isLoading, error } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: fetchPurchaseOrders,
    staleTime: 5 * 60 * 1000,
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ["poItems"],
    queryFn: fetchPOItems,
    staleTime: 5 * 60 * 1000,
  });

  const itemsByPO = poItems.reduce(
    (acc, item) => {
      if (!acc[item.po_number]) {
        acc[item.po_number] = [];
      }
      acc[item.po_number].push(item);
      return acc;
    },
    {} as Record<string, PurchaseOrderItem[]>,
  );

  const togglePO = (poNumber: string) => {
    setExpandedPO(expandedPO === poNumber ? null : poNumber);
  };

  return (
    <div className="space-y-6">
      <ComponentCard title="Purchase Orders">
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
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03]">
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
                      Vendor ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po: PurchaseOrder) => (
                    <>
                      <tr
                        key={po.po_number}
                        className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                        onClick={() => togglePO(po.po_number)}
                      >
                        <td className="px-5 py-4 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-base text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                              {expandedPO === po.po_number ? "▼" : "▶"}
                            </span>
                            {po.po_number}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                          {po.po_issue_date}
                        </td>
                        <td className="px-5 py-4">
                          <Badge color={getStatusColor(po.po_status)} variant="solid">
                            {po.po_status.charAt(0).toUpperCase() + po.po_status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                          {po.vendor_id}
                        </td>
                      </tr>

                      {expandedPO === po.po_number && itemsByPO[po.po_number] && itemsByPO[po.po_number].length > 0 && (
                        <>
                          <tr className="border-b border-gray-100 dark:border-white/[0.05] bg-blue-100 dark:bg-blue-900/40">
                            <td colSpan={4} className="px-5 py-3">
                              <div className="grid grid-cols-6 gap-6">
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Code</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Description</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Unit Price</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Qty</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Total</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Status</div>
                              </div>
                            </td>
                          </tr>
                          {itemsByPO[po.po_number].map((item: PurchaseOrderItem) => (
                            <tr
                              key={item.ROWID}
                              className="border-b border-gray-100 dark:border-white/[0.05] bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <td colSpan={4} className="px-5 py-4">
                                <div className="grid grid-cols-6 gap-6 text-sm">
                                  <div className="text-gray-700 dark:text-gray-300">{item.item_code}</div>
                                  <div className="text-gray-700 dark:text-gray-300">{item.item}</div>
                                  <div className="text-gray-700 dark:text-gray-300">${item.unit_price}</div>
                                  <div className="text-gray-700 dark:text-gray-300">{item.quantity}</div>
                                  <div className="text-gray-700 dark:text-gray-300 font-semibold">${item.total}</div>
                                  <div>
                                    <Badge color="blue" variant="solid" size="sm">
                                      {item.status}
                                    </Badge>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}

