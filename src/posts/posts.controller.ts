import { Body, ClassSerializerInterceptor, Controller, DefaultValuePipe, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Put, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { PostsService } from './posts.service';
import { AccessTokenGuard } from 'src/auth/guard/bearer-token.guard';
import { UsersModel } from 'src/users/entities/users.entity';
import { User } from 'src/users/decorator/user.decorator';
import { CreatePostDto } from './dto/create-post-dto';
import { UpdatePostDto } from './dto/update-post-dto';

@Controller('posts')
export class PostsController {

  //* PostsService 의존성 주입 -> IOC(Inversion of Control) 컨테이너가 자동 생성해서 주입함.
  constructor(private readonly postsService: PostsService) { }

  //* 1) GET /posts        -> 리스트 조회
  @Get()
  getPosts(){
    return this.postsService.getAllPosts();
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
  @Post()
  @UseGuards(AccessTokenGuard)
  postPosts(
    //@Body('authorId') authorId: number,
    @User('id') userId: number, // AccessTokenGuard 사용 시, user.decorator.ts
    //@Body('title') title: string, 
    //@Body('content') content: string, 
    @Body() body: CreatePostDto, // DTO 사용
  ){
    return this.postsService.createPost(
      //userId, title, content
      userId, body, 
    );
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
