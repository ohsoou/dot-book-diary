import { Skeleton } from '@/components/ui/Skeleton'

export default function AddBookLoading() {
  return (
    <main className="min-h-dvh bg-[var(--color-bg)] px-4 py-6 max-w-2xl mx-auto">
      <Skeleton h="h-6" w="w-24" className="mb-6" />
      <Skeleton h="h-10" w="w-full" className="mb-4" />
      <div className="flex gap-2">
        <Skeleton h="h-10" className="flex-1" />
        <Skeleton h="h-10" w="w-16" />
      </div>
    </main>
  )
}