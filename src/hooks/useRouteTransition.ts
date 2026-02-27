"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePageTransition } from "@/context/PageTransitionContext";

export function useRouteTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { endTransition } = usePageTransition();
  const previousRouteRef = useRef<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentRoute = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    if (previousRouteRef.current === null) {
      previousRouteRef.current = currentRoute;
      return;
    }

    if (previousRouteRef.current !== currentRoute) {
      endTransition();
      previousRouteRef.current = currentRoute;
    }
  }, [pathname, searchParams, endTransition]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);
}
