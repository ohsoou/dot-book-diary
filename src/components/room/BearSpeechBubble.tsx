'use client'

import { useBearState } from './BearStateContext'

export function BearSpeechBubble() {
  const { bearLabel, nickname } = useBearState()
  if (!bearLabel) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="w-full px-4 py-4"
    >
      <div className="bg-[#3a2a1a] border-2 border-[#1a100a] shadow-[2px_2px_0_#1a100a] px-4 py-3 w-full">
        <p className="text-sm font-bold text-[#f4e4c1]">{nickname}</p>
        <p className="text-sm text-[#d7c199]">{bearLabel}</p>
      </div>
    </div>
  )
}
