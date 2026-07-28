import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PostsModel } from './entities/posts.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post-dto';
import { UpdatePostDto } from './dto/update-post-dto';

// 게시글 작성용 인터페이스
export interface PostModel {
  id: number;
  author: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
}

/*let posts : PostModel[] = [
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
];*/


@Injectable()
export class PostsService {
    constructor(
        //typeORM repository 주입
        @InjectRepository(PostsModel)
        private readonly postsRepository: Repository<PostsModel>
    ){}

    //* GET
    async getAllPosts(){
        return this.postsRepository.find({
            // posts 조회 시 유저 정보까지 출력
            relations: {
                author: true,
            },
        });
        //find(조건부) -> 특정 조건에 맞는 모든 리스트 조회
    }

    //* GET(:id)
    async getPostById(id: number){
        //await -> 뒤에 if문에서 에러를 잡기 위함 -> post가 promise로 반환되기 때문에
        const post = await this.postsRepository.findOne({
            relations: {
                author: true,
            },
            where: {
                id: id,
            },
        });

        if( !post ){
            throw new NotFoundException();
        }
        return post;
    }

    //* POST
    //async createPost(authorId: number, title: string, content: string){
    async createPost(authorId: number, postDto: CreatePostDto){
        // 1) create 메서드 -> 저장할 객체를 생성한다. 
        // 2) save 메서드 -> 객체를 저장한다. (crteate 메서드에서 생성한 객체로 저장)

        const post = this.postsRepository.create({
           author:{
            id: authorId,
           }, 
           //title, 
           //content,
           ...postDto, 
           likeCount: 0,
           commentCount: 0,
        });
    
        const newPost = await this.postsRepository.save(post);
        
        return newPost;
    }

    //* PUT(:id)
    async updatePost(postId: number, postDto: UpdatePostDto){

        const { title, content } = postDto;

        //save의 기능
        //1) 만약 데이터가 존재하지 않는다면 새로 생성한다. 
        //2) 만약 데이터가 존재한다면 해당 데이터를 업데이트 한다. 

        const post = await this.postsRepository.findOne({
            where: {
                id: postId,
            },
        });

        if(!post){
            throw new NotFoundException();
        }

        if(title){
            post.title = title;
        }

        if(content){
            post.content = content;
        }

        const newPost = await this.postsRepository.save(post);

        return newPost;

    }

    //* DELETE(:id)
    async deletePost(postId: number){
        const post = await this.postsRepository.findOne({
            where: {
                id: postId,
            }
        });

        if(!post){
            throw new NotFoundException();
        }

        await this.postsRepository.delete(postId);
        
        return postId;
    }

}
