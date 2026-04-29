import { useMemo } from 'react'
import { LocalStore } from './LocalStore'
import type { Store } from './Store'

export function useStore(): Store {
  return useMemo(() => new LocalStore(), [])
}
