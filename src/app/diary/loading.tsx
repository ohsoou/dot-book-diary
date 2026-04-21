import { Skeleton } from '@/components/ui/Skeleton'

export default function DiaryLoading() {
  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Skeleton w="w-24" h="h-5" />
        <Skeleton w="w-20" h="h-8" />
      </div>
      <Skeleton w="w-full" h="h-9" className="mb-6" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 flex flex-col gap-2">
            <div className="flex justify-between">
              <Skeleton w="w-16" h="h-4" />
              <Skeleton w="w-12" h="h-4" />
            </div>
            <Skeleton w="w-full" h="h-4" />
            <Skeleton w="w-3/4" h="h-4" />
          </div>
        ))}
      </div>
    </main>
  )
}