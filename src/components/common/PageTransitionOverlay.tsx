"use client";

import { usePageTransition } from "@/context/PageTransitionContext";

export default function PageTransitionOverlay() {
  const { isTransitioning } = usePageTransition();

  return (
    <>
      {/* Smooth fade transition overlay */}
      <div
        className={`fixed inset-0 bg-white dark:bg-gray-900 pointer-events-none transition-opacity duration-300 ease-in-out z-[9999] ${
          isTransitioning ? "opacity-100" : "opacity-0"
        }`}
      />
      
      {/* Loading spinner during transition */}
      {isTransitioning && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[10000]">
          <div className="animate-spin">
            <div className="h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      )}
    </>
  );
}
