"use client";

import { MdClose } from "react-icons/md";
import { FaFilePdf  } from "react-icons/fa";
import { PDFPreview } from "@/components/pdf-preview";
import { useState, useEffect } from "react";

interface PDFViewerModalProps {
  selectedDocument: string | null;
  documents?: string[];
  pdfUrl: string | null;
  loadingPdf: boolean;
  pdfError: string | null;
  onClose: () => void;
  onRetry: (docName: string) => void;
  onDocumentSelect?: (docName: string) => void;
}

export default function PDFViewerModal({
  selectedDocument,
  documents = [],
  pdfUrl,
  loadingPdf,
  pdfError,
  onClose,
  onRetry,
  onDocumentSelect,
}: PDFViewerModalProps) {
  const [internalSelectedDocument, setInternalSelectedDocument] = useState<string | null>(selectedDocument);

  // Update internal state when selectedDocument changes from parent
  useEffect(() => {
    setInternalSelectedDocument(selectedDocument);
  }, [selectedDocument]);

  if (!selectedDocument && (!documents || documents.length === 0)) {
    return null;
  }

  const currentDocument = internalSelectedDocument || selectedDocument;
  const allDocuments = documents && documents.length > 0 ? documents : (selectedDocument ? [selectedDocument] : []);

  const handleDocumentClick = (doc: string) => {
    setInternalSelectedDocument(doc);
    if (onDocumentSelect) {
      onDocumentSelect(doc);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-5/6 h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentDocument ? currentDocument.slice(42) : "Document Viewer"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Document List */}
          {allDocuments.length > 0 && (
            <div className="w-68 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
              <div className="p-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Documents ({allDocuments.length})
                </h3>
                <div>
                  {allDocuments.map((doc, index) => (
                    <button
                      key={index}
                      onClick={() => handleDocumentClick(doc)}
                      className={`w-full group relative overflow-hidden rounded-lg transition-all duration-200 ${
                        currentDocument === doc
                          ? "bg-linear-to-r from-blue-100 to-blue-100 scale-105"
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
                            {doc.slice(42)}
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
