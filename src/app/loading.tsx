import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6">
      <Skeleton h="h-8" w="w-48" />
      <Skeleton h="h-4" w="w-64" className="mt-4" />
    </div>
  )
}
