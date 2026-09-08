import { IsNumber, IsOptional, IsString } from "class-validator";
import { BaseModel } from "src/common/entity/base.entity";
import { PostsModel } from "src/posts/entity/posts.entity";
import { UsersModel } from "src/users/entity/users.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class CommentsModel extends BaseModel {

    @ManyToOne(() => UsersModel, (user) => user.postComments, {
        nullable: false,
    })
    author: UsersModel;

    @ManyToOne(() => PostsModel, (post) => post.comments, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    post: PostsModel;

    @Column()
    @IsString()
    comment: string;

    @Column({
        default: 0,
    })
    @IsNumber()
    likeCount: number;

    // 대댓글(무제한 중첩)용 자기참조 관계. 최상위 댓글은 parent가 null이다.
    // onDelete: 'CASCADE' - 댓글을 지우면 그 아래 모든 답글이 DB 레벨에서 함께 삭제된다
    // (재귀 삭제 코드 없이 트리 전체 정리가 자동으로 됨. 대신 post.commentCount를
    // 정확히 맞추려면 CommentsService.deleteComment에서 삭제되는 총 개수를 세야 한다).
    @ManyToOne(() => CommentsModel, (comment) => comment.replies, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @IsOptional()
    parent?: CommentsModel | null;

    @OneToMany(() => CommentsModel, (comment) => comment.parent)
    replies?: CommentsModel[];

    // 바로 아래 자식 답글 개수만 추적한다(트리 전체 개수 아님). likeCount/PostsModel.commentCount와
    // 동일한 패턴 - "답글 N개 보기" UI가 전체 답글을 안 불러오고도 개수를 보여줄 수 있게 한다.
    @Column({
        default: 0,
    })
    @IsNumber()
    replyCount: number;

    // DB 컬럼이 아니다. 요청을 보낸 사용자가 이 댓글을 좋아요했는지를 서비스 레벨에서
    // 채워 넣는 값(CommentsService.attachIsLiked)이라 @Column을 붙이지 않는다.
    isLiked?: boolean;

}