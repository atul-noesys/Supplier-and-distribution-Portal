"use client";

import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import { PDFPreview } from "@/components/pdf-preview";
import axios from "axios";
import { Fragment, useState, useEffect, useCallback } from "react";
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
  step_name: string;
  document: string;
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
    step_name: item.step_name as string,
    document: (item.document as string) || null,
    InfoveaveBatchId: item.InfoveaveBatchId as number,
    ROWID: item.ROWID as number,
    total: (item.unit_price as number) * (item.quantity as number),
  }));
};

export default function PurchaseOrderPage() {
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  const fetchPdf = useCallback(async (docName: string | null) => {
    if (!docName) {
      setPdfUrl(null);
      return;
    }

    setLoadingPdf(true);
    setPdfError(null);

    try {
      const apiUrl = `/api/GetPdfUrl?attachment=${encodeURIComponent(docName)}`;

      const pdfResponse = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!pdfResponse.ok) {
        throw new Error(
          `Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`,
        );
      }

      const pdfBlob = await pdfResponse.blob();
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(blobUrl);
    } catch (err) {
      console.error("Failed to fetch PDF:", err);
      setPdfError(err instanceof Error ? err.message : "Failed to load PDF");
      setPdfUrl(null);
    } finally {
      setLoadingPdf(false);
    }
  }, []);

  useEffect(() => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    fetchPdf(selectedDocument);
  }, [selectedDocument, fetchPdf]);

  const handleViewDocument = (docName: string) => {
    setSelectedDocument(docName);
  };

  const closePdfViewer = () => {
    setSelectedDocument(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
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
                    <Fragment key={po.po_number}>
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
                              <div className="grid grid-cols-8 gap-6">
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Item Code</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Description</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Unit Price</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Qty</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Total</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Step</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Step Name</div>
                                <div className="font-semibold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wide">Document</div>
                              </div>
                            </td>
                          </tr>
                          {itemsByPO[po.po_number].map((item: PurchaseOrderItem) => (
                            <tr
                              key={item.ROWID}
                              className="border-b border-gray-100 dark:border-white/[0.05] bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <td colSpan={4} className="px-5 py-4">
                                <div className="grid grid-cols-8 gap-6 text-sm">
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
                                  <div className="text-gray-700 dark:text-gray-300">{item.step_name}</div>
                                  <div className="text-gray-700 dark:text-gray-300">
                                    {item.document ? (
                                      <button
                                        onClick={() => handleViewDocument(item.document)}
                                        className="cursor-pointer hover:opacity-75 transition-opacity"
                                        title="View document"
                                      >
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    ) : (
                                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                      </svg>
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
      </ComponentCard>

      {/* PDF Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-2/3 h-5/6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDocument}
              </h2>
              <button
                onClick={closePdfViewer}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {pdfError ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 text-lg font-medium text-red-500">
                      Error
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">{pdfError}</div>
                    <button
                      className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      onClick={() => handleViewDocument(selectedDocument)}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : loadingPdf ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                  </div>
                </div>
              ) : pdfUrl ? (
                <PDFPreview
                  pdfUrl={pdfUrl}
                  docName={selectedDocument}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-gray-600 dark:text-gray-400">
                    No PDF loaded
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

