import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, LessThan, MoreThan, Repository } from 'typeorm';
import { PostsModel } from './entities/posts.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { HOST, PROTOCOL } from 'src/common/const/env.const';
import { CommonService } from 'src/common/common.service';

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
        private readonly postsRepository: Repository<PostsModel>, 
        private readonly commonService: CommonService, 
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

    async generatePosts(userId: number){
        for( let i = 0; i < 100; i++ ){
            await this.createPost(userId, {
               title: `임의로 생성된 포스트 제목 ${i}`, 
               content: `임의로 생성된 포스트 내용 ${i}`, 
            });
        }
    }

    //* GET (Pagination)
    // 1) 오름차순으로 정렬하는 pagination만 구현
    async paginatePosts( dto: PaginatePostDto ){
        // if( dto.page ){
        //     return this.pagePaginatePosts(dto);
        // } else {
        //     return this.cursorPaginatePosts(dto);
        // }

        return this.commonService.paginate<PostsModel>(
            dto, 
            this.postsRepository, 
            {
                relations: { 
                    'author' : true, 
                }, 
            }, 
            'posts', 
        );
    }

    async pagePaginatePosts( dto: PaginatePostDto ){
        /**
         * data: Data[], 
         * total: number, 
         *  
         */
        const [posts, count] = await this.postsRepository.findAndCount({
            skip: dto.take * (dto.page! - 1),
            order: {
                createdAt: dto.order__createdAt,
            },
            take: dto.take,
        });

        return {
            data: posts, 
            total: count, 
        }
    }

    async cursorPaginatePosts( dto: PaginatePostDto ){

        const where : FindOptionsWhere<PostsModel> = {};

        if( dto.where__id__less_than ){
            where.id = LessThan(dto.where__id__less_than ?? 0);
        }else if( dto.where__id__more_than ){
            where.id = MoreThan(dto.where__id__more_than ?? 0);
        }

        const posts = await this.postsRepository.find({
            where: where, 
            order: {
                createdAt: dto.order__createdAt,
            },
            take: dto.take,
        });

        // 해당되는 포스트가 0개 이상이면 마지막 포스트를 가져오고 아니면 null을 반환한다. 
        const lastItem = posts.length > 0 && posts.length === dto.take ? posts[posts.length - 1] : null;
        
        const nextUrl = lastItem && new URL(`${PROTOCOL}://${HOST}/posts`);

        if( nextUrl ){
            /**
             * dto의 키 값들을 루핑하면서
             * 키 값에 해당되는 value가 존재하면
             * param에 그대로 붙여넣는다. 
             * 
             * 단, where__id__more_than 값만 lastItem의 마지막 값으로 넣어준다. 
             */
            for( const key of Object.keys(dto) ){
                if( dto[key] ){
                    if( key !== 'where__id__more_than' && key !== 'where__id__less_than' ){
                        nextUrl.searchParams.append(key, dto[key].toString() );
                    }
                }
            }
            
            let key: any = null;

            if( dto.order__createdAt === 'ASC' ){
                key = 'where__id__more_than';
            }else{
                key = 'where__id__less_than';
            }

            nextUrl.searchParams.append( key, lastItem.id.toString() );
        }

        /**
         * Response
         * 
         * data: Data[], 
         * cursor: {
         *  after: 마지막 Data의 ID
         * },
         * count: 응답한 데이터의 갯수
         * next: 다음 요청 시 사용할 URL 
         */

        return {
            data: posts, 
            cursor: {
                after: lastItem?.id ?? null, 
            }, 
            count: posts.length, 
            next: nextUrl?.toString() ?? null, 
        }
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
