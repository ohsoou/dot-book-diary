import { Skeleton } from '@/components/ui/Skeleton'

export default function BookshelfLoading() {
  return (
    <main className="min-h-dvh bg-[#2a1f17] px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-base text-[#f4e4c1] mb-6">책장</h1>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} w="w-24" h="h-36" />
        ))}
      </div>
    </main>
  )
}
