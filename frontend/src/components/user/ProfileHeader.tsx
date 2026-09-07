import { Calendar } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { User } from '@/types/user'
import { formatJoinDate } from '@/utils/formatRelativeTime'

interface ProfileHeaderProps {
  user: User
}

function ProfileHeader({ user }: ProfileHeaderProps) {
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
        <Button variant="outline" className="rounded-full">
          Edit Profile
        </Button>
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
          <span>
            <span className="font-semibold text-foreground">{user.followingCount}</span>{' '}
            <span className="text-muted-foreground">Following</span>
          </span>
          <span>
            <span className="font-semibold text-foreground">{user.followerCount}</span>{' '}
            <span className="text-muted-foreground">Followers</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader
