import { Body, ClassSerializerInterceptor, Controller, DefaultValuePipe, Delete, Get, InternalServerErrorException, NotFoundException, Param, ParseIntPipe, Patch, Post, Put, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { PostsService } from './posts.service';
import { AccessTokenGuard } from 'src/auth/guard/bearer-token.guard';
import { UsersModel } from 'src/users/entities/users.entity';
import { User } from 'src/users/decorator/user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageModelType } from 'src/common/entity/image.entity';
import { DataSource } from 'typeorm';
import { PostsImagesService } from './image/images.service';

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
  getPosts(
    @Query() query: PaginatePostDto,
  ){
    //return this.postsService.getAllPosts();
    return this.postsService.paginatePosts(query);
  }

  // POST /posts/random 
  @Post('random')
  @UseGuards(AccessTokenGuard)
  async postPostsRandom( @User() user: UsersModel ){
    await this.postsService.generatePosts(user.id);
    
    return true;
  }

  //* 2) GET /posts/:id    -> id에 해당하는 post 조회
  @Get(':id')
  //getPost(@Param('id') id: string){ 
    //별도 작업을 안하는 이상 파라미터는 string이 기본값. 
  getPost(@Param('id', ParseIntPipe) id: number){ 
    //ParseIntPipe로 값 검증 가능
    return this.postsService.getPostById(id);
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
  @UseGuards(AccessTokenGuard)
  async postPosts(
    //@Body('authorId') authorId: number,
    @User('id') userId: number, // AccessTokenGuard 사용 시, user.decorator.ts
    //@Body('title') title: string, 
    //@Body('content') content: string, 
    @Body() body: CreatePostDto, // DTO 사용
  ){

    // 쿼리러너 1) 트랜잭션과 관련된 모든 쿼리를 담당할 쿼리 러너 생성
    const qr = this.dataSource.createQueryRunner();

    // 쿼리러너 2) 쿼리 러너에 연결
    await qr.connect();

    // 쿼리러너 3) 쿼리 러너에서 트랜잭션을 시작한다. -> 이 시점부터 같은 쿼리 러너를 사용하면 트랜잭션 안에서 데이터베이스 액션을 실행할 수 있다. 
    await qr.startTransaction();

    // 쿼리러너 4) 로직 실행
    try{

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

      await qr.commitTransaction();
      await qr.release();

      return this.postsService.getPostById(post.id); 
      
    }catch(e){

      // 쿼리러너 5) 어떤 에러든 에러가 던져지면 트랜잭션을 종료하고 원래 상태로 되돌린다. 
      await qr.rollbackTransaction();
      await qr.release();

      throw new InternalServerErrorException("에러가 발생하였습니다.");

    }

  }

  //* 4) PATCH /posts/:id    -> id에 해당하는 post 변경
  @Patch(':id')
  patchPost( 
    @Param('id', ParseIntPipe) id: number, 
    // @Body('title') title?: string,
    // @Body('content') content?: string, 
    @Body() body: UpdatePostDto, 
  ){
    return this.postsService.updatePost(
      id, body, 
    );
  }

  //* 5) DELETE /posts/:id -> id에 해당하는 post 삭제
  @Delete(':id')
  deletePost(
    @Param('id', ParseIntPipe) id: number
  ){
    return this.postsService.deletePost(id);
  }

}
