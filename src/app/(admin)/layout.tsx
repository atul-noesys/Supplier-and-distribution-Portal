"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useProtectedRoute } from "@/hooks/useAuth";
import { usePageTransition } from "@/context/PageTransitionContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React, { useEffect } from "react";
import { initializeI18n } from "@infoveave/i18n-core";
import { configurePdfWorker } from "@infoveave/document-viewers";
// import { pdfjs } from "react-pdf";

// initialize i18n
await initializeI18n();

// PDF worker
await configurePdfWorker({
  workerSrc: "/v8/pdf/build/pdf.worker.min.mjs",
  cmapUrl: "/v8/pdf/cmaps/",
  standardFontDataUrl: "/v8/pdf/standard_fonts/",
  wasmUrl: "/v8/pdf/wasm/",
});

// configurePdfWorker({
//   workerSrc: "https://unpkg.com/pdfjs-dist@" + pdfjs.version + "/build/pdf.worker.min.mjs",
//   cmapUrl: "https://unpkg.com/pdfjs-dist@" + pdfjs.version + "/cmaps/",
//   standardFontDataUrl: "https://unpkg.com/pdfjs-dist@" + pdfjs.version + "/standard_fonts/",
//   wasmUrl: "https://unpkg.com/pdfjs-dist@" + pdfjs.version + "/wasm/",
// });

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { isLoading } = useProtectedRoute();
  const { isTransitioning, endTransition } = usePageTransition();

  useEffect(() => {
    if (!isLoading && isTransitioning) {
      endTransition();
      return;
    }
  }, [isLoading, isTransitioning, endTransition]);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[260px]"
    : "lg:ml-[90px]";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
