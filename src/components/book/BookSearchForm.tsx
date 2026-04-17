'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { FieldError } from '@/components/ui/FieldError'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { ActionResult } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'

interface BookSearchFormProps {
  onAddBook: (input: BookSearchResult) => Promise<ActionResult<Book>>
}

type SearchState = {
  results: BookSearchResult[] | null
  error: string | null
  fieldError: string | null
}

const initialState: SearchState = { results: null, error: null, fieldError: null }

async function searchAction(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const q = (formData.get('q') as string | null) ?? ''
  if (!q.trim()) {
    return { results: null, error: null, fieldError: '검색어를 입력해 주세요' }
  }
  const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`)
  const json = await res.json() as { data?: BookSearchResult[]; error?: { message: string } }
  if (!res.ok || !json.data) {
    return { results: null, error: json.error?.message ?? '검색 중 오류가 발생했어요', fieldError: null }
  }
  return { results: json.data, error: null, fieldError: null }
}

export function BookSearchForm({ onAddBook }: BookSearchFormProps) {
  const router = useRouter()
  const { addToast } = useToast()

  const [state, formAction, isPending] = useActionState(searchAction, initialState)

  const [addingIsbn, setAddingIsbn] = useState<string | null>(null)
  const [confirmBook, setConfirmBook] = useState<BookSearchResult | null>(null)

  const handleAdd = useCallback(
    async (book: BookSearchResult) => {
      const result = await onAddBook(book)
      if (result.ok) {
        addToast({ message: '책을 추가했어요', variant: 'success' })
        router.push('/bookshelf' as never)
      } else if (result.error.code === 'DUPLICATE_ISBN') {
        setConfirmBook(book)
      } else {
        addToast({ message: result.error.message, variant: 'error' })
      }
    },
    [onAddBook, addToast, router],
  )

  const handleClickAdd = useCallback(
    async (book: BookSearchResult) => {
      const key = book.isbn ?? book.title
      setAddingIsbn(key)
      await handleAdd(book)
      setAddingIsbn(null)
    },
    [handleAdd],
  )

  useEffect(() => {
    if (state.error) {
      addToast({ message: state.error, variant: 'error' })
    }
  }, [state.error, addToast])

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex gap-2">
        <div className="flex-1 flex flex-col">
          <input
            name="q"
            type="search"
            placeholder="제목, 저자, ISBN 검색"
            className="w-full bg-[#3a2a1a] border border-[#8b6f4a] text-[#d7c199] placeholder-[#6b5540] px-3 py-2 text-sm focus:outline-none focus:border-[#e89b5e]"
            aria-label="책 검색"
          />
          <FieldError message={state.fieldError ?? undefined} />
        </div>
        <Button type="submit" variant="primary" pending={isPending} pendingLabel="검색 중...">
          검색
        </Button>
      </form>

      {isPending && (
        <div className="flex flex-col gap-3" aria-label="검색 결과 로딩 중">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton h="h-[80px]" w="w-[56px]" />
              <div className="flex-1 flex flex-col gap-2 py-1">
                <Skeleton h="h-4" w="w-3/4" />
                <Skeleton h="h-3" w="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isPending && state.results !== null && state.results.length === 0 && (
        <EmptyState message="검색 결과가 없어요" />
      )}

      {!isPending && state.results !== null && state.results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.results.map((book) => {
            const key = book.isbn ?? book.title
            const isAdding = addingIsbn === key
            return (
              <li
                key={key}
                className="flex gap-3 border border-[#3a2a1a] bg-[#2a1f17] p-3"
              >
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl}
                    alt={`${book.title} 표지`}
                    width={56}
                    height={80}
                    className="object-cover shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="w-[56px] h-[80px] bg-[#3a2a1a] shrink-0 flex items-center justify-center">
                    <span className="text-[#6b5540] text-xs">표지 없음</span>
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <p className="text-sm text-[#f4e4c1] line-clamp-2 leading-snug">{book.title}</p>
                  {book.author && (
                    <p className="text-xs text-[#a08866]">{book.author}</p>
                  )}
                  {book.publisher && (
                    <p className="text-xs text-[#6b5540]">{book.publisher}</p>
                  )}
                  <div className="mt-auto pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      pending={isAdding}
                      pendingLabel="추가 중..."
                      onClick={() => void handleClickAdd(book)}
                    >
                      내 책장에 추가
                    </Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmBook !== null}
        title="이미 책장에 있는 책이에요"
        message="책장으로 이동할까요?"
        confirmLabel="책장으로"
        cancelLabel="취소"
        onConfirm={() => {
          setConfirmBook(null)
          router.push('/bookshelf' as never)
        }}
        onCancel={() => setConfirmBook(null)}
      />
    </div>
  )
}