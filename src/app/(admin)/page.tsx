"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import axios from "axios";

interface KanbanItem {
  po_number: string;
  item_code: string;
  item: string;
  unit_price: number;
  quantity: number;
  status: string;
  InfoveaveBatchId: number;
  po_status: string;
  ROWID: number;
  [key: string]: any;
}

const fetchPOItems = async (token: string | null): Promise<KanbanItem[]> => {
  if (!token) {
    throw new Error("No authentication token available");
  }

  const response = await axios.post("/api/GetPOItems", {}, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.data && response.data.data) {
    // Transform the data to ensure status is valid
    return response.data.data.map((item: any) => ({
      po_number: item.po_number,
      item_code: item.item_code,
      item: item.item,
      unit_price: item.unit_price,
      quantity: item.quantity,
      status: ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"].includes(item.status)
        ? item.status
        : "Step 1",
      InfoveaveBatchId: item.InfoveaveBatchId,
      po_status: item.po_status,
      ROWID: item.ROWID,
    }));
  }

  return [];
};

export default function Dashboard() {
  const { token, isLoading: authLoading } = useAuth();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["poItems", token],
    queryFn: () => fetchPOItems(token),
    enabled: !!token && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

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
            {error instanceof Error ? error.message : "Failed to fetch purchase order items"}
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
