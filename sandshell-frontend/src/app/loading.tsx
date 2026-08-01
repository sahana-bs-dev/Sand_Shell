import LoadingScreen from "@/components/LoadingScreen";

/**
 * Next.js App Router convention: automatically shown as a Suspense
 * fallback while a route segment is loading (e.g. once /session
 * fetches real data from the backend in a later phase).
 *
 * The mock 5-second "Creating Secure Ubuntu Environment..." flow on
 * the landing page is handled separately in app/page.tsx, since that
 * loading state is triggered by a button click rather than a route
 * transition with async data.
 */
export default function Loading() {
  return <LoadingScreen active />;
}
