"use client";

import { MdClose, MdHistory, MdExpandLess, MdExpandMore } from "react-icons/md";
import { FaFilePdf  } from "react-icons/fa";
import { PDFPreview } from "@/components/pdf-preview";
import { PdfViewer } from "@infoveave/document-viewers";
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
  const [isVersionCollapsed, setIsVersionCollapsed] = useState(false);
  
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
      
      // Handle empty or invalid old value
      let oldDocs;
      try {
        oldDocs = JSON.parse(documentChange.oldValue);
      } catch (e) {
        // If oldValue is empty or invalid, treat as empty array
        oldDocs = documentChange.oldValue === '' || documentChange.oldValue === 'null' ? [] : [documentChange.oldValue];
      }
      
      const newDocsArray = Array.isArray(newDocs) 
        ? newDocs.map(doc => (typeof doc === 'string' ? doc : String(doc)))
        : [newDocs];
      
      const oldDocsArray = Array.isArray(oldDocs)
        ? oldDocs.map(doc => (typeof doc === 'string' ? doc : String(doc)))
        : (oldDocs ? [oldDocs] : []);
      
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
                          PDFs
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
                          <p className={"flex justify-between text-xs mt-1 truncate text-gray-600 dark:text-gray-400 font-normal"}>
                            <span>{new Date(version.updatedOn).toLocaleDateString()}</span> 
                            <span>{new Date(version.updatedOn).toLocaleTimeString()}</span>
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

          {/* Right Section: PDF on top, Version details below */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Main Content Area - PDF Section */}
            {documentsForDisplay.length > 0 && (
              <div className={`${stepHistoryVersions.length > 0 && selectedVersionIndex >= 0 && !isVersionCollapsed ? 'flex-[0.65]' : 'flex-1'} flex flex-col overflow-hidden ${stepHistoryVersions.length > 0 && selectedVersionIndex >= 0 && !isVersionCollapsed ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
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
                      <PdfViewer
                        file={pdfUrl}
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

            {/* Version Details Section - Below PDF */}
            {stepHistoryVersions.length > 0 && selectedVersionIndex >= 0 && stepHistoryVersions[selectedVersionIndex] && (
              <div className={`border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden flex flex-col rounded-b-lg transition-all duration-300 ease-in-out ${
                isVersionCollapsed ? 'h-8' : (documentsForDisplay.length > 0 ? 'flex-[0.35]' : 'flex-1')
              }`}>
                <div className={`flex justify-between items-center px-4 ${documentsForDisplay.length > 0 ? 'py-1' : 'py-3'} border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors shrink-0`} onClick={() => setIsVersionCollapsed(!isVersionCollapsed)}>
                  <h3 className="text-md font-semibold text-blue-800 dark:text-gray-300">
                    Version {selectedVersionIndex + 1}
                  </h3>
                  {documentsForDisplay.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVersionCollapsed(!isVersionCollapsed);
                      }}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                      title={isVersionCollapsed ? "Expand version details" : "Collapse version details"}
                    >
                      {isVersionCollapsed ? <MdExpandMore className="w-5 h-5" /> : <MdExpandLess className="w-5 h-5" />}
                    </button>
                  )}
                </div>
                <div className={`flex-1 flex flex-col min-h-0 p-4 transition-opacity ${
                  isVersionCollapsed ? 'opacity-0 duration-0' : 'opacity-100 duration-300 delay-300'
                }`}>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden flex flex-col min-h-0">
                    {/* Header */}
                    <div className="sticky top-0 bg-linear-to-r from-blue-700 to-blue-800 dark:from-blue-800 dark:to-blue-900 z-10 flex shrink-0">
                      <div className="px-2 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide border border-blue-500 w-40 shrink-0">Field</div>
                      <div className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide border border-blue-500 flex-1">Previous</div>
                      <div className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide border border-blue-500 flex-1">Current</div>
                    </div>
                    {/* Scrollable Body */}
                    <div className="overflow-y-auto flex-1">
                      {stepHistoryVersions[selectedVersionIndex].values.map((value, idx) => {
                        // Special handling for document field
                        let displayNewValue = value.newValue;
                        let displayOldValue = value.oldValue;
                        if (value.key === 'document') {
                          try {
                            // Parse only if not empty
                            const newDocs = value.newValue && value.newValue.trim() !== '' ? JSON.parse(value.newValue) : null;
                            const oldDocs = value.oldValue && value.oldValue.trim() !== '' ? JSON.parse(value.oldValue) : null;
                            
                            // Process newValue
                            if (newDocs !== null) {
                              displayNewValue = Array.isArray(newDocs)
                                ? newDocs.map(doc => (typeof doc === 'string' ? (doc.split('/').pop() ?? doc) : JSON.stringify(doc))).join(', ')
                                : (typeof newDocs === 'string' ? (newDocs.split('/').pop() ?? newDocs) : JSON.stringify(newDocs));
                            }
                            
                            // Process oldValue
                            if (oldDocs !== null) {
                              displayOldValue = Array.isArray(oldDocs)
                                ? oldDocs.map(doc => (typeof doc === 'string' ? (doc.split('/').pop() ?? doc) : JSON.stringify(doc))).join(', ')
                                : (typeof oldDocs === 'string' ? (oldDocs.split('/').pop() ?? oldDocs) : JSON.stringify(oldDocs));
                            }
                          } catch (e) {
                            // If parsing fails, use original values
                          }
                        }
                        
                        const isOldEmpty = !displayOldValue || displayOldValue === '' || displayOldValue === 'null';
                        
                        // Parse documents for clickable rendering
                        let newDocArray: string[] = [];
                        if (value.key === 'document') {
                          try {
                            const newDocs = value.newValue && value.newValue.trim() !== '' ? JSON.parse(value.newValue) : null;
                            if (newDocs !== null) {
                              newDocArray = Array.isArray(newDocs) 
                                ? newDocs.map(doc => typeof doc === 'string' ? doc : String(doc))
                                : [String(newDocs)];
                            }
                          } catch (e) {
                            // If parsing fails, use empty array
                          }
                        }
                        
                        return (
                          <div key={idx} className={`flex ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'} hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-300 dark:border-gray-600`}>
                            <div className="px-2 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide w-40 shrink-0 wrap-break-word border-r border-gray-300 dark:border-gray-600">
                              {value.key}
                            </div>
                            <div className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 flex-1 border-r border-gray-300 dark:border-gray-600">
                              <div className="wrap-break-word whitespace-normal">
                                {isOldEmpty ? (
                                  <span className="italic text-gray-400 dark:text-gray-500">—</span>
                                ) : (
                                  displayOldValue
                                )}
                              </div>
                            </div>
                            <div className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-400 flex-1 border-gray-300 dark:border-gray-600">
                              <div className="wrap-break-word whitespace-normal">
                                {value.key === 'document' && newDocArray.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {newDocArray.map((doc, docIdx) => (
                                      <button
                                        key={docIdx}
                                        onClick={() => handleDocumentClick(doc)}
                                        className={`px-2 py-1 rounded text-xs transition-colors font-medium ${
                                          currentDocument === doc
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-blue-400 dark:hover:bg-blue-500"
                                        }`}
                                      >
                                        {doc.split('/').pop()}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  displayNewValue
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
