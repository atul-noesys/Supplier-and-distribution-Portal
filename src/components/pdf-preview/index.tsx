"use client";

interface PDFPreviewProps {
  pdfUrl: string | null;
  docName: string;
}

export function PDFPreview({ pdfUrl, docName }: PDFPreviewProps) {
  return (
    <div className="flex h-full flex-col rounded-lg shadow-sm">
      <div className="flex flex-1 items-center justify-center">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="h-full w-full rounded-md border border-gray-200 shadow-sm"
            frameBorder="0"
            title={docName}
          />
        ) : (
          <div className="text-gray-500">No Preview</div>
        )}
      </div>
    </div>
  );
}
