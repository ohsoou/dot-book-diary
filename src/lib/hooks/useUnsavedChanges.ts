'use client'

import { useEffect, useState } from 'react'

export function useUnsavedChanges() {
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  return { isDirty, setIsDirty }
}