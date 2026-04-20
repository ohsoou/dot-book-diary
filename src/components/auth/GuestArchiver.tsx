'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePreferences } from '@/lib/storage/preferences'

export function GuestArchiver() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        updatePreferences({ localArchived: true }).catch(() => {})
      }
    })
  }, [])

  return null
}
