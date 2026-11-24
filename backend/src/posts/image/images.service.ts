import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { basename, join } from "path";
import { POST_IMAGE_PATH, TEMP_FILE_NAME_REGEX, TEMP_FOLDER_PATH } from "src/common/const/path.const";
import { ImageModel, ImageModelType } from "src/common/entity/image.entity";
import { QueryRunner, Repository } from "typeorm";
import { CreatePostImageDto } from "./dto/create-image.dto";
import { promises } from "fs";
import { PostsModel } from "../entity/posts.entity";



@Injectable()
export class PostsImagesService{
    constructor(
        @InjectRepository(ImageModel)
        private readonly imageRepository: Repository<ImageModel>,
    ){

    }


    getRepository(qr?: QueryRunner){
        return qr ? qr.manager.getRepository<ImageModel>(ImageModel) : this.imageRepository;
    }

    async createPostImage( dto: CreatePostImageDto, qr?: QueryRunner ){

        if( !dto.path ){
            throw new BadRequestException( "이미지가 없습니다." );
        }

        // 경로 탐색 방지: temp에 업로드된 uuid 파일명만 허용
        if( !TEMP_FILE_NAME_REGEX.test(dto.path) ){
            throw new BadRequestException( "잘못된 파일명입니다." );
        }

        const repository = this.getRepository(qr);

        // dto의 이미지 이름을 기반으로 파일의 경로 생성
        const tempFilePath = join(
            TEMP_FOLDER_PATH,
            dto.path,
        );

        try{
            //파일이 존재하는지 확인 -> 존재하지 않으면 에러
            await promises.access(tempFilePath);
        }catch(e){
            throw new BadRequestException( "존재하지 않는 파일입니다." );
        }

        //파일의 이름만 가져오기
        const fileName = basename( tempFilePath );

        // 새로 이동할 포스트 폴더의 경로 + 이미지 파일명
        const newPath = join(
            POST_IMAGE_PATH,
            fileName,
        );

        // 트랜잭션 save
        const result = await repository.save({
            ...dto,
        });

        // 파일 옮기기
        await promises.rename( tempFilePath, newPath );

        return result;
    }

    async getPostImages( postId: number, qr?: QueryRunner ){
        const repository = this.getRepository(qr);

        return repository.find({
            where: {
                post: {
                    id: postId,
                },
            },
            order: {
                order: 'ASC',
            },
        });
    }

    /**
     * PATCH /posts/:id 의 images 계약:
     * desiredPaths는 "이 게시글이 최종적으로 가져야 할 이미지 목록"이다.
     * 각 원소는 다음 둘 중 하나다.
     *  1) 이미 이 게시글에 붙어있는 이미지의 path(유지) -> 파일은 건드리지 않고 order만 맞춘다.
     *  2) temp 폴더에 새로 업로드된 파일명(추가) -> 기존 createPostImage로 이동+생성한다.
     * desiredPaths에 없는 기존 이미지는 제거(파일 삭제 + row 삭제)한다.
     *
     * deletePostImages + 전체 재생성 방식은 "기존 이미지를 유지"하는 요청을 표현할 방법이
     * 없어서(파일이 이미 posts 폴더로 이동해 temp에는 없으므로 재생성 시 항상 실패),
     * 유지/삭제/추가를 구분하는 이 방식으로 교체했다.
     */
    async syncPostImages( post: PostsModel, desiredPaths: string[], qr?: QueryRunner ){
        const repository = this.getRepository(qr);
        const existingImages = await this.getPostImages(post.id, qr);
        const existingByPath = new Map(existingImages.map((image) => [image.path, image]));

        const toRemove = existingImages.filter((image) => !desiredPaths.includes(image.path));

        for( const image of toRemove ){
            const filePath = join(POST_IMAGE_PATH, image.path);

            try{
                await promises.unlink(filePath);
            }catch{
                // 파일이 이미 존재하지 않는 경우 무시
            }

            await repository.remove(image);
        }

        for( let i = 0; i < desiredPaths.length; i++ ){
            const path = desiredPaths[i];
            const existing = existingByPath.get(path);

            if( existing ){
                // 유지되는 기존 이미지 -> 파일은 그대로, 순서만 필요하면 갱신
                if( existing.order !== i ){
                    await repository.save({
                        ...existing,
                        order: i,
                    });
                }

                continue;
            }

            // 기존 이미지가 아니면 temp에 새로 올라온 파일이어야 한다.
            await this.createPostImage({
                post,
                order: i,
                path,
                type: ImageModelType.POST_IMAGE,
            }, qr);
        }
    }

    async deletePostImages( postId: number, qr?: QueryRunner ){
        const repository = this.getRepository(qr);

        const images = await repository.find({
            where: {
                post: {
                    id: postId,
                },
            },
        });

        for( const image of images ){
            const filePath = join( POST_IMAGE_PATH, image.path );

            try{
                await promises.unlink(filePath);
            }catch{
                // 파일이 이미 존재하지 않는 경우 무시
            }
        }

        await repository.remove(images);
    }
}
