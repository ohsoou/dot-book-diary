'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ToggleTabs } from '@/components/ui/ToggleTabs'
import { BookSearchForm } from './BookSearchForm'
import { useBookActions } from '@/lib/client-actions/useBookActions'
import { useToast } from '@/components/ui/Toast'
import type { ActionResult } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'

const BarcodeScanner = dynamic(
  () => import('./BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
  { ssr: false },
)

const TABS = ['검색', '바코드'] as const
type Tab = (typeof TABS)[number]

export function AddBookTabs({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>('검색')
  const router = useRouter()
  const { addToast } = useToast()
  const actions = useBookActions({ isLoggedIn })

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as Tab)
  }, [])

  const handleAddBook = useCallback(
    async (input: BookSearchResult): Promise<ActionResult<Book>> => {
      return actions.addBook(input)
    },
    [actions],
  )

  const handleScanResult = useCallback(
    async (book: BookSearchResult) => {
      const result = await handleAddBook(book)
      if (result.ok) {
        addToast({ message: '책을 추가했어요', variant: 'success' })
        router.push('/bookshelf' as never)
      } else if (result.error.code === 'DUPLICATE_ISBN') {
        addToast({ message: '이미 책장에 있는 책이에요', variant: 'info' })
        router.push('/bookshelf' as never)
      } else {
        addToast({ message: result.error.message, variant: 'error' })
      }
    },
    [handleAddBook, addToast, router],
  )

  const fallbackToSearch = useCallback(() => {
    setActiveTab('검색')
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <ToggleTabs
        variants={[...TABS]}
        value={activeTab}
        onChange={handleTabChange}
      />

      {activeTab === '검색' && (
        <BookSearchForm onAddBook={handleAddBook} />
      )}

      {activeTab === '바코드' && (
        <BarcodeScanner
          onScanResult={handleScanResult}
          onFallbackToSearch={fallbackToSearch}
        />
      )}
    </div>
  )
}