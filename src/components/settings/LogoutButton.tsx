'use client'

import { Button } from '@/components/ui/Button'
import { signOutAction } from '@/lib/actions/profile'

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="secondary" size="sm">
        로그아웃
      </Button>
    </form>
  )
}
