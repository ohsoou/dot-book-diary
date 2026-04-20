'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DiaryEntry } from '@/types'
import { ToggleTabs } from '@/components/ui/ToggleTabs'
import { EmptyState } from '@/components/ui/EmptyState'

const FILTER_OPTIONS = ['전체', '문장', '독후감']
const FILTER_MAP: Record<string, DiaryEntry['entryType'] | undefined> = {
  전체: undefined,
  문장: 'quote',
  독후감: 'review',
}
const ENTRY_TYPE_LABEL: Record<DiaryEntry['entryType'], string> = {
  quote: '문장',
  review: '독후감',
}

interface DiaryListProps {
  entries: DiaryEntry[]
}

export function DiaryList({ entries }: DiaryListProps) {
  const [filter, setFilter] = useState('전체')

  const filtered =
    FILTER_MAP[filter] == null
      ? entries
      : entries.filter((e) => e.entryType === FILTER_MAP[filter])

  return (
    <div className="flex flex-col gap-4">
      <ToggleTabs variants={FILTER_OPTIONS} value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState
          message={filter === '전체' ? '아직 기록이 없어요' : `${filter} 기록이 없어요`}
          cta={{ label: '첫 기록 쓰기', href: '/diary/new' }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/diary/${entry.id}` as never}
                className="block bg-[#3a2a1a] border border-[#1a100a] px-4 py-3 hover:border-[#8b6f4a] transition-colors duration-100 ease-linear"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-[#e89b5e]">{ENTRY_TYPE_LABEL[entry.entryType]}</span>
                  <span className="text-xs text-[#a08866]">
                    {entry.createdAt.slice(0, 10)}
                  </span>
                </div>
                <p className="text-sm text-[#d7c199] line-clamp-3 whitespace-pre-wrap leading-relaxed">
                  {entry.body}
                </p>
                {entry.page != null && (
                  <p className="text-xs text-[#8b6f4a] mt-1">{entry.page}p</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}