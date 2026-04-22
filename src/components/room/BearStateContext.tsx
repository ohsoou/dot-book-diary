'use client'

import { createContext, useContext, useState } from 'react'

export interface BearStateContextValue {
  bearAsset: string | undefined
  bearLabel: string | null
  lastReadAt: string | null
}

interface BearStateContextFull {
  state: BearStateContextValue
  setGuestState: (value: BearStateContextValue) => void
}

const defaultState: BearStateContextValue = {
  bearAsset: undefined,
  bearLabel: null,
  lastReadAt: null,
}

const BearStateContext = createContext<BearStateContextFull>({
  state: defaultState,
  setGuestState: () => {},
})

export function BearStateProvider({
  children,
  initial,
}: {
  children: React.ReactNode
  initial: BearStateContextValue
}) {
  const [state, setGuestState] = useState<BearStateContextValue>(initial)
  return (
    <BearStateContext.Provider value={{ state, setGuestState }}>
      {children}
    </BearStateContext.Provider>
  )
}

export function useBearState(): BearStateContextValue {
  return useContext(BearStateContext).state
}

export function useSetBearState() {
  return useContext(BearStateContext).setGuestState
}
