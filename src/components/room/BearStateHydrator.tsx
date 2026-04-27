'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/storage/use-store'
import { getLastReadAtFromStore } from '@/lib/last-read-store'
import { getPreferences } from '@/lib/storage/preferences'
import { computeBearState } from '@/lib/bear-state'
import { getDisplayNickname } from '@/lib/nickname'
import { useSetBearState } from './BearStateContext'

interface BearStateHydratorProps {
  isGuest: boolean
}

export function BearStateHydrator({ isGuest }: BearStateHydratorProps) {
  const store = useStore()
  const setGuestState = useSetBearState()

  useEffect(() => {
    if (!isGuest) return

    let cancelled = false

    async function hydrate() {
      const [lastReadAt, prefs] = await Promise.all([
        getLastReadAtFromStore(store),
        getPreferences(),
      ])
      if (cancelled) return

      const { asset, label } = computeBearState(lastReadAt, { now: new Date() })

      setGuestState({
        bearAsset: lastReadAt !== null ? asset : undefined,
        bearLabel: label,
        lastReadAt,
        nickname: getDisplayNickname(prefs.nickname),
      })
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [isGuest, store, setGuestState])

  return null
}
