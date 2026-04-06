"use client";

import { useInitializeSession } from "@/hooks/useInitializeSession";

/**
 * SessionInitializer - Runs at layout level to initialize user session
 * on every page load for authenticated users (both from URL token and form login)
 */
export function SessionInitializer() {
  useInitializeSession();
  return null;
}
