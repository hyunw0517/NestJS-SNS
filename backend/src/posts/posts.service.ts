import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { And, FindOperator, FindOptionsWhere, In, LessThan, MoreThan, QueryRunner, Repository } from 'typeorm';
import { PostsModel } from './entity/posts.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { CommonService } from 'src/common/common.service';
import { ImageModel, ImageModelType } from 'src/common/entity/image.entity';
import { DEFAULT_POST_FIND_OPTIONS } from './const/default-post-find-options.const';
import { PostLikeModel } from './entity/post-likes.entity';

// images relation을 DB order 없이 불러온 뒤(이유는 아래 paginatePosts 주석 참고),
// 저장해둔 order 필드 기준으로 여기서 정렬한다.
function sortPostImages(post: PostsModel){
    post.images?.sort((a, b) => a.order - b.order);
}

@Injectable()
export class PostsService {
    constructor(
        //typeORM repository 주입
        @InjectRepository(PostsModel)
        private readonly postsRepository: Repository<PostsModel>, 
        @InjectRepository(ImageModel)
        private readonly imageRopository: Repository<ImageModel>,
        @InjectRepository(PostLikeModel)
        private readonly postLikeRepository: Repository<PostLikeModel>,
        private readonly commonService: CommonService,
    ){}

    getPostLikeRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<PostLikeModel>(PostLikeModel) : this.postLikeRepository;
    }

    // requestUserId가 있으면(로그인 상태) 그 사용자가 좋아요한 게시글들에 isLiked: true를 채운다.
    // 비로그인이면 전부 false. posts가 비어있으면 조회 자체를 생략한다.
    private async attachIsLiked(posts: PostsModel[], requestUserId?: number){
        if( !requestUserId || posts.length === 0 ){
            posts.forEach((post) => { post.isLiked = false; });
            return;
        }

        const likes = await this.postLikeRepository.find({
            where: {
                user: { id: requestUserId },
                post: { id: In(posts.map((post) => post.id)) },
            },
            relations: {
                post: true,
            },
        });

        const likedPostIds = new Set(likes.map((like) => like.post.id));

        posts.forEach((post) => {
            post.isLiked = likedPostIds.has(post.id);
        });
    }

    //* GET
    async getAllPosts(){
        const posts = await this.postsRepository.find({
            ...DEFAULT_POST_FIND_OPTIONS,
        });
        //find(조건부) -> 특정 조건에 맞는 모든 리스트 조회

        posts.forEach(sortPostImages);

        return posts;
    }

    async generatePosts(userId: number){
        for( let i = 0; i < 100; i++ ){
            await this.createPost(userId, {
               title: `임의로 생성된 포스트 제목 ${i}`, 
               content: `임의로 생성된 포스트 내용 ${i}`, 
               images: [], 
            });
        }
    }

    // Profile Media 탭용. images relation은 1:N이라 where로 "이미지가 1장 이상 있는
    // 게시글"을 직접 표현할 수 없고(JOIN 기반 필터는 take/skip과 함께 쓰면 게시글이
    // 아니라 JOIN된 행 기준으로 페이지가 잘리는 문제가 있어 DEFAULT_POST_FIND_OPTIONS에서
    // 이미 relationLoadStrategy: 'query'로 피해간 바로 그 문제다), 그래서 이미지가 있는
    // post id 집합을 별도 쿼리로 먼저 구한 뒤 where.id에 In()으로 합친다.
    private async getPostIdsWithImages(authorId?: number): Promise<number[]> {
        const images = await this.imageRopository.find({
            where: {
                type: ImageModelType.POST_IMAGE,
                ...(authorId ? { post: { author: { id: authorId } } } : {}),
            },
            relations: { post: true },
            select: { id: true, post: { id: true } },
        });

        return [...new Set(images.map((image) => image.post!.id))];
    }

    //* GET (Pagination)
    // 1) 오름차순으로 정렬하는 pagination만 구현
    async paginatePosts( dto: PaginatePostDto, requestUserId?: number ){
        // where__author_id/where__has_images를 override where로 넘기면, CommonService의
        // cursorPaginate/pagePaginate가 `{...findOptions, ...overrideFindOptions}`로 얕은
        // 병합을 하기 때문에 findOptions.where에 있던 cursor 조건(where__id__more_than/
        // less_than으로 만들어진 where.id)이 통째로 덮어써져 사라진다. 그 결과 매 페이지
        // 요청이 항상 동일한 첫 페이지만 반환해서 Profile에서 같은 게시글이 무한 반복되는
        // 버그가 있었다. cursor pagination 로직(CommonService) 자체는 건드리지 않고,
        // override where 안에 author/이미지 필터와 동일한 cursor 조건을 함께 담아
        // 병합되도록 한다(cursor id 조건과 이미지 id 목록이 둘 다 있으면 And()로 결합).
        const authorFilteredWhere: FindOptionsWhere<PostsModel> = {};

        if( dto.where__author_id ){
            authorFilteredWhere.author = { id: dto.where__author_id };
        }

        let cursorIdCondition: FindOperator<number> | undefined;

        if( dto.where__id__more_than ){
            cursorIdCondition = MoreThan(dto.where__id__more_than);
        }else if( dto.where__id__less_than ){
            cursorIdCondition = LessThan(dto.where__id__less_than);
        }

        if( dto.where__has_images ){
            const postIdsWithImages = await this.getPostIdsWithImages(dto.where__author_id);
            const imageIdCondition = In(postIdsWithImages);

            authorFilteredWhere.id = cursorIdCondition ? And(cursorIdCondition, imageIdCondition) : imageIdCondition;
        }else if( cursorIdCondition ){
            authorFilteredWhere.id = cursorIdCondition;
        }

        const hasOverrideWhere = dto.where__author_id !== undefined || dto.where__has_images === true;

        const result = await this.commonService.paginate<PostsModel>(
            dto,
            this.postsRepository,
            {
                ...DEFAULT_POST_FIND_OPTIONS,
                // author_id/has_images 필터가 있을 때만 override where를 넘긴다(없으면
                // 기존과 동일하게 CommonService의 generic where__ 파싱 결과를 그대로 사용).
                ...(hasOverrideWhere ? { where: authorFilteredWhere } : {}),
            },
            'posts',
        );

        // images relation에 DB order(ORDER BY)를 걸면 TypeORM이 JOIN 기반 쿼리를 쓰게 되고,
        // take(LIMIT)가 게시글 수가 아니라 JOIN된 행 수에 적용돼 이미지가 여러 장인
        // 게시글이 take를 혼자 다 소모해버려 cursor pagination이 깨지는 문제가 있었다
        // (게시글이 누락되고 cursor.after도 잘못 null이 됨). 그래서 DB 정렬 대신
        // 조회 후 애플리케이션 레벨에서 order 필드로 정렬한다.
        result.data.forEach(sortPostImages);

        await this.attachIsLiked(result.data, requestUserId);

        return result;
    }

    //* GET(:id)
    async getPostById(id: number, qr?: QueryRunner, requestUserId?: number){
        const repository = this.getRepository(qr);

        //await -> 뒤에 if문에서 에러를 잡기 위함 -> post가 promise로 반환되기 때문에
        const post = await repository.findOne({
            ...DEFAULT_POST_FIND_OPTIONS,
            where: {
                id: id,
            },
        });

        if( !post ){
            throw new NotFoundException();
        }

        sortPostImages(post);

        await this.attachIsLiked([post], requestUserId);

        return post;
    }

    getRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<PostsModel>(PostsModel) : this.postsRepository;
    }

    async incrementCommentCount(postId: number, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        await repository.increment({
            id: postId,
        }, 'commentCount', 1);
    }

    // amount: 삭제된 댓글이 대댓글을 거느리고 있어 DB cascade로 여러 건이 한 번에
    // 삭제된 경우, 그 총 개수만큼 한 번에 감소시키기 위한 값(기본 1).
    async decrementCommentCount(postId: number, qr?: QueryRunner, amount = 1){
        const repository = this.getRepository(qr);

        await repository.decrement({
            id: postId,
        }, 'commentCount', amount);
    }

    async incrementLikeCount(postId: number, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        await repository.increment({
            id: postId,
        }, 'likeCount', 1);
    }

    async decrementLikeCount(postId: number, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        await repository.decrement({
            id: postId,
        }, 'likeCount', 1);
    }

    // UsersService.followUser와 동일한 패턴 - 유니크 제약이 있어도, 사용자에게
    // 더 친절한 메시지를 주기 위해 미리 존재 여부를 확인한다.
    async likePost(userId: number, postId: number, qr?: QueryRunner){
        const repository = this.getPostLikeRepository(qr);

        // postId가 존재하지 않으면 save()가 FK 제약 위반으로 500을 던지므로,
        // 미리 확인해서 404로 응답한다.
        const postExists = await this.checkPostExistsById(postId);

        if( !postExists ){
            throw new NotFoundException('존재하지 않는 게시글입니다.');
        }

        const existing = await repository.findOne({
            where: {
                user: { id: userId },
                post: { id: postId },
            },
        });

        if( existing ){
            throw new BadRequestException('이미 좋아요한 게시글입니다.');
        }

        await repository.save({
            user: { id: userId },
            post: { id: postId },
        });
    }

    async unlikePost(userId: number, postId: number, qr?: QueryRunner){
        const repository = this.getPostLikeRepository(qr);

        const existing = await repository.findOne({
            where: {
                user: { id: userId },
                post: { id: postId },
            },
        });

        if( !existing ){
            throw new BadRequestException('좋아요하지 않은 게시글입니다.');
        }

        await repository.delete({
            user: { id: userId },
            post: { id: postId },
        });
    }

    //* POST
    //async createPost(authorId: number, title: string, content: string){
    async createPost(authorId: number, postDto: CreatePostDto, qr?: QueryRunner ){
        // 1) create 메서드 -> 저장할 객체를 생성한다. 
        // 2) save 메서드 -> 객체를 저장한다. (crteate 메서드에서 생성한 객체로 저장)
        const repository = this.getRepository(qr);

        const post = repository.create({
           author:{
            id: authorId,
           }, 
           //title, 
           //content,
           ...postDto, 
           images: [],
           likeCount: 0,
           commentCount: 0,
        });
    
        const newPost = await repository.save(post);
        
        return newPost;
    }

    //* PUT(:id)
    async updatePost(postId: number, postDto: UpdatePostDto, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        const { title, content } = postDto;

        //save의 기능
        //1) 만약 데이터가 존재하지 않는다면 새로 생성한다.
        //2) 만약 데이터가 존재한다면 해당 데이터를 업데이트 한다.

        const post = await repository.findOne({
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

        const newPost = await repository.save(post);

        return newPost;

    }

    //* DELETE(:id)
    async deletePost(postId: number, qr?: QueryRunner){
        const repository = this.getRepository(qr);

        const post = await repository.findOne({
            where: {
                id: postId,
            }
        });

        if(!post){
            throw new NotFoundException();
        }

        await repository.delete(postId);

        return postId;
    }

    async checkPostExistsById(id: number){
        return this.postsRepository.exists({
            where:{
                id, 
            },
        })
    }

    async isPostMine(userId: number, postId: number){
        return this.postsRepository.exists({
            where:{
                id:postId,
                author:{
                    id: userId,
                }
            }, 
            relations:{
                author: true, 
            }
        });
    }

}
