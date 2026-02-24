"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { usePageTransition } from "@/context/PageTransitionContext";

/**
 * Custom router hook that automatically adds smooth page transitions to any route change
 * Use this instead of useRouter() for automatic transitions
 *
 * Example:
 * const router = useRouterWithTransition();
 * router.push("/dashboard"); // Will automatically animate the transition
 */
export function useRouterWithTransition() {
  const router = useNextRouter();
  const { startTransition, endTransition } = usePageTransition();

  return {
    ...router,
    push: (href: string, options?: any) => {
      startTransition();
      // Wait for fade-out animation before navigating
      setTimeout(() => {
        router.push(href, options);
        // Navigation will trigger RouteTransitionManager to end transition
      }, 300);
    },
    replace: (href: string, options?: any) => {
      startTransition();
      setTimeout(() => {
        router.replace(href, options);
      }, 300);
    },
    refresh: () => {
      startTransition();
      setTimeout(() => {
        router.refresh();
        setTimeout(() => endTransition(), 100);
      }, 300);
    },
    back: () => {
      startTransition();
      setTimeout(() => {
        router.back();
      }, 300);
    },
    forward: () => {
      startTransition();
      setTimeout(() => {
        router.forward();
      }, 300);
    },
  };
}
