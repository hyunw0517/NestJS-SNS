import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { User } from 'src/users/decorator/user.decorator';
import { UsersModel } from 'src/users/entity/users.entity';
import { UpdateCommentsDto } from './dto/update-comments.dto';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { IsCommentMineOrAdminGuard } from './guard/is-comment-mine-or-admin.guard';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import type { QueryRunner as QR } from 'typeorm';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import { PostsService } from '../posts.service';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService, 
    private readonly postService: PostsService,
  ) {
    /**
     * 1) Entity 생성
     * author -> 작성자
     * post -> 귀속되는 포스트
     * comment -> 실제 댓글 내용
     * likeCount -> 좋아요 갯수
     * 
     * id -> PK
     * createdAt -> 생성일자
     * updatedAt -> 수정일자
     * 
     * 2) GET() pagination
     * 3) GET(':commentId') 특정 comment만 하나 가져오는 기능
     * 4) POST() 코멘트 생성하는 기능
     * 5) PATCH(':commentId') 특정 comment 업데이트 하는 기능
     * 6) DELETE('commentId') 특정 comment 삭제하는 기능
     */
  }

  @Get()
  @IsPublic()
  getComments(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: PaginateCommentsDto,
    @Request() req,
  ){
    return this.commentsService.paginateComments(
      query,
      postId,
      req.user?.id,
    )
  }

  @Get(':commentId')
  @IsPublic()
  getComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req,
  ){
    return this.commentsService.getCommentById(commentId, req.user?.id);
  }

  @Post()
  @UseInterceptors(TransactionInterceptor)
  async postComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() body: CreateCommentsDto,
    @User() user: UsersModel,
    @QueryRunner() qr: QR,
  ){
    const res = await this.commentsService.createComment(
      body,
      postId,
      user,
      qr,
    );

    // 대댓글 포함 모든 댓글이 post.commentCount에 반영된다("총 댓글 수"는 답글까지
    // 포함하는 게 X와 동일한 의미). parentId가 있을 때만 그 댓글의 replyCount도 증가시킨다.
    await this.postService.incrementCommentCount(postId, qr);

    if( body.parentId ){
      await this.commentsService.incrementReplyCount(body.parentId, qr);
    }

    return res;
  }

  //* 답글(대댓글) 조회 -> 특정 댓글의 바로 아래 자식 댓글만 페이지네이션으로 조회한다.
  // 더 깊은 답글은 프론트에서 같은 엔드포인트를 그 답글의 id로 다시 호출해 지연 로딩한다.
  @Get(':commentId/replies')
  @IsPublic()
  getReplies(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Query() query: PaginateCommentsDto,
    @Request() req,
  ){
    return this.commentsService.paginateReplies(
      query,
      commentId,
      req.user?.id,
    )
  }

  @Patch(':commentId')
  @UseGuards(IsCommentMineOrAdminGuard)
  async patchComment(
    @Param('commentId', ParseIntPipe) commentId: number, 
    @Body() body: UpdateCommentsDto, 
  ){
    return this.commentsService.updateComment(
      body,
      commentId,
    )
  }

  @Delete(':commentId')
  @UseInterceptors(TransactionInterceptor)
  @UseGuards(IsCommentMineOrAdminGuard)
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Param('postId', ParseIntPipe) postId: number,
    @QueryRunner() qr: QR,
  ){
    // 답글이 달린 댓글을 지우면 DB cascade로 그 아래 답글까지 함께 삭제되므로,
    // removedCount만큼 post.commentCount를 감소시켜야 카운트가 어긋나지 않는다.
    const { removedCount, parentId } = await this.commentsService.deleteComment(commentId, qr);

    await this.postService.decrementCommentCount(postId, qr, removedCount);

    if( parentId ){
      await this.commentsService.decrementReplyCount(parentId, qr);
    }

    return commentId;
  }

  //* 7) POST /posts/:postId/comments/:commentId/like -> 댓글 좋아요
  @Post(':commentId/like')
  @UseInterceptors(TransactionInterceptor)
  async likeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @User('id') userId: number,
    @QueryRunner() qr: QR,
  ){
    await this.commentsService.likeComment(userId, commentId, qr);
    await this.commentsService.incrementLikeCount(commentId, qr);

    return true;
  }

  //* 8) DELETE /posts/:postId/comments/:commentId/like -> 댓글 좋아요 취소
  @Delete(':commentId/like')
  @UseInterceptors(TransactionInterceptor)
  async unlikeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @User('id') userId: number,
    @QueryRunner() qr: QR,
  ){
    await this.commentsService.unlikeComment(userId, commentId, qr);
    await this.commentsService.decrementLikeCount(commentId, qr);

    return true;
  }
}
