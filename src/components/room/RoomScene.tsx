'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface RoomSceneProps {
  diaryHref?: string
  bookshelfHref?: string
  calendarHref?: string
  addBookHref?: string
  settingsHref?: string
}

interface SpriteImageProps {
  src: string
  label: string
  style: React.CSSProperties
  extraClass?: string
  onSettled: () => void
}

function SpriteImage({ src, label, style, extraClass = '', onSettled }: SpriteImageProps) {
  const [error, setError] = useState(false)

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
    <img
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

const TOTAL_SPRITES = 7

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
      {/* z-0: 방 배경 */}
      <SpriteImage
        src="/sprites/night/room.png"
        label="방"
        style={{ zIndex: 0, top: 0, left: 0, width: '100%', height: '100%' }}
        onSettled={handleSettled}
      />

      {/* z-10: 창문 */}
      <SpriteImage
        src="/sprites/night/window.png"
        label="창문"
        style={{ zIndex: 10, top: 40, left: 80 }}
        onSettled={handleSettled}
      />

      {/* z-10: 러그 */}
      <SpriteImage
        src="/sprites/night/rug.png"
        label="러그"
        style={{ zIndex: 10, bottom: 20, left: 160 }}
        onSettled={handleSettled}
      />

      {/* z-20: 책더미 (곰 오른쪽) */}
      <SpriteImage
        src="/sprites/night/books.png"
        label="책더미"
        style={{ zIndex: 20, bottom: 60, right: 120 }}
        onSettled={handleSettled}
      />

      {/* z-20: 다이어리 (곰 왼쪽) */}
      <SpriteImage
        src="/sprites/night/diary.png"
        label="다이어리"
        style={{ zIndex: 20, bottom: 60, left: 120 }}
        onSettled={handleSettled}
      />

      {/* z-30: 곰 (중앙, idle 애니메이션) */}
      <SpriteImage
        src="/sprites/night/bear.png"
        label="곰"
        style={{ zIndex: 30, bottom: 40, left: '50%', transform: 'translateX(-50%)' }}
        extraClass={reducedMotion ? '' : 'bear-idle'}
        onSettled={handleSettled}
      />

      {/* z-40: 램프 (flicker 애니메이션) */}
      <SpriteImage
        src="/sprites/night/lamp.png"
        label="램프"
        style={{ zIndex: 40, top: 180, right: 100 }}
        extraClass={reducedMotion ? '' : 'lamp-flicker'}
        onSettled={handleSettled}
      />

      {/* Hitbox buttons — Tab 순서: 다이어리 → 책장 → 캘린더 → 책 등록 → 설정 */}
      <button
        aria-label="다이어리"
        onClick={() => router.push(diaryHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, bottom: 60, left: 80, width: 80, height: 60 }}
      />
      <button
        aria-label="책장"
        onClick={() => router.push(bookshelfHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, bottom: 60, right: 80, width: 80, height: 60 }}
      />
      <button
        aria-label="캘린더"
        onClick={() => router.push(calendarHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, top: 40, left: 80, width: 100, height: 80 }}
      />
      <button
        aria-label="책 등록"
        onClick={() => router.push(addBookHref as never)}
        className="absolute bg-transparent"
        style={{ zIndex: 50, bottom: 40, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80 }}
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
