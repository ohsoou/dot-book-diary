import { Skeleton } from '@/components/ui/Skeleton'

export default function DiaryEntryLoading() {
  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton w="w-16" h="h-4" />
      </div>
      <div className="flex justify-between mb-4">
        <Skeleton w="w-12" h="h-4" />
        <Skeleton w="w-20" h="h-4" />
      </div>
      <Skeleton w="w-full" h="h-48" className="mb-4" />
      <Skeleton w="w-16" h="h-8" />
    </main>
  )
}