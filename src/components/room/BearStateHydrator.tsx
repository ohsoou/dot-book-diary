'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/storage/use-store'
import { getLastReadAtFromStore } from '@/lib/last-read-store'
import { computeBearState } from '@/lib/bear-state'
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
      const lastReadAt = await getLastReadAtFromStore(store)
      if (cancelled) return

      const { asset, label } = computeBearState(lastReadAt, { now: new Date() })

      setGuestState({
        bearAsset: lastReadAt !== null ? asset : undefined,
        bearLabel: label,
        lastReadAt,
      })
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [isGuest, store, setGuestState])

  return null
}
