"use client";

import { useRouteTransition } from "@/hooks/useRouteTransition";

/**
 * Component that automatically handles smooth page transitions for all route changes
 * Place this in your root layout to enable transitions globally
 */
export default function RouteTransitionManager() {
  // This hook monitors route changes and automatically manages transitions
  useRouteTransition();

  return null; // This component doesn't render anything, just manages transitions
}
