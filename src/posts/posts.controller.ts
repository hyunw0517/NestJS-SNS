import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { PostsService } from './posts.service';

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
  getPost(@Param('id') id: string){ //별도 작업을 안하는 이상 파라미터는 string이 기본값. 
    return this.postsService.getPostById(+id);
  }

  //* 3) POST /posts       -> post 생성
  @Post()
  postPosts(
    @Body('author') author: string,
    @Body('title') title: string,
    @Body('content') content: string
  ){
    return this.postsService.createPost(author, title, content);
  }

  //* 4) PUT /posts/:id    -> id에 해당하는 post 변경
  @Put(':id')
  putPost( 
    @Param('id') id: string, 
    @Body('author') author?: string,
    @Body('title') title?: string,
    @Body('content') content?: string
  ){
    return this.postsService.updatePost(+id, author, title, content);
  }

  //* 5) DELETE /posts/:id -> id에 해당하는 post 삭제
  @Delete(':id')
  deletePost(
    @Param('id') id: string
  ){
    return this.postsService.deletePost(+id);
  }

}
