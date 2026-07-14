import { Controller, Get } from '@nestjs/common';
import { PostsService } from './posts.service';

// 게시글 작성용 인터페이스
interface Post {
  author: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
}

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}
  
  @Get()
  getPost(): Post {
    return {
      author: 'newjeans_official',
      title: '뉴진스 민지',
      content: '메이크업 고치는 민지',
      likeCount: 1000000,
      commentCount: 10000,
    };
  }
}
