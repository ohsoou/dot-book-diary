'use server'

import { getStore } from '@/lib/storage'
import type { ActionResult } from '@/lib/errors'
import type { Book, BookSearchResult } from '@/types'
import { AppError } from '@/lib/errors'

export async function addBookAction(
  input: BookSearchResult,
): Promise<ActionResult<Book>> {
  try {
    const store = await getStore()

    if (input.isbn) {
      const existing = await store.findBookByIsbn(input.isbn)
      if (existing) {
        return {
          ok: false,
          error: { code: 'DUPLICATE_ISBN', message: '이미 책장에 있는 책이에요' },
        }
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
    if (err instanceof AppError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors },
      }
    }
    return {
      ok: false,
      error: { code: 'UPSTREAM_FAILED', message: '책 추가에 실패했어요' },
    }
  }
}