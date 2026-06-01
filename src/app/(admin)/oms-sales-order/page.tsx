"use client";

import Badge from "@/components/ui/badge/Badge";
import { useTranslation } from "@/i18n";
import { useStore } from "@/store/store-context";
import { QueryKeys } from "@/types/query-keys";
import { useQuery } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { MdArrowDropDown, MdClose, MdEdit } from "react-icons/md";

interface SalesOrder {
  sap_order: string;
  oms_order: string;
  order_date: string;
  total_skus: number;
  order_quantity: number;
  total_back_order: number;
  gross_value: number;
  status: "Pending" | "Completed" | "Cancelled" | "Processing";
  credit_status: string;
  delivery_code: number;
  cart_details: string; // JSON string
  InfoveaveBatchId: number;
  created_at: string | null;
  ROWID: number;
}

interface CartItem {
  sku: string;
  product_name: string;
  price: number;
  image: string;
  stock_in_hand: number;
  minimum_order_quantity: number;
  quantity: number;
  back_order: number;
  customer_username: string;
  InfoveaveBatchId: number;
  total: number;
  ROWID: number;
}

const getStatusColor = (
  status: string,
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" => {
  const lowerStatus = status.toLowerCase();
  switch (lowerStatus) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "processing":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "primary";
  }
};

export default observer(function SalesOrderPage() {
  const { nguageStore } = useStore();
  const { t } = useTranslation();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [openDocumentsString, setOpenDocumentsString] = useState<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  // Fetch auth token
  const { data: authToken = null } = useQuery({
    queryKey: [QueryKeys.AuthToken],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch sales orders
  const { data: salesOrders = [], isLoading, error } = useQuery({
    queryKey: ["salesOrders", authToken],
    queryFn: async (): Promise<SalesOrder[]> => {
      const result = await nguageStore.GetPaginationData({
        table: "customer_order_list",
        skip: 0,
        take: 100,
        NGaugeId: "75",
      });
      return (result || []) as SalesOrder[];
    },
    staleTime: 0,
    enabled: !!authToken,
  });

  // Parse cart_details JSON safely
  const parseCartDetails = (cartDetailsStr: string): CartItem[] => {
    try {
      return JSON.parse(cartDetailsStr) as CartItem[];
    } catch {
      return [];
    }
  };

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

  const formatNumber = (num: number) =>
    Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Filter orders by search term
  const filteredOrders = searchTerm.trim() === ""
    ? salesOrders
    : salesOrders.filter((order) => {
        const cartItems = parseCartDetails(order.cart_details);
        return (
          order.oms_order?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.sap_order?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cartItems.some(item => item.sku?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          cartItems.some(item => item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });

  // Auto-expand when searching
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      setExpandedOrders(new Set(filteredOrders.map((o) => o.oms_order)));
    } else {
      setExpandedOrders(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const toggleOrder = (omsOrder: string) => {
    const next = new Set(expandedOrders);
    if (next.has(omsOrder)) {
      next.delete(omsOrder);
    } else {
      if (searchTerm.trim() === "") next.clear();
      next.add(omsOrder);
    }
    setExpandedOrders(next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">OMS Sales Orders</h2>
            <div className="flex items-center gap-3 flex-1 max-w-115">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by OMS order / SAP order / SKU / Product Name"
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
              <p className="text-error-600 dark:text-error-400">Failed to fetch sales orders</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No sales orders found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3">
              <div className="w-full">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-blue-900 bg-blue-800 dark:bg-blue-700">
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">OMS Order</th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">SAP Order</th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">Order Date</th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">Total SKUs</th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">Order Qty</th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">Gross Value</th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">Credit Status</th>
                      <th className="px-5 py-3 text-left font-medium text-white text-xs uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order: SalesOrder) => {
                      const cartItems = parseCartDetails(order.cart_details);
                      return (
                        <Fragment key={order.oms_order}>
                          {/* Main Order Row */}
                          <tr
                            className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors cursor-pointer group"
                            onClick={() => toggleOrder(order.oms_order)}
                          >
                            <td className="pl-1 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                              <div className="flex items-center gap-1">
                                <MdArrowDropDown
                                  className={`w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-transform duration-200 ${expandedOrders.has(order.oms_order) ? "" : "-rotate-90"}`}
                                />
                                {searchTerm ? highlightText(order.oms_order, searchTerm) : order.oms_order}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                              {searchTerm ? highlightText(order.sap_order, searchTerm) : order.sap_order}
                            </td>
                            <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                              {order.order_date ? new Date(order.order_date).toLocaleDateString() : ""}
                            </td>
                            <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                              {order.total_skus}
                            </td>
                            <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                              {formatNumber(order.order_quantity)}
                            </td>
                            <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm font-semibold">
                              $ {formatNumber(order.gross_value)}
                            </td>
                            <td className="px-5 py-4 text-gray-600 dark:text-gray-400 text-sm">
                              {order.credit_status || "-"}
                            </td>
                            <td className="px-5 py-4">
                              <Badge color={getStatusColor(order.status)} variant="solid">
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </td>
                          </tr>

                          {/* Expanded Cart Items */}
                          {expandedOrders.has(order.oms_order) && cartItems.length > 0 && (
                            <>
                              {/* Cart Items Header */}
                              <tr className="border-b border-gray-100 dark:border-white/5 bg-blue-100 dark:bg-blue-900/40">
                                <td colSpan={8} className="px-5 py-3">
                                  <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 2.5fr 1fr 0.8fr 0.8fr 1fr' }}>
                                    <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">SKU</div>
                                    <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Product Name</div>
                                    <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Unit Price</div>
                                    <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Qty</div>
                                    <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Back Order</div>
                                    <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Total</div>
                                  </div>
                                </td>
                              </tr>

                              {/* Cart Item Rows */}
                              {cartItems.map((item: CartItem) => (
                                <tr
                                  key={item.ROWID}
                                  className="border-b border-gray-100 dark:border-white/5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                  <td colSpan={8} className="px-5 py-3">
                                    <div className="grid gap-4 text-sm" style={{ gridTemplateColumns: '1.2fr 2.5fr 1fr 0.8fr 0.8fr 1fr' }}>
                                      <div className="text-gray-700 dark:text-gray-300 font-mono text-xs">{searchTerm ? highlightText(item.sku, searchTerm) : item.sku}</div>
                                      <div className="text-gray-700 dark:text-gray-300">{searchTerm ? highlightText(item.product_name, searchTerm) : item.product_name}</div>
                                      <div className="text-gray-700 dark:text-gray-300">$ {formatNumber(item.price)}</div>
                                      <div className="text-gray-700 dark:text-gray-300">{item.quantity}</div>
                                      <div className="text-gray-700 dark:text-gray-300">{item.back_order}</div>
                                      <div className="text-gray-700 dark:text-gray-300 font-semibold">$ {formatNumber(item.total)}</div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});