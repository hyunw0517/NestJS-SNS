import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { basename, join } from "path";
import { POST_IMAGE_PATH, TEMP_FOLDER_PATH } from "src/common/const/path.const";
import { ImageModel } from "src/common/entity/image.entity";
import { QueryRunner, Repository } from "typeorm";
import { CreatePostImageDto } from "./dto/create-image.dto";
import { promises } from "fs";

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
}