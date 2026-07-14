import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { PostsService } from './posts.service';

// 게시글 작성용 인터페이스
interface PostModel {
  id: number;
  author: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
}

let posts : PostModel[] = [
  {
    id: 1,
    author: 'newyork_official',
    title: '스파이더맨',
    content: '모두의 친구 스파이더맨',
    likeCount: 1000000,
    commentCount: 10000
  },
  {
    id: 2,
    author: 'stark_official',
    title: '아이언맨',
    content: '사람을 구하는 아이언맨',
    likeCount: 1000000,
    commentCount: 10000
  },
  {
    id: 3,
    author: 'usa_official',
    title: '캡틴아메리카',
    content: '미국을 상징하는 캡틴아메리카',
    likeCount: 1000000,
    commentCount: 10000
  }
];

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  //* 1) GET /posts        -> 리스트 조회
  @Get()
  getPosts(){
    return posts;
  }

  //* 2) GET /posts/:id    -> id에 해당하는 post 조회
  @Get(':id')
  getPost(@Param('id') id: string){ //별도 작업을 안하는 이상 파라미터는 string이 기본값. 
    const post = posts.find((post) => post.id === +id); // +id -> Number(id) 대체 가능

    //오류 처리 : 데이터를 찾지 못할 경우 404 에러
    if( !post ){
      throw new NotFoundException();
    }

    return post;
  }

  //* 3) POST /posts       -> post 생성
  @Post()
  postPosts(
    @Body('author') author: string,
    @Body('title') title: string,
    @Body('content') content: string
  ){
    const post = {
      id: posts[posts.length - 1].id + 1,
      author, //타입 명 동일하면 생략가능
      title, 
      content, 
      likeCount: 0,
      commentCount: 0
    };

    // 기존 posts 배열에 신규 post 추가
    posts = [
      ...posts,
      post
    ];
    
    return post;
  }

  //* 4) PUT /posts/:id    -> id에 해당하는 post 변경
  @Put(':id')
  putPost( 
    @Param('id') id: string, 
    @Body('author') author?: string,
    @Body('title') title?: string,
    @Body('content') content?: string
  ){
    const post = posts.find((post) => post.id === +id);

    if(!post){
      throw NotFoundException;
    }

    if(author){
      post.author = author;
    }
    if(title){
      post.title = title;
    }
    if(content){
      post.content = content;
    }

    posts = posts.map(prevPost => prevPost.id === +id ? post : prevPost);

    return post;
  }

  //* 5) DELETE /posts/:id -> id에 해당하는 post 삭제
  @Delete(':id')
  deletePost(
    @Param('id') id: string
  ){
    const post = posts.find((post) => post.id === +id);

    if(!post){
      throw NotFoundException;
    }
    
    posts = posts.filter(post => post.id !== +id);

    return id;
  }

}
