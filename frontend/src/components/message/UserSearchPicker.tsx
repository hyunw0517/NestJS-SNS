import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUserSearchQuery } from '@/hooks/useUsers'
import { cn } from '@/lib/utils'
import type { ApiUserSearchResult } from '@/types/user'

interface UserSearchPickerProps {
  // 이미 선택되었거나(그룹 생성/초대 중 선택 목록) 대상이 될 수 없는(본인, 이미 활성
  // 멤버) 사용자 id. 검색 결과에서 아예 빼서 같은 사람을 두 번 선택할 수 없게 한다.
  excludeIds: number[]
  onToggle: (user: ApiUserSearchResult) => void
  disabled?: boolean
}

// 그룹 생성(GroupCreateDialog)과 멤버 초대(InviteMembersDialog) 양쪽에서 재사용하는
// 사용자 검색 목록. 입력을 300ms 디바운스한 뒤 GET /users/search를 호출한다.
function UserSearchPicker({ excludeIds, onToggle, disabled }: UserSearchPickerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)

    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isFetching } = useUserSearchQuery(debouncedQuery)
  const users = (results ?? []).filter((user) => !excludeIds.includes(user.id))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="닉네임 또는 handle 검색"
          disabled={disabled}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
      </div>

      <div className="max-h-48 overflow-y-auto rounded-lg border">
        {isFetching && <p className="px-3 py-4 text-center text-sm text-muted-foreground">검색 중...</p>}

        {!isFetching && users.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            {debouncedQuery ? '검색 결과가 없습니다.' : '선택할 사용자가 없습니다.'}
          </p>
        )}

        {!isFetching &&
          users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onToggle(user)}
              disabled={disabled}
              data-user-id={user.id}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              <Avatar size="sm">
                <AvatarImage src={user.profileImage ?? undefined} alt={user.nickname} />
                <AvatarFallback>{user.nickname.slice(0, 1)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{user.nickname}</div>
                <div className="truncate text-xs text-muted-foreground">@{user.handle ?? user.nickname}</div>
              </div>
            </button>
          ))}
      </div>
    </div>
  )
}

export default UserSearchPicker
