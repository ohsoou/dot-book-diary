interface SkeletonProps {
  h?: string
  w?: string
  className?: string
}

export function Skeleton({ h = 'h-4', w = 'w-full', className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--color-bg-card)] animate-pulse motion-reduce:animate-none ${h} ${w} ${className}`}
      aria-hidden="true"
    />
  )
}
