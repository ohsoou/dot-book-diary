import { Skeleton } from '@/components/ui/Skeleton'

export default function BookCalendarLoading() {
  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Skeleton w="w-8" h="h-7" />
        <Skeleton w="w-24" h="h-5" />
        <Skeleton w="w-8" h="h-7" />
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`h-${i}`} h="h-6" />
        ))}
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={`c-${i}`} h="h-14" />
        ))}
      </div>
    </main>
  )
}
