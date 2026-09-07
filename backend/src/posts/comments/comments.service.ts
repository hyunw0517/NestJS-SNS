import { BadRequestException, Injectable } from '@nestjs/common';
import { CommonService } from 'src/common/common.service';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { CommentsModel } from './entity/comments.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { UsersModel } from 'src/users/entity/users.entity';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { DEFAULT_COMMENT_FIND_OPTIONS } from './const/default-comment-find-options.const';
import { UpdateCommentsDto } from './dto/update-comments.dto';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(CommentsModel)
        private readonly commentsRepository: Repository<CommentsModel>,
        private readonly commonService: CommonService, 
    ){}

    getRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<CommentsModel>(CommentsModel) : this.commentsRepository;
    }

    paginateComments(
        dto: PaginateCommentsDto, 
        postId: number, 
    ){
        return this.commonService.paginate(
            dto,
            this.commentsRepository, 
            { 
                ...DEFAULT_COMMENT_FIND_OPTIONS, 
                where: {
                    post: {
                        id: postId, 
                    }, 
                },
            }, 
            'posts/${postId}/comments', 
        );
    }

    async getCommentById(id: number){
        const comment = await this.commentsRepository.findOne({
            ...DEFAULT_COMMENT_FIND_OPTIONS, 
            where: {
                id,
            }, 
        })

        if( !comment ){
            throw new BadRequestException( `id: ${id} Comment는 존재하지 않습니다.` );
        }

        return comment;
    }

    async createComment(
        dto: CreateCommentsDto, 
        postId: number, 
        author: UsersModel, 
        qr?: QueryRunner,
    ){
        const repository = this.getRepository(qr);

        const newComment = await repository.save({
            ...dto,
            post:{
                id: postId,
            },
            author, 
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
            }
        })

        if(!comment){
            throw new BadRequestException(`id: ${commentId} Comment는 존재하지 않습니다.`);
        }

        await repository.delete(commentId);

        return commentId; 
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
