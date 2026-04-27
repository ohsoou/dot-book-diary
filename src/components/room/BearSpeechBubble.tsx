'use client'

interface BearSpeechBubbleProps {
  label: string | null
  nickname: string
}

export function BearSpeechBubble({ label, nickname }: BearSpeechBubbleProps) {
  if (!label) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="absolute transition-opacity duration-100 ease-linear"
      style={{ zIndex: 35, bottom: '38%', left: '58%' }}
    >
      <div
        className="relative bg-[#3a2a1a] border border-[#1a100a] shadow-[2px_2px_0_#1a100a] px-3 py-2 max-w-[160px]"
      >
        <p className="text-xs text-[#f4e4c1]">{nickname}</p>
        <p className="text-xs text-[#d7c199]">{label}</p>
        {/* 말풍선 꼬리 — outer (border) */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-9px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '9px solid #1a100a',
          }}
        />
        {/* 말풍선 꼬리 — inner (fill) */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid #3a2a1a',
          }}
        />
      </div>
    </div>
  )
}
