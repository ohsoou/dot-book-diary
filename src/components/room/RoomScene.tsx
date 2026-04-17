'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface RoomSceneProps {
  diaryHref?: string
  bookshelfHref?: string
  calendarHref?: string
  addBookHref?: string
  settingsHref?: string
}

interface SpriteConfig {
  src: string
  label: string
  z: number
  style: React.CSSProperties
  animClass?: 'bear-idle' | 'lamp-flicker'
}

// 뒤 → 앞 레이어 순서로 정렬
const SPRITE_DEFS: SpriteConfig[] = [
  {
    src: '/sprites/day/Background.png',
    label: '배경',
    z: 0,
    style: { top: 0, left: 0, width: 640, height: 400, objectFit: 'cover' },
  },
  // 창문: 바깥 풍경을 먼저 깔고 프레임으로 덮는다
  {
    src: '/sprites/day/Outside_view.png',
    label: '창밖',
    z: 5,
    style: { top: 46, left: 58, width: 120, height: 85 },
  },
  {
    src: '/sprites/day/Window.png',
    label: '창문',
    z: 10,
    style: { top: 28, left: 28, width: 178, height: 116 },
  },
  // 벽 장식
  {
    src: '/sprites/day/Hanging_plant.png',
    label: '식물',
    z: 12,
    style: { top: -8, right: 18, width: 72, height: 96 },
  },
  {
    src: '/sprites/day/Wall_shelf.png',
    label: '벽선반',
    z: 12,
    style: { top: 155, right: 48, width: 138, height: 69 },
  },
  // 바닥 (뒤에서 앞으로)
  {
    src: '/sprites/day/Rug.png',
    label: '러그',
    z: 15,
    style: { bottom: 18, left: 175, width: 290, height: 117 },
  },
  {
    src: '/sprites/day/Bed.png',
    label: '침대',
    z: 20,
    style: { bottom: 35, left: -8, width: 185, height: 94 },
  },
  {
    src: '/sprites/day/Bed_Table.png',
    label: '침대 테이블',
    z: 22,
    style: { bottom: 90, left: 150, width: 105, height: 100 },
  },
  {
    src: '/sprites/day/Table_Lamp.png',
    label: '램프',
    z: 25,
    style: { bottom: 75, right: 38, width: 127, height: 124 },
    animClass: 'lamp-flicker',
  },
  // 곰 주변 소품
  {
    src: '/sprites/day/Bookstack.png',
    label: '책더미',
    z: 30,
    style: { bottom: 158, right: 158, width: 112, height: 76 },
  },
  {
    src: '/sprites/day/Diary.png',
    label: '다이어리',
    z: 30,
    style: { bottom: 152, left: 148, width: 104, height: 72 },
  },
  // 주인공
  {
    src: '/sprites/day/Bear.png',
    label: '곰',
    z: 35,
    style: { bottom: 38, left: 215, width: 210, height: 169 },
    animClass: 'bear-idle',
  },
]

const TOTAL_SPRITES = SPRITE_DEFS.length

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

  // preload로 이미 캐시된 이미지는 onLoad가 발화하지 않으므로 마운트 후 직접 확인
  useEffect(() => {
    if (imgRef.current?.complete) {
      onSettled()
    }
  }, [onSettled])

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
      onLoad={onSettled}
      onError={() => {
        setError(true)
        onSettled()
      }}
    />
  )
}

export function RoomScene({
  diaryHref = '/diary',
  bookshelfHref = '/bookshelf',
  calendarHref = '/book-calendar',
  addBookHref = '/add-book',
  settingsHref = '/settings',
}: RoomSceneProps) {
  const router = useRouter()
  const [settledCount, setSettledCount] = useState(0)
  const [scale, setScale] = useState(1)
  const [reducedMotion, setReducedMotion] = useState(false)

  const handleSettled = useCallback(() => {
    setSettledCount((prev) => prev + 1)
  }, [])

  useEffect(() => {
    function updateScale() {
      setScale(window.innerWidth >= 1280 ? 2 : 1)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isVisible = settledCount >= TOTAL_SPRITES

  return (
    <div
      role="img"
      aria-label="곰이 책을 읽는 따뜻한 방"
      className={isVisible ? 'opacity-100 transition-opacity duration-300' : 'opacity-0'}
      style={{
        position: 'relative',
        width: 640,
        height: 400,
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
    >
      {SPRITE_DEFS.map((def) => (
        <SpriteImage
          key={def.src}
          src={def.src}
          label={def.label}
          style={{ zIndex: def.z, ...def.style }}
          extraClass={
            def.animClass && !reducedMotion ? def.animClass : ''
          }
          onSettled={handleSettled}
        />
      ))}

      {/* Hitbox buttons — Tab 순서: 다이어리 → 책장 → 캘린더 → 책 등록 → 설정 */}
      <button
        aria-label="다이어리"
        onClick={() => router.push(diaryHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, bottom: 152, left: 148, width: 104, height: 72 }}
      />
      <button
        aria-label="책장"
        onClick={() => router.push(bookshelfHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, top: 155, right: 48, width: 138, height: 69 }}
      />
      <button
        aria-label="캘린더"
        onClick={() => router.push(calendarHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, top: 28, left: 28, width: 178, height: 116 }}
      />
      <button
        aria-label="책 등록"
        onClick={() => router.push(addBookHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, bottom: 38, left: 215, width: 210, height: 169 }}
      />
      <button
        aria-label="설정"
        onClick={() => router.push(settingsHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, top: 8, right: 8, width: 40, height: 40 }}
      />
    </div>
  )
}
