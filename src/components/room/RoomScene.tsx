'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useBearState } from './BearStateContext'
import { readLampState, writeLampState, type LampState } from '@/lib/lamp-state'

interface RoomSceneProps {
  theme: 'day' | 'night'
  bearAsset?: string
  diaryHref?: string
  bookshelfHref?: string
  calendarHref?: string
  addBookHref?: string
  settingsHref?: string
}

interface SpriteConfig {
  fileKey: string
  label: string
  z: number
  animClass?: 'bear-idle' | 'lamp-flicker'
  style: React.CSSProperties
}

type HrefKey = 'diaryHref' | 'bookshelfHref' | 'calendarHref' | 'addBookHref' | 'settingsHref'

interface HitboxConfig {
  label: string
  hrefKey: HrefKey
  style: React.CSSProperties
}

// Per-sprite filename map — handles day/night filename mismatches (e.g. Bookstack vs BookStack)
const SPRITE_FILES: Record<string, { day: string; night: string }> = {
  background:   { day: 'Background.png',    night: 'Background.png' },
  outsideView:  { day: 'Outside_view.png',  night: 'Outside_view.png' },
  window:       { day: 'Window.png',        night: 'Window.png' },
  hangingPlant: { day: 'Hanging_plant.png', night: 'Hanging_plant.png' },
  wallShelf:    { day: 'Wall_shelf.png',    night: 'Wall_shelf.png' },
  bedTable:     { day: 'Bed_Table.png',     night: 'Bed_Table.png' },
  tableLamp:    { day: 'Table_Lamp.png',    night: 'Table_Lamp.png' },
  bookstack:    { day: 'Bookstack.png',     night: 'BookStack.png' },
  diary:        { day: 'Diary.png',         night: 'Diary.png' },
  bear:         { day: 'Bear.png',          night: 'Bear.png' },
  rug:          { day: 'Rug.png',           night: 'Rug.png' },
}

// 640×400 캔버스(aspect-ratio 8/5) 기준 퍼센트 좌표.
const SPRITE_DEFS: SpriteConfig[] = [
  {
    fileKey: 'background',
    label: '배경',
    z: 0,
    style: { top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
  },
  {
    fileKey: 'outsideView',
    label: '창밖',
    z: 5,
    style: { top: '22.5%', left: '42.1875%', width: '18.75%', height: '25%' },
  },
  {
    fileKey: 'window',
    label: '창문',
    z: 10,
    style: { top: '17.5%', left: '32.8125%', width: '35.1563%', height: '33.75%' },
  },
  {
    fileKey: 'hangingPlant',
    label: '식물',
    z: 12,
    style: { top: '11.25%', left: '10.3125%', width: '14.0625%', height: '26%' },
  },
  {
    fileKey: 'wallShelf',
    label: '벽선반',
    z: 12,
    style: { top: '17.25%', right: '3.125%', width: '21.5625%', height: '17.25%' },
  },
  {
    fileKey: 'rug',
    label: '러그',
    z: 15,
    style: { bottom: '0.5%', left: '35.9375%', width: '45%', height: '29%' },
  },
  {
    fileKey: 'bedTable',
    label: '침대 테이블',
    z: 22,
    style: { bottom: '17.25%', left: '28.125%', width: '16.4063%', height: '25%' },
  },
  {
    fileKey: 'tableLamp',
    label: '램프',
    z: 25,
    style: { bottom: '19%', right: '-0.1563%', width: '19.8438%', height: '31%' },
    animClass: 'lamp-flicker',
  },
  {
    fileKey: 'bookstack',
    label: '책더미',
    z: 30,
    style: { bottom: '6.25%', right: '14.0625%', width: '17.5%', height: '19%' },
  },
  {
    fileKey: 'diary',
    label: '다이어리',
    z: 30,
    style: { bottom: '4.25%', left: '35.3438%', width: '14.0625%', height: '18%' },
  },
  {
    fileKey: 'bear',
    label: '곰',
    z: 25,
    style: { bottom: '1.25%', left: '42.0313%', width: '32.8125%', height: '42.25%' },
    animClass: 'bear-idle',
  },
]

const TOTAL_SPRITES = SPRITE_DEFS.length

// Hitbox: Tab 순서 — 다이어리 → 책장 → 캘린더 → 책 등록 → 설정
const HITBOX_DEFS: HitboxConfig[] = [
  {
    label: '다이어리',
    hrefKey: 'diaryHref',
    style: { bottom: '4.25%', left: '35.3438%', width: '14.0625%', height: '18%' },
  },
  {
    label: '책장',
    hrefKey: 'bookshelfHref',
    style: { top: '17.25%', right: '3.125%', width: '21.5625%', height: '17.25%' },
  },
  {
    label: '캘린더',
    hrefKey: 'calendarHref',
    style: { top: '17.5%', left: '32.8125%', width: '35.1563%', height: '33.75%' },
  },
  {
    label: '책 등록',
    hrefKey: 'addBookHref',
    style: { bottom: '6.25%', right: '14.0625%', width: '17.5%', height: '19%' },
  },
  {
    label: '설정',
    hrefKey: 'settingsHref',
    style: { top: '2%', right: '1.25%', width: '6.25%', height: '10%' },
  },
]

const SCENE_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '640 / 400',
  maxHeight: 'calc(100dvh - 64px)',
  maxWidth: 'calc((100dvh - 64px) * 1.6)',
}

