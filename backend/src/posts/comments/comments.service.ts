import { BadRequestException, Injectable } from '@nestjs/common';
import { CommonService } from 'src/common/common.service';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { CommentsModel } from './entity/comments.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, LessThan, MoreThan, QueryRunner, Repository } from 'typeorm';
import { UsersModel } from 'src/users/entity/users.entity';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { DEFAULT_COMMENT_FIND_OPTIONS } from './const/default-comment-find-options.const';
import { UpdateCommentsDto } from './dto/update-comments.dto';
import { CommentLikeModel } from './entity/comment-likes.entity';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(CommentsModel)
        private readonly commentsRepository: Repository<CommentsModel>,
        @InjectRepository(CommentLikeModel)
        private readonly commentLikeRepository: Repository<CommentLikeModel>,
        private readonly commonService: CommonService,
    ){}

    getRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<CommentsModel>(CommentsModel) : this.commentsRepository;
    }

    getCommentLikeRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<CommentLikeModel>(CommentLikeModel) : this.commentLikeRepository;
    }

    // PostsService.attachIsLiked와 동일한 패턴.
    private async attachIsLiked(comments: CommentsModel[], requestUserId?: number){
        if( !requestUserId || comments.length === 0 ){
            comments.forEach((comment) => { comment.isLiked = false; });
            return;
        }

        const likes = await this.commentLikeRepository.find({
            where: {
                user: { id: requestUserId },
                comment: { id: In(comments.map((comment) => comment.id)) },
            },
            relations: {
                comment: true,
            },
        });

        const likedCommentIds = new Set(likes.map((like) => like.comment.id));

        comments.forEach((comment) => {
            comment.isLiked = likedCommentIds.has(comment.id);
        });
    }

    // 최상위(대댓글이 아닌) 댓글만 조회한다. override where가 cursor 조건(where.id)을
    // 통째로 덮어써서 매 페이지 같은 결과만 반복 반환하던 버그(posts의 where__author_id에서
    // 고친 것과 동일 클래스)가 여기도 잠재해 있었다 - 지금까진 댓글이 무한스크롤을 안 써서
    // 안 드러났을 뿐이라, 대댓글 도입 참에 cursor 조건을 함께 병합하도록 고친다.
    async paginateComments(
        dto: PaginateCommentsDto,
        postId: number,
        requestUserId?: number,
    ){
        const where: FindOptionsWhere<CommentsModel> = {
            post: { id: postId },
            parent: IsNull(),
        };

        if( dto.where__id__more_than ){
            where.id = MoreThan(dto.where__id__more_than);
        }else if( dto.where__id__less_than ){
            where.id = LessThan(dto.where__id__less_than);
        }

        const result = await this.commonService.paginate(
            dto,
            this.commentsRepository,
            {
                ...DEFAULT_COMMENT_FIND_OPTIONS,
                where,
            },
            'posts/${postId}/comments',
        );

        await this.attachIsLiked(result.data, requestUserId);

        return result;
    }

    // 특정 댓글의 "바로 아래" 답글만 조회한다(트리 전체가 아님 - 더 깊은 답글은 그
    // 답글 자신을 대상으로 다시 이 메서드를 호출해서 지연 로딩한다). paginateComments와
    // 동일하게 cursor 조건을 override where에 함께 담는다.
    async paginateReplies(
        dto: PaginateCommentsDto,
        commentId: number,
        requestUserId?: number,
    ){
        const where: FindOptionsWhere<CommentsModel> = {
            parent: { id: commentId },
        };

        if( dto.where__id__more_than ){
            where.id = MoreThan(dto.where__id__more_than);
        }else if( dto.where__id__less_than ){
            where.id = LessThan(dto.where__id__less_than);
        }

        const result = await this.commonService.paginate(
            dto,
            this.commentsRepository,
            {
                ...DEFAULT_COMMENT_FIND_OPTIONS,
                where,
            },
            `posts/comments/${commentId}/replies`,
        );

        await this.attachIsLiked(result.data, requestUserId);

        return result;
    }

    // Profile Replies 탭용: 특정 게시글이 아니라 "특정 작성자"가 쓴 댓글 전체를 조회한다.
    // paginateComments(postId 필터)와 달리 어느 게시글에 달린 댓글인지 프론트에서 보여줘야
    // 하므로 post relation도 함께 가져온다. PostsService.paginatePosts와 동일한 이유로,
    // override where에는 author 필터와 cursor id 조건(where__id__more_than/less_than)을
    // 함께 담아야 페이지를 넘길 때 매번 같은 첫 페이지만 반복 반환되는 버그를 피할 수 있다.
    async paginateUserComments(
        dto: PaginateCommentsDto,
        userId: number,
        requestUserId?: number,
    ){
        const where: FindOptionsWhere<CommentsModel> = {
            author: { id: userId },
        };

        if( dto.where__id__more_than ){
            where.id = MoreThan(dto.where__id__more_than);
        }else if( dto.where__id__less_than ){
            where.id = LessThan(dto.where__id__less_than);
        }

        const result = await this.commonService.paginate<CommentsModel>(
            dto,
            this.commentsRepository,
            {
                relations: {
                    author: true,
                    post: true,
                },
                select: {
                    author: { id: true, nickname: true },
                    post: { id: true, content: true },
                },
                where,
            },
            `users/${userId}/comments`,
        );

        await this.attachIsLiked(result.data, requestUserId);

        return result;
    }

    async getCommentById(id: number, requestUserId?: number){
        const comment = await this.commentsRepository.findOne({
            ...DEFAULT_COMMENT_FIND_OPTIONS,
            where: {
                id,
            },
        })

        if( !comment ){
            throw new BadRequestException( `id: ${id} Comment는 존재하지 않습니다.` );
        }

        await this.attachIsLiked([comment], requestUserId);

        return comment;
    }

    async incrementLikeCount(commentId: number, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        await repository.increment({
            id: commentId,
        }, 'likeCount', 1);
    }

    async decrementLikeCount(commentId: number, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        await repository.decrement({
            id: commentId,
        }, 'likeCount', 1);
    }

    async incrementReplyCount(commentId: number, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        await repository.increment({
            id: commentId,
        }, 'replyCount', 1);
    }

    async decrementReplyCount(commentId: number, qr?: QueryRunner, amount = 1){
        const repository = this.getRepository(qr);

        await repository.decrement({
            id: commentId,
        }, 'replyCount', amount);
    }

    async likeComment(userId: number, commentId: number, qr?: QueryRunner){
        const repository = this.getCommentLikeRepository(qr);

        // commentId가 존재하지 않으면 save()가 FK 제약 위반으로 500을 던지므로,
        // 미리 확인해서 400으로 응답한다(getCommentById와 동일하게 BadRequestException 사용).
        const commentExists = await this.commentsRepository.exists({
            where: { id: commentId },
        });

        if( !commentExists ){
            throw new BadRequestException(`id: ${commentId} Comment는 존재하지 않습니다.`);
        }

        const existing = await repository.findOne({
            where: {
                user: { id: userId },
                comment: { id: commentId },
            },
        });

        if( existing ){
            throw new BadRequestException('이미 좋아요한 댓글입니다.');
        }

        await repository.save({
            user: { id: userId },
            comment: { id: commentId },
        });
    }

    async unlikeComment(userId: number, commentId: number, qr?: QueryRunner){
        const repository = this.getCommentLikeRepository(qr);

        const existing = await repository.findOne({
            where: {
                user: { id: userId },
                comment: { id: commentId },
            },
        });

        if( !existing ){
            throw new BadRequestException('좋아요하지 않은 댓글입니다.');
        }

        await repository.delete({
            user: { id: userId },
            comment: { id: commentId },
        });
    }

    async createComment(
        dto: CreateCommentsDto,
        postId: number,
        author: UsersModel,
        qr?: QueryRunner,
    ){
        const repository = this.getRepository(qr);
        const { comment, parentId } = dto;

        if( parentId ){
            // 부모 댓글이 실제로 존재하고 같은 게시글에 속하는지 확인한다(다른 게시글의
            // 댓글에 잘못 붙는 것을 방지). isCommentMine과 동일하게 relations를 함께 넘긴다.
            const parentExists = await this.getRepository(qr).exists({
                where: { id: parentId, post: { id: postId } },
                relations: { post: true },
            });

            if( !parentExists ){
                throw new BadRequestException(`id: ${parentId} Comment는 이 게시글에 존재하지 않습니다.`);
            }
        }

        const newComment = await repository.save({
            comment,
            post: {
                id: postId,
            },
            author,
            parent: parentId ? { id: parentId } : null,
        });

        return newComment;
    }

    async updateComment(
        dto: UpdateCommentsDto,
        commentId: number, 
    ){
        
        const comment = await this.commentsRepository.findOne({
            where:{
                id: commentId,
            }
        })

        if(!comment){
            throw new BadRequestException(`id: ${commentId} Comment는 존재하지 않습니다.`);
        }
        
        const prevComment = await this.commentsRepository.preload({
            id: commentId, 
            ...dto, 
        })

        if( !prevComment ){
            throw new BadRequestException(`id: ${commentId} Comment는 존재하지 않습니다.`);
        } 

        const newComment = await this.commentsRepository.save(
            prevComment, 
        );

        return newComment;
        
    }

    async deleteComment(
        commentId: number,
        qr?: QueryRunner,
    ){
        const repository = this.getRepository(qr);

        const comment = await repository.findOne({
            where:{
                id: commentId,
            },
            relations: {
                parent: true,
            },
        })

        if(!comment){
            throw new BadRequestException(`id: ${commentId} Comment는 존재하지 않습니다.`);
        }

        // 이 댓글 아래에 달린 모든 후손 답글 id를 레벨별로 모은다(재귀 SQL 없이 BFS).
        // DB의 onDelete: CASCADE가 실제 삭제는 알아서 정리해주지만, post.commentCount를
        // 정확히 맞추려면 "몇 개가 함께 삭제되는지" 애플리케이션에서 미리 알아야 한다.
        let removedCount = 1;
        let frontier = [commentId];

        while( frontier.length > 0 ){
            const children = await repository.find({
                where: { parent: { id: In(frontier) } },
                select: { id: true },
            });

            if( children.length === 0 ){
                break;
            }

            removedCount += children.length;
            frontier = children.map((child) => child.id);
        }

        await repository.delete(commentId);

        return {
            removedCount,
            parentId: comment.parent?.id ?? null,
        };
    }

    async isCommentMine(userId: number, commentId: number){
        return this.commentsRepository.exists({
            where:{
                id: commentId,
                author:{
                    id: userId,
                }
            }, 
            relations:{
                author: true, 
            }
        });
    }
}
