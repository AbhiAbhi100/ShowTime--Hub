import { Suspense, lazy, ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Loading fallback components
export const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4 justify-center mt-8">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  </div>
);

export const CardLoader = () => (
  <div className="rounded-xl border border-border bg-card p-6 space-y-4">
    <Skeleton className="h-48 w-full rounded-lg" />
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

export const GridLoader = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <CardLoader key={i} />
    ))}
  </div>
);

// Lazy load helper with retry
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error("Failed to load module");
  });
}

// Lazy loaded pages
export const LazyIndex = lazyWithRetry(() => import("@/pages/Index"));
export const LazyMovieDetails = lazyWithRetry(
  () => import("@/pages/MovieDetails")
);
export const LazyTheatreSelection = lazyWithRetry(
  () => import("@/pages/TheatreSelection")
);
export const LazySeatSelection = lazyWithRetry(
  () => import("@/pages/SeatSelection")
);
export const LazyCheckout = lazyWithRetry(() => import("@/pages/Checkout"));
export const LazySuccess = lazyWithRetry(() => import("@/pages/Success"));
export const LazyProfile = lazyWithRetry(() => import("@/pages/Profile"));
export const LazyAuth = lazyWithRetry(() => import("@/pages/Auth"));

// Admin pages
export const LazyAdminDashboard = lazyWithRetry(
  () => import("@/pages/admin/AdminDashboard")
);
export const LazyAdminMovies = lazyWithRetry(
  () => import("@/pages/admin/AdminMovies")
);
export const LazyAdminTheatres = lazyWithRetry(
  () => import("@/pages/admin/AdminTheatres")
);
export const LazyAdminShows = lazyWithRetry(
  () => import("@/pages/admin/AdminShows")
);
export const LazyAdminLogin = lazyWithRetry(
  () => import("@/pages/admin/AdminLogin")
);

// Suspense wrapper component
interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SuspenseWrapper = ({
  children,
  fallback = <PageLoader />,
}: SuspenseWrapperProps) => {
  return <Suspense fallback={fallback}>{children}</Suspense>;
};

export default SuspenseWrapper;
