/**
 * PAGE TRANSITION SYSTEM - USAGE GUIDE
 * 
 * This guide shows how to implement smooth page transitions in your app.
 * Multiple approaches available depending on your use case.
 * 
 * ============================================================================
 * QUICK START (Works with useRouter().push() calls)
 * ============================================================================
 * 
 * Option A: Use useRouterWithTransition() (Easiest)
 * -------
 * ```tsx
 * import { useRouterWithTransition } from "@/hooks/useRouterWithTransition";
 * 
 * export default function MyComponent() {
 *   const router = useRouterWithTransition();
 *   
 *   const handleClick = async () => {
 *     // Process something...
 *     // Smooth transition automatically applied!
 *     router.push("/dashboard");
 *   };
 * }
 * ```
 * 
 * Option B: Manual Control with usePageTransition() 
 * -------
 * (Better for multi-step flows like login)
 * 
 * ```tsx
 * import { usePageTransition } from "@/context/PageTransitionContext";
 * import { useRouter } from "next/navigation";
 * 
 * export default function LoginForm() {
 *   const router = useRouter();
 *   const { startTransition, endTransition } = usePageTransition();
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     const success = await authenticate();
 *     
 *     if (success) {
 *       startTransition();
 *       setTimeout(() => {
 *         router.push("/");
 *         // RouteTransitionManager will auto-detect and end transition
 *       }, 300);
 *     }
 *   };
 * }
 * ```
 * 
 * ============================================================================
 * CREATING TRANSITION-ENABLED NAVIGATION COMPONENTS
 * ============================================================================
 * 
 * For <Link> components with automatic transitions:
 * 
 * ```tsx
 * import { usePageTransition } from "@/context/PageTransitionContext";
 * import Link, { LinkProps } from "next/link";
 * 
 * export function TransitionLink({ 
 *   href, 
 *   children, 
 *   ...props 
 * }: LinkProps & { children: React.ReactNode }) {
 *   const { startTransition } = usePageTransition();
 *   
 *   const handleClick = (e: React.MouseEvent) => {
 *     startTransition();
 *   };
 *   
 *   return (
 *     <Link href={href} onClick={handleClick} {...props}>
 *       {children}
 *     </Link>
 *   );
 * }
 * 
 * // Usage:
 * // <TransitionLink href="/dashboard">Go to Dashboard</TransitionLink>
 * ```
 * 
 * ============================================================================
 * HOW THE SYSTEM WORKS
 * ============================================================================
 * 
 * COMPONENTS INVOLVED:
 * 1. PageTransitionContext - Manages transition state globally
 * 2. PageTransitionOverlay - Renders the fade overlay and spinner
 * 3. RouteTransitionManager - Detects route changes and ends transitions
 * 4. useRouterWithTransition() - Custom hook for automatic transitions
 * 
 * TRANSITION LIFECYCLE:
 * 1. startTransition() called → Overlay fades in with spinner
 * 2. Page navigation happens → router.push(), Link click, etc.
 * 3. URL changes → RouteTransitionManager detects via usePathname()
 * 4. endTransition() automatically called → Overlay fades out
 * 5. New page content now visible
 * 
 * TIMING:
 * - Fade-out: 300ms (while old page is visible)
 * - Navigation: Instant
 * - Fade-in: 300ms (reveals new page)
 * - Total: ~600ms smooth transition
 * 
 * ============================================================================
 * SUPPORTED NAVIGATION METHODS
 * ============================================================================
 * 
 * ✅ AUTOMATICALLY SUPPORTED (with methods below):
 * - router.push() - when using useRouterWithTransition()
 * - router.replace() - when using useRouterWithTransition()
 * - router.back() - when using useRouterWithTransition()
 * - router.forward() - when using useRouterWithTransition()
 * - router.refresh() - when using useRouterWithTransition()
 * - <Link> components - when manually calling startTransition() in click handler
 * - Form submissions with redirect - when manually wrapping with startTransition()
 * 
 * ============================================================================
 * BEST PRACTICES
 * ============================================================================
 * 
 * 1. Use useRouterWithTransition() as your default
 *    - Drop-in replacement for useRouter()
 *    - Works with all router methods
 * 
 * 2. For forms with side effects, use usePageTransition()
 *    - Gives you control over transition timing
 *    - Can wait for validation, API calls, etc. before starting transition
 * 
 * 3. Create custom TransitionLink component for <Link> usage
 *    - Encapsulates the transition logic
 *    - Reusable across your app
 * 
 * 4. Keep the transition short (300-600ms)
 *    - Users expect quick feedback
 *    - Too long feels sluggish
 * 
 * ============================================================================
 * CUSTOMIZATION
 * ============================================================================
 * 
 * Adjust animation duration in PageTransitionOverlay.tsx:
 * ```tsx
 * <div
 *   className={`... transition-opacity duration-500 ...`}  // Change 300 to 500
 * />
 * ```
 * 
 * Adjust in useRouterWithTransition.ts setTimeout calls:
 * ```tsx
 * setTimeout(() => { router.push(href); }, 300); // Change timing
 * ```
 * 
 * Customize loading spinner and fade color in PageTransitionOverlay.tsx
 * 
 * ============================================================================
 * TROUBLESHOOTING
 * ============================================================================
 * 
 * Q: Transition doesn't appear
 * A: - Verify PageTransitionManager is in root layout
 *    - Check that you're using useRouterWithTransition() or calling startTransition()
 *    - Ensure PageTransitionOverlay component is rendering
 * 
 * Q: Transition is too fast/slow
 * A: - Adjust duration-300 to duration-500 or duration-200 in PageTransitionOverlay
 *    - Adjust setTimeout delays in useRouterWithTransition()
 * 
 * Q: Can I disable transitions for certain routes?
 * A: - Don't use useRouterWithTransition() for those routes
 *    - Use regular useRouter() instead
 *    - Or add a flag to usePageTransition to skip transition
 * 
 * Q: Transitions breaking with dynamic imports?
 * A: - Wrap the dynamic load in startTransition()
 *    - Use Suspense boundaries with transition state
 * 
 * ============================================================================
 */
