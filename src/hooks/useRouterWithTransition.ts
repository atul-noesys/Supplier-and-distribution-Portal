"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { usePageTransition } from "@/context/PageTransitionContext";

export function useRouterWithTransition() {
  const router = useNextRouter();
  const { startTransition, endTransition } = usePageTransition();

  return {
    ...router,
    push: (href: string, options?: any) => {
      startTransition();
      router.push(href, options);
    },
    replace: (href: string, options?: any) => {
      startTransition();
      router.replace(href, options);
    },
    refresh: () => {
      startTransition();
      router.refresh();
      setTimeout(() => endTransition(), 500);
    },
    back: () => {
      startTransition();
      router.back();
    },
    forward: () => {
      startTransition();
      router.forward();
    },
  };
}
