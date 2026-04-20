'use client'

import { useState } from 'react'
import type { DiaryEntry } from '@/types'
import { Button } from '@/components/ui/Button'
import { DiaryEntryForm } from './DiaryEntryForm'

const ENTRY_TYPE_LABEL: Record<DiaryEntry['entryType'], string> = {
  quote: '문장',
  review: '독후감',
}

interface DiaryEntryDetailProps {
  entry: DiaryEntry
  isLoggedIn: boolean
}

export function DiaryEntryDetail({ entry: initialEntry, isLoggedIn }: DiaryEntryDetailProps) {
  const [entry, setEntry] = useState(initialEntry)
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
            ← 취소
          </Button>
          <h2 className="text-sm text-[#d7c199]">수정</h2>
        </div>
        <DiaryEntryForm
          draftId={entry.id}
          initialEntryType={entry.entryType}
          initialBody={entry.body}
          initialBookId={entry.bookId}
          initialPage={entry.page}
          entryId={entry.id}
          isLoggedIn={isLoggedIn}
          onSuccess={(updated) => {
            setEntry(updated)
            setIsEditing(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#e89b5e]">{ENTRY_TYPE_LABEL[entry.entryType]}</span>
        <span className="text-xs text-[#a08866]">{entry.createdAt.slice(0, 10)}</span>
      </div>

      {entry.page != null && (
        <p className="text-xs text-[#8b6f4a]">{entry.page}p</p>
      )}

      <div className="bg-[#3a2a1a] border border-[#1a100a] px-4 py-4">
        <p className="text-sm text-[#d7c199] leading-relaxed whitespace-pre-wrap">{entry.body}</p>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
          수정
        </Button>
      </div>
    </div>
  )
}