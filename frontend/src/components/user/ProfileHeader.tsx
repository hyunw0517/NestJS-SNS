import { Calendar } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { User } from '@/types/user'
import { formatJoinDate } from '@/utils/formatRelativeTime'

interface ProfileHeaderProps {
  user: User
  isOwnProfile: boolean
  isFollowing?: boolean
  isFollowPending?: boolean
  onToggleFollow?: () => void
  onEditProfile?: () => void
  onShowFollowers?: () => void
  onShowFollowing?: () => void
  onMessage?: () => void
  isMessagePending?: boolean
}

function ProfileHeader({
  user,
  isOwnProfile,
  isFollowing = false,
  isFollowPending = false,
  onToggleFollow = () => {},
  onEditProfile = () => {},
  onShowFollowers = () => {},
  onShowFollowing = () => {},
  onMessage = () => {},
  isMessagePending = false,
}: ProfileHeaderProps) {
  return (
    <div>
      <div className="relative">
        <div className="h-32 w-full bg-muted sm:h-48">
          {user.coverImage && (
            <img src={user.coverImage} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="absolute -bottom-10 left-4">
          <Avatar size="lg" className="size-20 ring-4 ring-background">
            <AvatarImage src={user.profileImage} alt={user.nickname} />
            <AvatarFallback>{user.nickname.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="flex justify-end px-4 pt-3">
        {isOwnProfile ? (
          <Button variant="outline" className="rounded-full" onClick={onEditProfile}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={onMessage} disabled={isMessagePending}>
              Message
            </Button>
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              className="rounded-full"
              onClick={onToggleFollow}
              disabled={isFollowPending}
            >
              {isFollowPending ? '처리 중...' : isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 px-4 pb-3">
        <div className="text-xl font-bold">{user.nickname}</div>
        <div className="text-sm text-muted-foreground">@{user.handle}</div>

        {user.bio && <p className="mt-3 text-sm">{user.bio}</p>}

        <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          {formatJoinDate(user.joinedAt)}
        </div>

        <div className="mt-3 flex gap-4 text-sm">
          <button type="button" onClick={onShowFollowing} aria-label="팔로잉 목록 보기" className="hover:underline">
            <span className="font-semibold text-foreground">{user.followingCount}</span>{' '}
            <span className="text-muted-foreground">Following</span>
          </button>
          <button type="button" onClick={onShowFollowers} aria-label="팔로워 목록 보기" className="hover:underline">
            <span className="font-semibold text-foreground">{user.followerCount}</span>{' '}
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader
