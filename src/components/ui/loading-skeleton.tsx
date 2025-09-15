import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  );
}

// Gift Card Skeleton
function GiftCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 space-y-3 shadow-sm">
      <Skeleton className="w-12 h-12 mx-auto rounded-lg" />
      <div className="text-center space-y-1">
        <Skeleton className="h-4 w-20 mx-auto" />
        <Skeleton className="h-3 w-16 mx-auto" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

// Activity Item Skeleton  
function ActivityItemSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Channel Card Skeleton
function ChannelCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton, GiftCardSkeleton, ActivityItemSkeleton, ChannelCardSkeleton };