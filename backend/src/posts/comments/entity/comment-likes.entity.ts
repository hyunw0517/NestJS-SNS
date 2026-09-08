import { BaseModel } from "src/common/entity/base.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { Entity, ManyToOne, Unique } from "typeorm";
import { CommentsModel } from "./comments.entity";

// PostLikeModel과 동일한 패턴.
@Entity()
@Unique(['user', 'comment'])
export class CommentLikeModel extends BaseModel {
    @ManyToOne(() => UsersModel, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    user: UsersModel;

    @ManyToOne(() => CommentsModel, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    comment: CommentsModel;
}
