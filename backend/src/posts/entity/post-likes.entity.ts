import { BaseModel } from "src/common/entity/base.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { Entity, ManyToOne, Unique } from "typeorm";
import { PostsModel } from "./posts.entity";

// UserFollowsModel과 동일한 패턴: user-post 조합을 유니크 제약으로 묶어
// 같은 사용자가 같은 게시글을 중복으로 좋아요할 수 없게 한다.
@Entity()
@Unique(['user', 'post'])
export class PostLikeModel extends BaseModel {
    @ManyToOne(() => UsersModel, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    user: UsersModel;

    @ManyToOne(() => PostsModel, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    post: PostsModel;
}
