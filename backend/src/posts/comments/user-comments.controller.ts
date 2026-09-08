import { Controller, Get, Param, ParseIntPipe, Query, Request } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { IsPublic } from 'src/common/decorator/is-public.decorator';

// CommentsController(posts/:postId/comments)와 별개의 컨트롤러다. Profile Replies 탭은
// 특정 게시글이 아니라 "사용자" 기준으로 댓글을 조회해야 해서 postId를 URL에 요구하는
// 기존 CommentsController(및 거기 걸린 PostExistsMiddleware)에 억지로 끼워 넣지 않고,
// 별도 컨트롤러로 분리했다.
@Controller('users/:userId/comments')
export class UserCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @IsPublic()
  getUserComments(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: PaginateCommentsDto,
    @Request() req,
  ){
    return this.commentsService.paginateUserComments(query, userId, req.user?.id);
  }
}
