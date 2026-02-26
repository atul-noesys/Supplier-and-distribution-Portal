"use client";

import { MdClose } from "react-icons/md";
import { FaFilePdf  } from "react-icons/fa";
import { PDFPreview } from "@/components/pdf-preview";
import { useState, useEffect } from "react";

interface PDFViewerModalProps {
  // documents can be passed as a string (JSON string or comma-separated) or as an array
  documents?: string | string[];
  pdfUrl: string | null;
  loadingPdf: boolean;
  pdfError: string | null;
  onClose: () => void;
  onRetry: (docName: string) => void;
  onDocumentSelect?: (docName: string) => void;
}

export default function PDFViewerModal({
  documents = [],
  pdfUrl,
  loadingPdf,
  pdfError,
  onClose,
  onRetry,
  onDocumentSelect,
}: PDFViewerModalProps) {
  const allDocuments: string[] = (() => {
    if (!documents) return [];
    if (Array.isArray(documents)) return documents;
    try {
      const parsed = JSON.parse(documents);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      if (typeof parsed === "string") return [parsed];
    } catch (e) {
      // not JSON, fall back to comma-separated or single string
    }
    if (typeof documents === "string" && documents.includes(",")) {
      return documents.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof documents === "string") return [documents];
    return [];
  })();

  const [internalSelectedDocument, setInternalSelectedDocument] = useState<string | null>(null);
  const currentDocument = internalSelectedDocument ?? (allDocuments.length > 0 ? allDocuments[0] : null);

  useEffect(() => {
    // Defer state changes to avoid synchronous setState inside the effect
    // which can cause cascading renders and the React warning.
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (allDocuments.length === 0) {
      if (internalSelectedDocument !== null) {
        timer = setTimeout(() => setInternalSelectedDocument(null), 0);
      }
      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    if (!internalSelectedDocument || !allDocuments.includes(internalSelectedDocument)) {
      timer = setTimeout(() => {
        setInternalSelectedDocument(allDocuments[0]);
        if (onDocumentSelect) {
          onDocumentSelect(allDocuments[0]);
        }
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [allDocuments, internalSelectedDocument, onDocumentSelect]);

  if (allDocuments.length === 0) {
    return null;
  }

  const handleDocumentClick = (doc: string) => {
    setInternalSelectedDocument(doc);
    if (onDocumentSelect) {
      onDocumentSelect(doc);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-5/6 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentDocument ? currentDocument.split('/').pop() : "Document Viewer"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content with Sidebar */}
        <div className="flex-1 flex overflow-hidden rounded-bl-lg">
          {/* Left Sidebar - Document List */}
          {allDocuments.length > 0 && (
            <div className="w-68 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
              <div className="p-1">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Documents ({allDocuments.length})
                </h3>
                <div className="space-y-1">
                  {allDocuments.map((doc, index) => (
                    <button
                      key={index}
                      onClick={() => handleDocumentClick(doc)}
                      className={`w-full group relative overflow-hidden rounded-lg transition-all duration-200 ${
                        currentDocument === doc
                          ? "bg-linear-to-r from-blue-100 to-blue-100"
                          : "bg-white dark:bg-gray-700 shadow-sm hover:shadow-md dark:shadow-gray-900/50"
                      }`}
                    >
                      {/* Background accent for active state */}
                      {currentDocument === doc && (
                        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" />
                      )}

                      {/* Card content */}
                      <div className="relative p-2 flex items-center gap-2">
                        {/* Icon */}
                        <div className="transition-colors text-red-800">
                          <FaFilePdf className="w-7 h-8.5" />
                        </div>

                        {/* Text content */}
                        <div className="flex-1 text-left min-w-0">
                          <p className={`text-sm font-medium truncate transition-colors ${
                            currentDocument === doc
                              ? "text-blue-800"
                              : "text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                          }`}>
                            {doc.split('/').pop()}
                          </p>
                          <p className={`text-xs mt-1 truncate ${
                            currentDocument === doc
                              ? "text-gray-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>
                            Document
                          </p>
                        </div>
                      </div>

                      {/* Bottom border accent */}
                      {currentDocument === doc && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-blue-300 to-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {pdfError ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-lg font-medium text-red-500">
                    Error
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">{pdfError}</div>
                  <button
                    className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                    onClick={() => {
                      if (currentDocument) {
                        onRetry(currentDocument);
                      }
                    }}
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
                docName={currentDocument || ""}
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
    </div>
  );
}
