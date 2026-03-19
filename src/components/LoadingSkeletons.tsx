import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  count?: number;
}

export const MovieCardSkeleton = () => (
  <div className="rounded-xl bg-card overflow-hidden animate-pulse">
    <div className="aspect-[2/3] bg-muted" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-muted rounded w-3/4" />
      <div className="flex gap-2">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-4 bg-muted rounded w-12" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
    </div>
  </div>
);

export const MovieGridSkeleton = ({ count = 8 }: LoadingSkeletonProps) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.05 }}
      >
        <MovieCardSkeleton />
      </motion.div>
    ))}
  </div>
);

export const HeroSkeleton = () => (
  <div className="relative h-[70vh] bg-card animate-pulse">
    <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
      <div className="h-12 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="flex gap-4 mt-6">
        <div className="h-12 bg-muted rounded-full w-32" />
        <div className="h-12 bg-muted rounded-full w-32" />
      </div>
    </div>
  </div>
);

export const DetailsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 bg-muted rounded w-3/4" />
    <div className="flex gap-3">
      <div className="h-6 bg-muted rounded-full w-20" />
      <div className="h-6 bg-muted rounded-full w-24" />
      <div className="h-6 bg-muted rounded-full w-16" />
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-3/4" />
    </div>
    <div className="grid grid-cols-4 gap-4 mt-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square bg-muted rounded-full" />
          <div className="h-3 bg-muted rounded w-full" />
        </div>
      ))}
    </div>
  </div>
);
