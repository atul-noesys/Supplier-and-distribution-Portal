"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePageTransition } from "@/context/PageTransitionContext";

/**
 * Hook that automatically detects route changes and ends page transitions
 * Pairs with startTransition() calls from useRouterWithTransition() or usePageTransition()
 */
export function useRouteTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { endTransition } = usePageTransition();
  const previousRouteRef = useRef<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Build current route
    const currentRoute = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // If this is initial mount, just store the route
    if (previousRouteRef.current === null) {
      previousRouteRef.current = currentRoute;
      return;
    }

    // If route actually changed
    if (previousRouteRef.current !== currentRoute) {
      // Clear any pending timeouts
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      // End transition after route change detected
      // Small delay to ensure DOM has updated
      navigationTimeoutRef.current = setTimeout(() => {
        endTransition();
      }, 150);
    }

    previousRouteRef.current = currentRoute;
  }, [pathname, searchParams, endTransition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);
}
