"use client";

import Badge from "@/components/ui/badge/Badge";
import { useStore } from "@/store/store-context";
import { RowData } from "@/types/purchase-order";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { Fragment, useCallback, useMemo, useState } from "react";
import { MdClose } from "react-icons/md";


// Keys to exclude from display
const EXCLUDED_KEYS = new Set(["ROWID", "InfoveaveBatchId"]);

// Define the desired column order for work orders
const COLUMN_ORDER = [
  "workOrderId", // Computed field (po_number + item_code)
  "item_code",
  "item",
  "vendor_id",
  "vendor_name",
  "step",
  "po_number",
  "step_name",
  "start_date",
  "end_date",
];

// Function to generate column headers from data dynamically
const getDynamicColumns = (items: RowData[]): Array<{ key: string; label: string }> => {
  if (!items || items.length === 0) return [];

  const firstItem = items[0];
  const keys = Object.keys(firstItem).filter((key) => {
    // Exclude specified keys
    if (EXCLUDED_KEYS.has(key)) return false;
    // Include computed expression keys (starting with {)
    return true;
  });

  // Create a mapping of computed expression keys to "workOrderId"
  const computedExpressionKey = keys.find((key) => key.startsWith("{"));

  // Build the final column list
  let sortedKeys = [...COLUMN_ORDER];

  // If computed expression exists, add it to the keys list
  if (computedExpressionKey) {
    sortedKeys = [
      "workOrderId",
      ...COLUMN_ORDER.filter((key) => key !== "workOrderId"),
      ...keys.filter(
        (key) =>
          !COLUMN_ORDER.includes(key) &&
          key !== computedExpressionKey &&
          !key.startsWith("{")
      ),
    ];
  } else {
    sortedKeys = [
      ...COLUMN_ORDER.filter((key) => key !== "workOrderId"),
      ...keys.filter((key) => !COLUMN_ORDER.includes(key) && !key.startsWith("{")),
    ];
  }

  // Convert key names to readable labels
  return sortedKeys.map((key) => {
    if (key === "workOrderId") {
      return { key: computedExpressionKey || "", label: "Work Order ID" };
    }
    return {
      key,
      label: key
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    };
  });
};

export default observer(function WorkOrderPage() {
  const { nguageStore } = useStore();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const itemsPerPage = 10;

  // Fetch auth token
  const { data: authToken = null } = useQuery({
    queryKey: ["authToken"],
    queryFn: () => localStorage.getItem("access_token"),
    staleTime: 0,
    gcTime: 0,
  });

  // Get the current user from the store
  const user = nguageStore.currentUser;

  // Fetch work order items using GetPaginationData
  const { data: paginationData, isLoading, error } = useQuery({
    queryKey: ["workOrderItems", authToken],
    queryFn: async (): Promise<RowData[]> => {
      const response = await nguageStore.GetPaginationData({
        table: "work_order",
        skip: 0,
        take: 500,
        NGaugeId: "44",
      });
      
      // Handle response - GetPaginationData returns PaginationData object with data property
      const items = response?.data || response || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        return [];
      }

      // Return items as-is without adding non-existent fields
      return items as RowData[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken,
  });

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!paginationData) return [];
    
    return paginationData.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [paginationData, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

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

  // Function to format date fields
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  // Generate columns dynamically from data
  const tableColumns = useMemo(() => getDynamicColumns(paginatedItems), [paginatedItems]);

  if (error) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Error Loading Work Orders
          </h4>
          <p className="mt-2 text-red-500">Failed to load work order data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/3 overflow-hidden">
        {/* Header with Title and Search */}
        <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Work Orders</h2>
            <div className="flex items-center gap-3 flex-1 max-w-[460px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by PO number/Item code/Item name/Vendor"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-4 py-2.25 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange("")}
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

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No work orders found</p>
        </div>
      ) : (
        <div className="border-t border-gray-200 dark:border-white/5">
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: '0' }}>
              {/* Table Header */}
              {tableColumns.map((column) => (
                <div
                  key={column.key}
                  className="bg-blue-800 dark:bg-blue-700 px-2.5 py-2.5 text-xs font-bold text-white uppercase tracking-wider sticky top-0 border-r border-blue-800 dark:border-blue-800"
                >
                  {column.label}
                </div>
              ))}

              {/* Table Body */}
              {paginatedItems.map((item) => (
                <Fragment key={item.ROWID}>
                  {tableColumns.map((column) => {
                    const value = item[column.key];
                    let cellContent: React.ReactNode = "-";

                    // Format date fields
                    if (column.key === "start_date" || column.key === "end_date") {
                      cellContent = formatDate(String(value || ""));
                    }
                    // Render Badge for step field
                    else if (column.key === "step") {
                      cellContent = (
                        <Badge color="green" variant="solid">
                          {value || "-"}
                        </Badge>
                      );
                    } else if (value !== null && value !== undefined && value !== "") {
                      // Render with highlight if search term exists
                      cellContent = searchTerm ? highlightText(String(value), searchTerm) : String(value);
                    }

                    return (
                      <div
                        key={column.key}
                        className="px-2.5 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-200 dark:border-gray-600 border-r"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {cellContent}
                        </p>
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </Fragment>
  );
});