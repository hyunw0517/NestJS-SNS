export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return '방금'
  if (diffMinutes < 60) return `${diffMinutes}분`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}일`

  const date = new Date(isoDate)
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

export function formatJoinDate(isoDate: string): string {
  const date = new Date(isoDate)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 가입`
}

export function formatFullDateTime(isoDate: string): string {
  const date = new Date(isoDate)
  const hours = date.getHours()
  const period = hours < 12 ? '오전' : '오후'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${period} ${hour12}:${minutes} · ${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}
