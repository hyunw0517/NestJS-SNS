import { BadRequestException, Body, ClassSerializerInterceptor, Controller, DefaultValuePipe, Delete, Get, InternalServerErrorException, NotFoundException, Param, ParseIntPipe, Patch, Post, Put, Query, Request, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { PostsService } from './posts.service';
import { AccessTokenGuard } from 'src/auth/guard/bearer-token.guard';
import { UsersModel } from 'src/users/entity/users.entity';
import { User } from 'src/users/decorator/user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageModelType } from 'src/common/entity/image.entity';
import { DataSource } from 'typeorm';
import type { QueryRunner as QR } from 'typeorm';
import { PostsImagesService } from './image/images.service';
import { LogInterceptor } from 'src/common/interceptor/log.interceptor';
import { TransactionInterceptor } from 'src/common/interceptor/transaction.interceptor';
import { QueryRunner } from 'src/common/decorator/query-runner.decorator';
import { HttpExceptionFilter } from 'src/common/exception-filter/http.exception-filter';
import { IsPublic } from 'src/common/decorator/is-public.decorator';
import { IsPostMineOrAdminGuard } from './guard/is-post-mine-or-admin.guard';

@Controller('posts')
export class PostsController {

  //* PostsService 의존성 주입 -> IOC(Inversion of Control) 컨테이너가 자동 생성해서 주입함.
  constructor(
    private readonly postsService: PostsService, 
    private readonly postImagesService: PostsImagesService, 
    private readonly dataSource: DataSource, 
  ) { }

  //* 1) GET /posts        -> 리스트 조회
  @Get()
  //@UseInterceptors(LogInterceptor) //Interceptor 적용
  //@UseFilters(HttpExceptionFilter) //HttpExceptionFilter 적용
  @IsPublic()
  getPosts(
    @Query() query: PaginatePostDto,
    @Request() req,
  ){
    // 공개 라우트지만, BearerTokenGuard가 유효한 토큰이 있으면 req.user를 채워주므로
    // 로그인 상태면 isLiked까지 함께 내려준다(비로그인이면 req.user가 없어 전부 false).
    return this.postsService.paginatePosts(query, req.user?.id);
  }

  // POST /posts/random 
  @Post('random')
  async postPostsRandom( @User() user: UsersModel ){
    await this.postsService.generatePosts(user.id);
    
    return true;
  }

  //* 2) GET /posts/:id    -> id에 해당하는 post 조회
  @Get(':id')
  //getPost(@Param('id') id: string){ 
    //별도 작업을 안하는 이상 파라미터는 string이 기본값. 
  @IsPublic()
  getPost(@Param('id', ParseIntPipe) id: number, @Request() req){
    //ParseIntPipe로 값 검증 가능
    return this.postsService.getPostById(id, undefined, req.user?.id);
  }

  //* 3) POST /posts       -> post 생성
  // DTO - Data Transfer Object
  //
  // A Model, B Model
  // Post API -> A 모델을 저장하고, B 모델을 저장한다.
  // await repository.save(a);
  // await repository.save(b);
  //
  // 만약에 A를 저장하다가 실패하면 B를 저장하면 안될경우
  // all or nothing -> 트랜잭션
  //
  // 트랜잭션
  // start -> 시작
  // commit -> 저장
  // rollback -> 원상복구
  @Post()
  @UseInterceptors(TransactionInterceptor)
  async postPosts(
    //@Body('authorId') authorId: number,
    @User('id') userId: number, // AccessTokenGuard 사용 시, user.decorator.ts
    //@Body('title') title: string, 
    //@Body('content') content: string, 
    @Body() body: CreatePostDto, // DTO 사용
    @QueryRunner() qr: QR,
  ){

    //쿼리러너 -> transaction.interceptor.ts로 빼버림
    const post = await this.postsService.createPost(
      userId, body, qr, 
    );

    for(let i = 0; i < body.images.length; i++){
      await this.postImagesService.createPostImage({
        post, 
        order: i,
        path: body.images[i], 
        type: ImageModelType.POST_IMAGE,
      }, qr);
    }

    return this.postsService.getPostById(post.id, qr); 

    // // 쿼리러너 1) 트랜잭션과 관련된 모든 쿼리를 담당할 쿼리 러너 생성
    // const qr = this.dataSource.createQueryRunner();

    // // 쿼리러너 2) 쿼리 러너에 연결
    // await qr.connect();

    // // 쿼리러너 3) 쿼리 러너에서 트랜잭션을 시작한다. -> 이 시점부터 같은 쿼리 러너를 사용하면 트랜잭션 안에서 데이터베이스 액션을 실행할 수 있다. 
    // await qr.startTransaction();

    // // 쿼리러너 4) 로직 실행
    // try{

    //   const post = await this.postsService.createPost(
    //     userId, body, qr, 
    //   );

    //   for(let i = 0; i < body.images.length; i++){
    //     await this.postImagesService.createPostImage({
    //       post, 
    //       order: i,
    //       path: body.images[i], 
    //       type: ImageModelType.POST_IMAGE,
    //     }, qr);
    //   }

    //   await qr.commitTransaction();
    //   await qr.release();

    //   return this.postsService.getPostById(post.id); 
      
    // }catch(e){

    //   // 쿼리러너 5) 어떤 에러든 에러가 던져지면 트랜잭션을 종료하고 원래 상태로 되돌린다. 
    //   await qr.rollbackTransaction();
    //   await qr.release();

    //   throw new InternalServerErrorException("에러가 발생하였습니다.");

    // }

  }

  //* 4) PATCH /posts/:id    -> id에 해당하는 post 변경
  @Patch(':postId')
  @UseGuards(IsPostMineOrAdminGuard)
  @UseInterceptors(TransactionInterceptor)
  async patchPost(
    @Param('postId', ParseIntPipe) id: number,
    @Body() body: UpdatePostDto,
    @QueryRunner() qr: QR,
  ){
    const post = await this.postsService.updatePost(
      id, body, qr,
    );

    // images가 body에 존재하면 "최종적으로 남아야 할 이미지 목록"으로 취급해
    // 기존 이미지 중 유지되는 것은 그대로 두고, 빠진 것만 삭제, 새 temp 파일만 추가한다.
    if(body.images){
      await this.postImagesService.syncPostImages(post, body.images, qr);
    }

    return this.postsService.getPostById(id, qr);
  }

  //* 5) DELETE /posts/:postId -> postId에 해당하는 post 삭제
  @Delete(':postId')
  @UseGuards(IsPostMineOrAdminGuard)
  @UseInterceptors(TransactionInterceptor)
  async deletePost(
    @Param('postId', ParseIntPipe) postId: number,
    @QueryRunner() qr: QR,
  ){
    // post row를 지우면 ImageModel의 onDelete: 'CASCADE'로 DB의 image row는 같이 삭제되지만,
    // 그건 DB 레벨 얘기고 public/posts의 실제 파일은 아무도 안 지워서 그대로 남아있었다.
    // deletePostImages가 파일 unlink까지 하므로, post를 지우기 전에 먼저 호출한다.
    await this.postImagesService.deletePostImages(postId, qr);

    return this.postsService.deletePost(postId, qr);
  }

  //* 6) POST /posts/:postId/like -> 게시글 좋아요
  // 팔로우 시스템(UserFollowsModel)과 동일한 패턴: 좋아요 여부는 소유권과 무관하므로
  // IsPostMineOrAdminGuard가 아니라 기본 AccessTokenGuard(로그인만 요구)를 사용한다.
  @Post(':postId/like')
  @UseInterceptors(TransactionInterceptor)
  async likePost(
    @Param('postId', ParseIntPipe) postId: number,
    @User('id') userId: number,
    @QueryRunner() qr: QR,
  ){
    await this.postsService.likePost(userId, postId, qr);
    await this.postsService.incrementLikeCount(postId, qr);

    return true;
  }

  //* 7) DELETE /posts/:postId/like -> 게시글 좋아요 취소
  @Delete(':postId/like')
  @UseInterceptors(TransactionInterceptor)
  async unlikePost(
    @Param('postId', ParseIntPipe) postId: number,
    @User('id') userId: number,
    @QueryRunner() qr: QR,
  ){
    await this.postsService.unlikePost(userId, postId, qr);
    await this.postsService.decrementLikeCount(postId, qr);

    return true;
  }

  // RBAC -> Role Based Access Control

}
