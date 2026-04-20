import { Skeleton } from '@/components/ui/Skeleton'

export default function ReadingLoading() {
  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex gap-4 mb-6">
        <Skeleton w="w-24" h="h-36" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton w="w-48" h="h-4" />
          <Skeleton w="w-32" h="h-3" />
        </div>
      </div>
      <Skeleton w="w-full" h="h-48" />
    </main>
  )
}
