export const DEFAULT_NICKNAME = '책곰이'

export function getDisplayNickname(nickname?: string | null): string {
  if (!nickname || !nickname.trim()) return DEFAULT_NICKNAME
  return nickname.trim()
}
