'use client'

import { useMemo } from 'react'
import { LocalStore } from '@/lib/storage/LocalStore'
import { AppError, type ActionResult } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'
import {
  listBooksAction,
  addBookAction,
  updateBookAction,
  deleteBookAction,
} from '@/lib/actions/books'

export type UseBookActions = {
  listBooks(): Promise<ActionResult<Book[]>>
  addBook(input: BookSearchResult): Promise<ActionResult<Book>>
  updateBook(id: string, patch: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ActionResult<Book>>
  deleteBook(id: string): Promise<ActionResult<void>>
  findBookByIsbn(isbn: string): Promise<ActionResult<Book | null>>
}

function wrapError(err: unknown, fallbackMessage: string): ActionResult<never> {
  if (err instanceof AppError) {
    return { ok: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } }
  }
  return { ok: false, error: { code: 'UPSTREAM_FAILED', message: fallbackMessage } }
}

export function useBookActions(opts: { isLoggedIn: boolean }): UseBookActions {
  const store = useMemo(() => new LocalStore(), [])

  return useMemo<UseBookActions>(() => {
    if (opts.isLoggedIn) {
      return {
        listBooks: () => listBooksAction(),
        addBook: (input) => addBookAction(input),
        updateBook: (id, patch) => updateBookAction(id, patch),
        deleteBook: (id) => deleteBookAction(id),
        findBookByIsbn: async (isbn) => {
          const result = await listBooksAction()
          if (!result.ok) return result
          const found = result.data.find((b) => b.isbn === isbn) ?? null
          return { ok: true, data: found }
        },
      }
    }

    return {
      listBooks: async () => {
        try {
          const books = await store.listBooks()
          return { ok: true, data: books }
        } catch (err) {
          return wrapError(err, '책 목록을 불러오지 못했어요')
        }
      },
      addBook: async (input) => {
        try {
          if (input.isbn) {
            const existing = await store.findBookByIsbn(input.isbn)
            if (existing) {
              return { ok: false, error: { code: 'DUPLICATE_ISBN', message: '이미 책장에 있는 책이에요' } }
            }
          }
          const book = await store.addBook({
            isbn: input.isbn,
            title: input.title,
            author: input.author,
            publisher: input.publisher,
            coverUrl: input.coverUrl,
            totalPages: input.totalPages,
          })
          return { ok: true, data: book }
        } catch (err) {
          return wrapError(err, '책 추가에 실패했어요')
        }
      },
      updateBook: async (id, patch) => {
        try {
          const book = await store.updateBook(id, patch)
          return { ok: true, data: book }
        } catch (err) {
          return wrapError(err, '책 수정에 실패했어요')
        }
      },
      deleteBook: async (id) => {
        try {
          await store.deleteBook(id)
          return { ok: true, data: undefined }
        } catch (err) {
          return wrapError(err, '책 삭제에 실패했어요')
        }
      },
      findBookByIsbn: async (isbn) => {
        try {
          const book = await store.findBookByIsbn(isbn)
          return { ok: true, data: book }
        } catch (err) {
          return wrapError(err, '책 검색에 실패했어요')
        }
      },
    }
  }, [opts.isLoggedIn, store])
}