interface SpriteImageProps {
  src: string
  label: string
  style: React.CSSProperties
  extraClass: string
  onSettled: () => void
}

function SpriteImage({ src, label, style, extraClass, onSettled }: SpriteImageProps) {
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const hasSettled = useRef(false)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const settle = () => {
      if (hasSettled.current) return
      hasSettled.current = true
      onSettled()
    }

    if (img.complete) {
      settle()
      return
    }

    const handleError = () => {
      setError(true)
      settle()
    }

    img.addEventListener('load', settle)
    img.addEventListener('error', handleError)

    return () => {
      img.removeEventListener('load', settle)
      img.removeEventListener('error', handleError)
    }
  }, [src, onSettled])

  if (error) {
    return (
      <div
        className="absolute bg-[#3a2a1a] border border-[#1a100a] flex items-center justify-center"
        style={style}
      >
        <span className="text-xs text-[#a08866]">{label}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt=""
      aria-hidden="true"
      className={`pixel absolute ${extraClass}`}
      style={style}
    />
  )
}

export function RoomScene({
  theme,
  bearAsset: bearAssetProp,
  diaryHref = '/diary',
  bookshelfHref = '/bookshelf',
  calendarHref = '/book-calendar',
  addBookHref = '/add-book',
  settingsHref = '/settings',
}: RoomSceneProps) {
  const router = useRouter()
  const { bearAsset: contextBearAsset } = useBearState()
  const bearAsset = bearAssetProp ?? contextBearAsset
  const [settledCount, setSettledCount] = useState(0)
  const [prevTheme, setPrevTheme] = useState(theme)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [lampState, setLampState] = useState<LampState>('on')

  if (theme !== prevTheme) {
    setPrevTheme(theme)
    setSettledCount(0)
  }

  const handleSettled = useCallback(() => {
    setSettledCount((prev) => prev + 1)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    setLampState(readLampState())
  }, [])

  const isVisible = settledCount >= TOTAL_SPRITES

  const hrefMap: Record<HrefKey, string> = {
    diaryHref,
    bookshelfHref,
    calendarHref,
    addBookHref,
    settingsHref,
  }

  const SPRITE_BASE = theme === 'day' ? '/sprites/day' : '/sprites/night'

  function resolveFilename(fileKey: string, baseFilename: string): string {
    if (theme === 'night' && lampState === 'off' && (fileKey === 'background' || fileKey === 'tableLamp')) {
      return baseFilename.replace(/\.png$/, '_off.png')
    }
    return baseFilename
  }

  return (
    <div
      role="img"
      aria-label="곰이 책을 읽는 따뜻한 방"
      className={isVisible ? 'opacity-100 transition-opacity duration-100' : 'opacity-0'}
      style={SCENE_STYLE}
    >
      {SPRITE_DEFS.map((def) => {
        const baseFilename =
          def.fileKey === 'bear' && bearAsset != null
            ? bearAsset
            : SPRITE_FILES[def.fileKey]![theme]
        const filename = resolveFilename(def.fileKey, baseFilename)
        const src = `${SPRITE_BASE}/${filename}`
        return (
          <SpriteImage
            key={`${theme}-${def.fileKey}`}
            src={src}
            label={def.label}
            style={{ zIndex: def.z, ...def.style }}
            extraClass={def.animClass && !reducedMotion && !(def.animClass === 'lamp-flicker' && lampState === 'off') ? def.animClass : ''}
            onSettled={handleSettled}
          />
        )
      })}

      {HITBOX_DEFS.map((def) => (
        <button
          key={def.label}
          aria-label={def.label}
          onClick={() => router.push(hrefMap[def.hrefKey] as never)}
          className="absolute bg-transparent"
          style={{ zIndex: 50, ...def.style }}
        />
      ))}

      {theme === 'night' && (
        <button
          type="button"
          aria-label="램프 전원"
          aria-pressed={lampState === 'on'}
          onClick={() => {
            const next: LampState = lampState === 'on' ? 'off' : 'on'
            setLampState(next)
            writeLampState(next)
          }}
          className="absolute bg-transparent cursor-pointer"
          style={{ zIndex: 50, bottom: '19%', right: '-0.1563%', width: '19.8438%', height: '31%' }}
        />
      )}
    </div>
  )
}
