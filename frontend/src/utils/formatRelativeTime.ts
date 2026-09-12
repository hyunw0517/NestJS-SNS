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

// getHours()/getMinutes()는 이미 브라우저 local timezone 기준이라(서버가 준 ISO를
// 별도로 변환할 필요 없음), 오전/오후 표기만 직접 조립한다.
function formatTimeOfDay(date: Date): string {
  const hours = date.getHours()
  const period = hours < 12 ? '오전' : '오후'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${period} ${hour12}:${minutes}`
}

export function formatFullDateTime(isoDate: string): string {
  const date = new Date(isoDate)

  return `${formatTimeOfDay(date)} · ${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

// 메시지 전송 시간 표시(MessageBubble)용. 초 단위 없이 시:분만, 날짜는 표시하지 않는다.
export function formatMessageTime(isoDate: string): string {
  return formatTimeOfDay(new Date(isoDate))
}
