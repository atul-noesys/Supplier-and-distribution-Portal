"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { useStore } from "@/store/store-context";
import axios from "axios";
import { useEffect } from "react";

interface KanbanItem {
  po_number: string;
  item_code: string;
  item: string;
  unit_price: number;
  quantity: number;
  status: string;
  InfoveaveBatchId: number;
  po_status: string;
  vendor_id: string;
  vendor_name?: string;
  step_name?: string;
  remarks?: string;
  document?: string;
  step_history?: string;
  ROWID: number;
  [key: string]: any;
}

const fetchWorkOrderItems = async (nguageStore: any): Promise<KanbanItem[]> => {
  try {
    if (!nguageStore) {
      console.error("nguageStore is not available");
      return [];
    }

    // Fetch work order data
    const workOrderData = await nguageStore.GetPaginationData({
      table: "work_order",
      skip: 0,
      take: 500,
      NGaugeId: "44",
    });

    console.log("Work order response:", workOrderData);

    // Check if data exists and has items
    let workOrderItems: any[] = [];
    if (workOrderData) {
      // workOrderData might be the PaginationData object or directly the data array
      if (Array.isArray(workOrderData)) {
        workOrderItems = workOrderData;
      } else if (workOrderData.data && Array.isArray(workOrderData.data)) {
        workOrderItems = workOrderData.data;
      }
    }

    console.log("Work order items:", workOrderItems, "Count:", workOrderItems.length);

    if (workOrderItems.length === 0) {
      console.log("No work order data found");
      return [];
    }

    // Fetch PO items to get unit_price, quantity, and po_status
    let token = null;
    if (typeof window !== "undefined") {
      token = localStorage.getItem("access_token");
    }

    const poItemsResponse = await axios.post("/api/GetPOItems", {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const poItemsMap = new Map<string, any>();
    if (poItemsResponse.data && poItemsResponse.data.data) {
      poItemsResponse.data.data.forEach((item: any) => {
        const key = `${item.po_number}_${item.item_code}`;
        poItemsMap.set(key, item);
      });
    }

    console.log("PO items map size:", poItemsMap.size);

    // Merge work order data with PO items data
    const mergedItems = workOrderItems.map((woItem: any) => {
      const key = `${woItem.po_number}_${woItem.item_code}`;
      const poItem = poItemsMap.get(key);

      return {
        po_number: woItem.po_number,
        item_code: woItem.item_code,
        item: woItem.item,
        unit_price: poItem?.unit_price || 0,
        quantity: poItem?.quantity || 0,
        status: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"].includes(woItem.step)
          ? woItem.step
          : "Step 1",
        InfoveaveBatchId: woItem.InfoveaveBatchId || 0,
        po_status: poItem?.po_status || "Pending",
        vendor_id: woItem.vendor_id,
        vendor_name: woItem.vendor_name,
        step_name: woItem.step_name,
        remarks: woItem.remarks,
        document: woItem.document,
        step_history: poItem?.step_history,
        ROWID: woItem.ROWID,
      };
    });

    console.log("Merged items:", mergedItems, "Count:", mergedItems.length);
    return mergedItems;
  } catch (error) {
    console.error("Error fetching work order items:", error);
    return [];
  }
};

export default function Dashboard() {
  const { token, isLoading: authLoading } = useAuth();
  const store = useStore();
  const { nguageStore } = store;

  useEffect(() => {
    console.log("Dashboard mounted - authLoading:", authLoading);
    console.log("Store:", store);
    console.log("nguageStore:", nguageStore);
  }, [authLoading, store, nguageStore]);

  const { data: items = [], isLoading, error, status } = useQuery({
    queryKey: ["workOrderItems", nguageStore],
    queryFn: () => fetchWorkOrderItems(nguageStore),
    enabled: !authLoading && !!nguageStore,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  useEffect(() => {
    console.log("Query status:", status);
    console.log("Query isLoading:", isLoading);
    console.log("Query error:", error);
    console.log("Query items count:", items.length);
  }, [status, isLoading, error, items]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error instanceof Error ? error.message : "Failed to fetch work order items"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <KanbanBoard initialData={items} />;
}
