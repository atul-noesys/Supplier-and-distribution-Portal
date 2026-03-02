"use client";

import { MdClose, MdHistory } from "react-icons/md";
import { FaFilePdf  } from "react-icons/fa";
import { PDFPreview } from "@/components/pdf-preview";
import { useState, useEffect } from "react";

interface StepHistoryVersion {
  values: Array<{
    key: string;
    oldValue: string;
    newValue: string;
  }>;
  updatedBy: string;
  updatedOn: string;
}

interface PDFViewerModalProps {
  documents?: string | string[];
  pdfUrl: string | null;
  loadingPdf: boolean;
  pdfError: string | null;
  onClose: () => void;
  onRetry: (docName: string) => void;
  onDocumentSelect?: (docName: string) => void;
  stepHistory?: string | null;
  headerName?: string;
}

export default function PDFViewerModal({
  documents = [],
  pdfUrl,
  loadingPdf,
  pdfError,
  onClose,
  onRetry,
  onDocumentSelect,
  stepHistory,
  headerName,
}: PDFViewerModalProps) {
  const [internalSelectedDocument, setInternalSelectedDocument] = useState<string | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(-1); // -1 represents "All documents"
  
  // Parse step history versions
  const stepHistoryVersions: StepHistoryVersion[] = (() => {
    if (!stepHistory) return [];
    try {
      const parsed = JSON.parse(stepHistory);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  })();

  // Get documents from current selection (either from documents prop or from selected version)
  const allDocuments: string[] = (() => {
    if (selectedVersionIndex >= 0 && stepHistoryVersions[selectedVersionIndex]) {
      // Extract documents from the selected version
      const version = stepHistoryVersions[selectedVersionIndex];
      const documentChange = version.values.find(v => v.key === 'document');
      if (documentChange) {
        try {
          const docValue = JSON.parse(documentChange.newValue);
          if (Array.isArray(docValue)) {
            return docValue.map(v => String(v));
          } else if (typeof docValue === 'string') {
            return [docValue];
          }
        } catch (e) {
          return [];
        }
      }
      return [];
    }

    // Default: Use original documents prop
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

  // Calculate new documents for a selected version
  const getNewDocumentsForVersion = (versionIndex: number): string[] => {
    if (versionIndex < 0 || !stepHistoryVersions[versionIndex]) return [];
    
    const version = stepHistoryVersions[versionIndex];
    const documentChange = version.values.find(v => v.key === 'document');
    if (!documentChange) return [];

    try {
      const newDocs = JSON.parse(documentChange.newValue);
      const oldDocs = JSON.parse(documentChange.oldValue);
      
      const newDocsArray = Array.isArray(newDocs) 
        ? newDocs.map(doc => (typeof doc === 'string' ? doc : String(doc)))
        : [newDocs];
      
      const oldDocsArray = Array.isArray(oldDocs)
        ? oldDocs.map(doc => (typeof doc === 'string' ? doc : String(doc)))
        : [oldDocs];
      
      return newDocsArray.filter(doc => !oldDocsArray.includes(doc));
    } catch (e) {
      return [];
    }
  };

  // Documents to show in tabs based on version selection
  const documentsForDisplay: string[] = selectedVersionIndex >= 0 
    ? getNewDocumentsForVersion(selectedVersionIndex)
    : allDocuments;

  const currentDocument = internalSelectedDocument ?? (documentsForDisplay.length > 0 ? documentsForDisplay[0] : null);

  useEffect(() => {
    let cancelled = false;

    if (documentsForDisplay.length === 0) {
      if (internalSelectedDocument !== null) {
        Promise.resolve().then(() => {
          if (!cancelled) setInternalSelectedDocument(null);
        });
      }
      return () => {
        cancelled = true;
      };
    }

    if (!internalSelectedDocument || !documentsForDisplay.includes(internalSelectedDocument)) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setInternalSelectedDocument(documentsForDisplay[0]);
        if (onDocumentSelect) {
          onDocumentSelect(documentsForDisplay[0]);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [documentsForDisplay, internalSelectedDocument, onDocumentSelect]);

  if (allDocuments.length === 0 && stepHistoryVersions.length === 0) {
    return null;
  }

  const handleDocumentClick = (doc: string) => {
    setInternalSelectedDocument(doc);
    if (onDocumentSelect) {
      onDocumentSelect(doc);
    }
  };

  const handleVersionClick = (versionIndex: number) => {
    setSelectedVersionIndex(versionIndex);
    setInternalSelectedDocument(null); // Reset document selection for new version
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-5/6 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {headerName || (currentDocument ? currentDocument.split('/').pop() : "Document Viewer")}
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
          {/* Left Sidebar - Version List */}
          {(stepHistoryVersions.length > 0 || allDocuments.length > 0) && (
            <div className="w-68 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
              <div className="p-1">
                <div className="space-y-1">
                  {/* Default "All documents" version */}
                  <button
                    onClick={() => handleVersionClick(-1)}
                    className={`w-full group relative overflow-hidden rounded-lg transition-all duration-200 ${
                      selectedVersionIndex === -1
                        ? "bg-linear-to-r from-blue-100 to-blue-100"
                        : "bg-white dark:bg-gray-700 shadow-sm hover:shadow-md dark:shadow-gray-900/50"
                    }`}
                  >
                    {/* Background accent for active state */}
                    {selectedVersionIndex === -1 && (
                      <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" />
                    )}

                    {/* Card content */}
                    <div className="relative p-2 flex items-center gap-2">
                      {/* Icon */}
                      <div className="transition-colors text-red-800 dark:text-blue-400">
                        <FaFilePdf className="w-7 h-8" />
                      </div>

                      {/* Text content */}
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-sm font-medium truncate transition-colors ${
                          selectedVersionIndex === -1
                            ? "text-blue-800"
                            : "text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        }`}>
                          All documents
                        </p>
                        <p className={"text-xs mt-1 truncate text-gray-600 dark:text-gray-400 font-normal"}>
                          Current
                        </p>
                      </div>
                    </div>

                    {/* Bottom border accent */}
                    {selectedVersionIndex === -1 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-blue-300 to-blue-500" />
                    )}
                  </button>

                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-3 pt-3">
                    Versions ({stepHistoryVersions.length})
                  </h3>

                  {stepHistoryVersions.map((version, index) => (
                    <button
                      key={index}
                      onClick={() => handleVersionClick(index)}
                      className={`w-full group relative overflow-hidden rounded-lg transition-all duration-200 ${
                        selectedVersionIndex === index
                          ? "bg-linear-to-r from-blue-100 to-blue-100"
                          : "bg-white dark:bg-gray-700 shadow-sm hover:shadow-md dark:shadow-gray-900/50"
                      }`}
                    >
                      {/* Background accent for active state */}
                      {selectedVersionIndex === index && (
                        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" />
                      )}

                      {/* Card content */}
                      <div className="relative p-2 flex items-center gap-2">
                        {/* Icon */}
                        <div className="transition-colors text-blue-600 dark:text-blue-400">
                          <MdHistory className="w-6 h-6" />
                        </div>

                        {/* Text content */}
                        <div className="flex-1 text-left min-w-0">
                          <p className={`text-sm font-medium truncate transition-colors ${
                            selectedVersionIndex === index
                              ? "text-blue-800"
                              : "text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                          }`}>
                            Version {index + 1}
                          </p>
                          <p className={"text-xs mt-1 truncate text-gray-600 dark:text-gray-400 font-normal"}>
                            {new Date(version.updatedOn).toLocaleDateString()} {new Date(version.updatedOn).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Bottom border accent */}
                      {selectedVersionIndex === index && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-blue-300 to-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          {documentsForDisplay.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Document Tabs (on PDF viewer area) */}
              {documentsForDisplay.length >= 1 && (
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-0 py-0 overflow-x-auto items-center">
                  {documentsForDisplay.map((doc, index) => (
                    <button
                      key={index}
                      onClick={() => handleDocumentClick(doc)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
                        currentDocument === doc
                          ? "bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                      }`}
                    >
                      {doc.split('/').pop()}
                    </button>
                  ))}
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 overflow-hidden w-full">
                {pdfError ? (
                  <div className="flex w-full h-full items-center justify-center">
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
                  <div className="flex w-full h-full items-center justify-center">
                    <div className="animate-spin">
                      <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
                    </div>
                  </div>
                ) : pdfUrl ? (
                  <div className="w-full h-full">
                    <PDFPreview
                      pdfUrl={pdfUrl}
                      docName={currentDocument || ""}
                    />
                  </div>
                ) : (
                  <div className="flex w-full h-full items-center justify-center">
                    <div className="text-center text-gray-600 dark:text-gray-400">
                      No PDF loaded
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Sidebar - Step History Details */}
          {stepHistoryVersions.length > 0 && selectedVersionIndex >= 0 && stepHistoryVersions[selectedVersionIndex] && (
            <div className={`${documentsForDisplay.length > 0 ? 'w-72' : 'flex-1'} border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto flex flex-col rounded-b-lg`}>
              <div className="flex justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-blue-800 dark:text-gray-300">
                  Version {selectedVersionIndex + 1}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(stepHistoryVersions[selectedVersionIndex].updatedOn).toLocaleDateString()} {new Date(stepHistoryVersions[selectedVersionIndex].updatedOn).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {stepHistoryVersions[selectedVersionIndex].values.map((value, idx) => {
                  // Special handling for document field
                  let displayNewValue = value.newValue;
                  let displayOldValue = value.oldValue;
                  
                  if (value.key === 'document') {
                    try {
                      const newDocs = JSON.parse(value.newValue);
                      const oldDocs = JSON.parse(value.oldValue);
                      
                      displayNewValue = Array.isArray(newDocs)
                        ? newDocs.map(doc => (typeof doc === 'string' ? doc.split('/').pop() : doc)).join('\n')
                        : newDocs.split('/').pop();
                      
                      displayOldValue = Array.isArray(oldDocs)
                        ? oldDocs.map(doc => (typeof doc === 'string' ? doc.split('/').pop() : doc)).join('\n')
                        : oldDocs.split('/').pop();
                    } catch (e) {
                      // If parsing fails, use original values
                    }
                  }
                  
                  return (
                    <div key={idx} className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        {value.key}
                      </p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-blue-700 dark:text-gray-400">Old Value:</p>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                            {displayOldValue}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs text-blue-700 dark:text-gray-400">New Value:</p>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                            {displayNewValue}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
