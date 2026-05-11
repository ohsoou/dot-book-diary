'use client'

import { useEffect, useState } from 'react'
import { getPreferences, updatePreferences } from '@/lib/storage/preferences'
import { Modal } from '@/components/ui/Modal'

const GUIDE_ITEMS = [
  { label: '다이어리', desc: '왼쪽 노트를 누르면 일기로 가요' },
  { label: '책장', desc: '벽 선반을 누르면 책장으로 가요' },
  { label: '캘린더', desc: '창문을 누르면 책 캘린더로 가요' },
  { label: '책 등록', desc: '책더미를 누르면 책을 등록할 수 있어요' },
  { label: '설정', desc: '곰을 누르면 설정으로 가요' },
] as const

export function HomeGuide(): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    getPreferences().then((prefs) => {
      setDismissed(prefs.homeGuideDismissed ?? false)
    })
  }, [])

  async function handleDismiss() {
    setDismissed(true)
    await updatePreferences({ homeGuideDismissed: true })
  }

  if (dismissed !== false) return null

  return (
    <Modal open title="이 방의 도트들을 눌러보세요" onClose={handleDismiss} footer={
      <button
        onClick={handleDismiss}
        className="bg-[#e89b5e] border border-[#1a100a] text-[#2a1f17] px-3 py-2 text-sm hover:bg-[#f0a96c] active:translate-y-px transition-colors duration-100 ease-linear"
      >
        방을 둘러볼게요
      </button>
    }>
      <ul className="flex flex-col gap-3">
        {GUIDE_ITEMS.map((item) => (
          <li key={item.label} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#e89b5e] border border-[#1a100a] shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#f4e4c1]">{item.label}</span>
            </div>
            <p className="text-xs text-[#a08866] ml-4">{item.desc}</p>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
